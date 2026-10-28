"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "./useSocket";
import { useToast } from "./use-toast";
import { IQuery } from "@/util/type";
import { isLeadBookingTermAllowed } from "@/util/employeeRentalTypeAccess";
import {
  isLeadAllowedByPricingRules,
  type PricingRules,
} from "@/util/leadBudgetBand";
import { useAuthStore } from "@/AuthStore";

type LeadDisposition = "fresh" | "active" | "rejected" | "declined" | "closed";

const DEFAULT_PAGE_SIZE = 50;

interface UseLeadSocketOptions {
  disposition: LeadDisposition;
  allotedArea: string | string[];
  setQueries: React.Dispatch<React.SetStateAction<IQuery[]>>;
  page?: number;
  setTotalQueries?: React.Dispatch<React.SetStateAction<number>>;
  setTotalPages?: React.Dispatch<React.SetStateAction<number>>;
  pageSize?: number;
  enabled?: boolean;
}

const formatArea = (area: string) =>
  area?.trim().toLowerCase().replace(/\s+/g, "-") || "all";

/**
 * Hook for handling real-time lead socket events.
 *
 * Architecture: The socket server (socket.ts) broadcasts lead events to rooms.
 * This hook joins rooms and listens for events matching the disposition.
 * Lead creation/disposition-change emits are handled client-side via
 * useLeadSocketEmit, which sends events through the client's own socket
 * connection (bypassing the broken global.io in API routes).
 */
