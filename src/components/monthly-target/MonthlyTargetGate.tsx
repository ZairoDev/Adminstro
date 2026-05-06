"use client";

import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TargetSetupModal } from "./TargetSetupModal";
import { useAuthStore } from "@/AuthStore";
import axios from "@/util/axios";

interface MonthlyTargetData {
  city: string;
  cityKey: string;
  leads: number;
  visits: number;
  sales: number;
  month: number;
  year: number;
}

interface CurrentTargetResponse {
  hasTarget: boolean;
  existingTargetsByCity: MonthlyTargetData[];
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
  const [existingTargetsByCity, setExistingTargetsByCity] = useState<MonthlyTargetData[]>([]);
  const [editableFields, setEditableFields] = useState<Array<"leads" | "visits" | "sales">>([]);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  const role = token?.role ?? "";
  const requiresMonthlyTargets =
    role === "SuperAdmin" || role === "LeadGen-TeamLead" || role === "Sales-TeamLead";

  const checkTarget = useCallback(async () => {
    setStatus("loading");
    try {
      const { data } = await axios.get<CurrentTargetResponse>("/api/monthly-target/current");
      setAvailableCities(data.availableCities ?? []);
      setExistingTargetsByCity(data.existingTargetsByCity ?? []);
      setEditableFields(data.editableFields ?? []);
      setCurrentMonth(data.currentMonth);
      setCurrentYear(data.currentYear);
      // Only SuperAdmin/TeamLeads are gated. Employees can continue normally.
      setStatus(!requiresMonthlyTargets || data.hasTarget ? "allowed" : "blocked");
    } catch {
      // On auth failure the middleware will redirect; treat other errors as blocked
      setStatus(requiresMonthlyTargets ? "blocked" : "allowed");
    }
  }, [requiresMonthlyTargets]);

  useEffect(() => {
    if (!token) return;
    checkTarget();
  }, [token, checkTarget]);

  // Re-run when the calendar month changes (e.g. user stays logged in past midnight on 1st)
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      if (month !== currentMonth || year !== currentYear) {
        setCurrentMonth(month);
        setCurrentYear(year);
        checkTarget();
      }
    }, 60_000); // check every minute

    return () => clearInterval(intervalId);
  }, [currentMonth, currentYear, checkTarget]);

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
      />
    );
  }

  return <>{children}</>;
}
