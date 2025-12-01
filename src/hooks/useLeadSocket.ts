"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "./useSocket";
import { useToast } from "./use-toast";
import { IQuery } from "@/util/type";

type LeadDisposition = "fresh" | "active" | "rejected" | "declined";

interface UseLeadSocketOptions {
  disposition: LeadDisposition;
  allotedArea: string | string[];
  setQueries: React.Dispatch<React.SetStateAction<IQuery[]>>;
  enabled?: boolean;
}

// Helper to format area consistently (same as server-side)
const formatArea = (area: string) =>
  area?.trim().toLowerCase().replace(/\s+/g, "-") || "all";

/**
 * A reusable hook for handling lead socket events across all lead pages.
 * - Adds new leads when they match the current disposition
 * - Removes leads when they move to a different disposition
 * - Prevents duplicate listeners and entries
 * - Handles proper cleanup
 */
export const useLeadSocket = ({
  disposition,
  allotedArea,
  setQueries,
  enabled = true,
}: UseLeadSocketOptions) => {
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  
  // Refs to store stable references
  const setQueriesRef = useRef(setQueries);
  const toastRef = useRef(toast);
  const joinedRoomsRef = useRef<{ area: string; disposition: string }[]>([]);
  const hasJoinedRef = useRef(false);

  // Keep refs updated
  useEffect(() => {
    setQueriesRef.current = setQueries;
    toastRef.current = toast;
  }, [setQueries, toast]);

  // Serialize allotedArea for dependency comparison
  const areaKey = Array.isArray(allotedArea)
    ? allotedArea.sort().join(",")
    : allotedArea || "";

  useEffect(() => {
    // Don't run if disabled or socket not ready
    if (!enabled || !socket || !isConnected) {
      return;
    }

    // Prevent duplicate setup
    if (hasJoinedRef.current) {
      return;
    }

    const formattedDisposition = formatArea(disposition);
    const addEventName = `lead-${formattedDisposition}`;
    const removeEventName = `lead-removed-${formattedDisposition}`;

    // Normalize allotedArea into an array of formatted area strings
    const rawAreas = Array.isArray(allotedArea)
      ? allotedArea.filter((a) => a && a.trim())
      : allotedArea
      ? [allotedArea]
      : [];

    const formattedAreas = rawAreas.map(formatArea).filter(Boolean);
    const isGlobalMode = formattedAreas.length === 0;

    // ✅ Handler for NEW leads coming into this disposition
    const handleNewLead = (data: IQuery) => {
      const dataArea = formatArea(data.location || "");

      // In global mode, accept all leads
      // In area mode, only accept leads that match our areas
      if (isGlobalMode || formattedAreas.includes(dataArea)) {
        setQueriesRef.current((prev) => {
          // Prevent duplicate entries
          if (prev.some((q) => q._id === data._id)) {
            console.log(`⚠️ Duplicate lead ignored: ${data._id}`);
            return prev;
          }
          return [data, ...prev];
        });

        console.log(
          `🆕 New ${disposition} lead received:`,
          data.name,
          `(${dataArea})`
        );

        toastRef.current({
          title: `New ${disposition.charAt(0).toUpperCase() + disposition.slice(1)} Lead`,
          description: `Lead from ${data.name || "Unknown"}${
            isGlobalMode ? "" : ` in ${data.location}`
          }`,
        });
      }
    };

    // ✅ Handler for leads LEAVING this disposition (moved elsewhere)
    const handleLeadRemoved = (data: { _id: string; newDisposition: string }) => {
      setQueriesRef.current((prev) => {
        const filtered = prev.filter((q) => q._id !== data._id);
        if (filtered.length !== prev.length) {
          console.log(
            `🚀 Lead ${data._id} moved to ${data.newDisposition}, removed from ${disposition}`
          );
        }
        return filtered;
      });
    };

    // ✅ Register event listeners BEFORE joining rooms
    socket.on(addEventName, handleNewLead);
    socket.on(removeEventName, handleLeadRemoved);
    console.log(`📡 Listening for: ${addEventName}, ${removeEventName}`);

    // ✅ Join rooms
    joinedRoomsRef.current = [];
    
    if (isGlobalMode) {
      const globalRoom = { area: "all", disposition: formattedDisposition };
      socket.emit("join-room", globalRoom);
      joinedRoomsRef.current.push(globalRoom);
      console.log(
        `✅ Joined global room: area-all|disposition-${formattedDisposition}`
      );
    } else {
      formattedAreas.forEach((area) => {
        const room = { area, disposition: formattedDisposition };
        socket.emit("join-room", room);
        joinedRoomsRef.current.push(room);
        console.log(
          `✅ Joined room: area-${area}|disposition-${formattedDisposition}`
        );
      });
    }

    hasJoinedRef.current = true;

    // ✅ Cleanup: Remove listeners and leave all joined rooms
    return () => {
      console.log(`🧹 Cleaning up socket for ${disposition} leads...`);
      hasJoinedRef.current = false;

      // Remove event listeners with specific handler references
      socket.off(addEventName, handleNewLead);
      socket.off(removeEventName, handleLeadRemoved);

      // Leave all rooms we joined
      joinedRoomsRef.current.forEach((room) => {
        socket.emit("leave-room", room);
        console.log(
          `🚪 Left room: area-${room.area}|disposition-${room.disposition}`
        );
      });

      joinedRoomsRef.current = [];
    };
  }, [socket, isConnected, areaKey, disposition, enabled]);

  return { socket, isConnected };
};