export const useLeadSocket = ({
  disposition,
  allotedArea,
  setQueries,
  page,
  setTotalQueries,
  setTotalPages,
  pageSize = DEFAULT_PAGE_SIZE,
  enabled = true,
}: UseLeadSocketOptions) => {
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);

  const setQueriesRef = useRef(setQueries);
  const toastRef = useRef(toast);
  const pageRef = useRef(page ?? 1);
  const setTotalQueriesRef = useRef(setTotalQueries);
  const pageSizeRef = useRef(pageSize);
  const allotedAreaRef = useRef(allotedArea);
  const rentalTypeRef = useRef<string | null>(null);
  const roleRef = useRef<string | null>(null);
  const joinedRoomsRef = useRef<{ area: string; disposition: string }[]>([]);
  const processedLeadsRef = useRef<Set<string>>(new Set());
  const pricingRulesRef = useRef<PricingRules | null>(null);
  const pricingReadyRef = useRef(false);
  const queuedLeadsRef = useRef<IQuery[]>([]);
  const flushQueuedRef = useRef<() => void>(() => {});

  useEffect(() => {
    setQueriesRef.current = setQueries;
    toastRef.current = toast;
    pageRef.current = page ?? 1;
    setTotalQueriesRef.current = setTotalQueries;
    pageSizeRef.current = pageSize;
    allotedAreaRef.current = allotedArea;
  }, [setQueries, toast, page, setTotalQueries, setTotalPages, pageSize, allotedArea]);

  useEffect(() => {
    rentalTypeRef.current = token?.rentalType ?? null;
    roleRef.current = token?.role ?? "";
  }, [token?.rentalType, token?.role]);

  useEffect(() => {
    let cancelled = false;
    pricingReadyRef.current = false;
    pricingRulesRef.current = null;

    const loadRules = async () => {
      try {
        const response = await fetch("/api/employee/pricing-rule");
        if (!response.ok) {
          throw new Error(`pricing-rule ${response.status}`);
        }
        const body = (await response.json()) as { pricingRules?: PricingRules | null };
        if (cancelled) return;
        pricingRulesRef.current = body.pricingRules ?? null;
      } catch {
        if (cancelled) return;
        pricingRulesRef.current = null;
      } finally {
        if (cancelled) return;
        pricingReadyRef.current = true;
        flushQueuedRef.current();
      }
    };

    void loadRules();
    return () => {
      cancelled = true;
    };
  }, [token?.id]);

  const areaKey = Array.isArray(allotedArea)
    ? allotedArea.sort().join(",")
    : allotedArea || "";

  useEffect(() => {
    if (!enabled || !socket || !isConnected) return;

    const formattedDisposition = formatArea(disposition);
    const addEventName = `lead-${formattedDisposition}`;
    const removeEventName = `lead-removed-${formattedDisposition}`;

    const handleNewLead = (data: IQuery) => {
      try {
        const leadId = data._id?.toString();
        if (!leadId) return;

        if (processedLeadsRef.current.has(leadId)) return;
        processedLeadsRef.current.add(leadId);

        const bookingAllowed = isLeadBookingTermAllowed(
          rentalTypeRef.current,
          roleRef.current ?? "",
          data.bookingTerm,
        );

        const currentAllotedArea = allotedAreaRef.current;
        const rawAreas = Array.isArray(currentAllotedArea)
          ? currentAllotedArea.filter((a) => a && a.trim())
          : currentAllotedArea
          ? [currentAllotedArea]
          : [];

        const formattedAreas = rawAreas.map(formatArea).filter(Boolean);
        const isGlobalMode = formattedAreas.length === 0;
        const dataArea = formatArea(data.location || "");
        const areaMatch = formattedAreas.includes(dataArea);
        const locationAllowed = isGlobalMode || areaMatch;

        if (!bookingAllowed || !locationAllowed) {
          return;
        }

        if (!pricingReadyRef.current) {
          processedLeadsRef.current.delete(leadId);
          if (!queuedLeadsRef.current.some((lead) => lead._id?.toString() === leadId)) {
            queuedLeadsRef.current.push(data);
          }
          return;
        }

        const pricingAllowed = isLeadAllowedByPricingRules({
          pricingRules: pricingRulesRef.current,
          location: data.location || "",
          maxBudget: data.maxBudget,
        });

        if (!pricingAllowed) {
          return;
        }

        if (locationAllowed) {
          const ps = pageSizeRef.current;
          const currentPage = pageRef.current;

          setQueriesRef.current((prev) => {
            if (prev.some((q) => q._id?.toString() === leadId)) return prev;

            const updated = [data, ...prev];
            if (currentPage === 1) {
              return updated.slice(0, ps);
            }
            return updated;
          });

          if (setTotalQueriesRef.current) {
            setTotalQueriesRef.current((prev) => prev + 1);
          }

          toastRef.current({
            title: `New ${disposition.charAt(0).toUpperCase() + disposition.slice(1)} Lead`,
            description: `Lead from ${data.name || "Unknown"}${
              isGlobalMode ? "" : ` in ${data.location}`
            }`,
          });
        }
      } catch (err) {
        console.error(`[LeadSocket] Error in handleNewLead for ${disposition}:`, err);
      }
    };

    const handleLeadRemoved = (data: { _id: string; newDisposition: string }) => {
      try {
        setQueriesRef.current((prev) => prev.filter((q) => q._id !== data._id));
        if (setTotalQueriesRef.current) {
          setTotalQueriesRef.current((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error("[LeadSocket] handleLeadRemoved error:", err);
      }
    };

    // Normalize allotedArea for room joining
    const rawAreas = Array.isArray(allotedArea)
      ? allotedArea.filter((a) => a && a.trim())
      : allotedArea
      ? [allotedArea]
      : [];

    const formattedAreas = rawAreas.map(formatArea).filter(Boolean);
    const isGlobalMode = formattedAreas.length === 0;

    flushQueuedRef.current = () => {
      const queued = queuedLeadsRef.current.splice(0);
      queued.forEach((lead) => handleNewLead(lead));
    };
    if (pricingReadyRef.current) {
      flushQueuedRef.current();
    }

    // Register event listeners
    socket.on(addEventName, handleNewLead);
    socket.on(removeEventName, handleLeadRemoved);

    // Join rooms so the socket server knows which events to send us
    joinedRoomsRef.current = [];

    if (isGlobalMode) {
      const globalRoom = { area: "all", disposition: formattedDisposition };
      socket.emit("join-room", globalRoom);
      joinedRoomsRef.current.push(globalRoom);
    } else {
      formattedAreas.forEach((area) => {
        const room = { area, disposition: formattedDisposition };
        socket.emit("join-room", room);
        joinedRoomsRef.current.push(room);
      });
    }

    // Periodically clear processed leads cache to prevent memory buildup
    const clearCacheInterval = setInterval(() => {
      processedLeadsRef.current.clear();
    }, 5 * 60 * 1000);

    return () => {
      flushQueuedRef.current = () => {};
      socket.off(addEventName, handleNewLead);
      socket.off(removeEventName, handleLeadRemoved);

      joinedRoomsRef.current.forEach((room) => {
        socket.emit("leave-room", room);
      });

      clearInterval(clearCacheInterval);
      processedLeadsRef.current.clear();
      joinedRoomsRef.current = [];
    };
  }, [socket, isConnected, areaKey, disposition, enabled]);

  return { socket, isConnected };
};
