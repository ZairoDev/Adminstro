"use client";

import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TargetSetupModal } from "./TargetSetupModal";
import { useAuthStore } from "@/AuthStore";
import axios from "@/util/axios";
import type { MonthlyTargetRow } from "./types";
import {
  isMonthlyTargetGateSkipped,
  setMonthlyTargetGateSkipped,
} from "@/lib/monthly-target-gate-skip";

export type { MonthlyTargetRow };

interface CurrentTargetResponse {
  hasTarget: boolean;
  existingTargetsByCity: MonthlyTargetRow[];
  availableCities: string[];
  editableFields: Array<"leads" | "visits" | "sales">;
  currentMonth: number;
  currentYear: number;
}

type GateStatus = "loading" | "blocked" | "allowed";

interface MonthlyTargetGateProps {
  children: React.ReactNode;
}

export function MonthlyTargetGate({ children }: MonthlyTargetGateProps) {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<GateStatus>("loading");
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [existingTargetsByCity, setExistingTargetsByCity] = useState<MonthlyTargetRow[]>([]);
  const [editableFields, setEditableFields] = useState<Array<"leads" | "visits" | "sales">>([]);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  const role = token?.role ?? "";
  const userId = token?.id ?? "";
  const requiresMonthlyTargets =
    role === "SuperAdmin" || role === "LeadGen-TeamLead" || role === "Sales-TeamLead";

  const checkTarget = useCallback(async () => {
    if (
      role === "SuperAdmin" &&
      userId &&
      isMonthlyTargetGateSkipped(userId)
    ) {
      setStatus("allowed");
      return;
    }

    setStatus("loading");
    try {
      const { data } = await axios.get<CurrentTargetResponse>("/api/monthly-target/current");
      setAvailableCities(data.availableCities ?? []);
      setExistingTargetsByCity(
        (data.existingTargetsByCity ?? []).map((t) => ({
          ...t,
          leadsConfigured: Boolean(t.leadsConfigured),
          visitsConfigured: Boolean(t.visitsConfigured),
          salesConfigured: Boolean(t.salesConfigured),
        })),
      );
      setEditableFields(data.editableFields ?? []);
      setCurrentMonth(data.currentMonth);
      setCurrentYear(data.currentYear);
      setStatus(!requiresMonthlyTargets || data.hasTarget ? "allowed" : "blocked");
    } catch {
      setStatus(requiresMonthlyTargets ? "blocked" : "allowed");
    }
  }, [requiresMonthlyTargets, role, userId]);

  const handleSkip = useCallback(() => {
    if (role !== "SuperAdmin" || !userId) return;
    setMonthlyTargetGateSkipped(userId);
    setStatus("allowed");
  }, [role, userId]);

  useEffect(() => {
    if (!token) return;
    if (!requiresMonthlyTargets) {
      setStatus("allowed");
      return;
    }
    void checkTarget();
  }, [token, requiresMonthlyTargets, checkTarget]);

  useEffect(() => {
    if (!requiresMonthlyTargets) return;
    const intervalId = setInterval(() => {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      if (month !== currentMonth || year !== currentYear) {
        setCurrentMonth(month);
        setCurrentYear(year);
        void checkTarget();
      }
    }, 60_000);
    return () => clearInterval(intervalId);
  }, [currentMonth, currentYear, checkTarget, requiresMonthlyTargets]);

  if (status === "loading") {
    return (
      <div className="w-full space-y-4 p-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <TargetSetupModal
        role={role}
        availableCities={availableCities}
        existingTargetsByCity={existingTargetsByCity}
        editableFields={editableFields}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onSuccess={checkTarget}
        onSkip={role === "SuperAdmin" ? handleSkip : undefined}
      />
    );
  }

  return <>{children}</>;
}
