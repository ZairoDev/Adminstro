"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Target } from "lucide-react";

import { useAuthStore } from "@/AuthStore";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import { MonthlyTargetSetupPanel } from "@/components/monthly-target/MonthlyTargetSetupPanel";
import type { MonthlyTargetRow } from "@/components/monthly-target/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface CurrentTargetResponse {
  hasTarget: boolean;
  existingTargetsByCity: MonthlyTargetRow[];
  availableCities: string[];
  editableFields: Array<"leads" | "visits" | "sales">;
  currentMonth: number;
  currentYear: number;
}

function buildYearOptions(): number[] {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1];
}

export default function MonthlyTargetsSettingsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const role = token?.role ?? "";

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [existingTargetsByCity, setExistingTargetsByCity] = useState<MonthlyTargetRow[]>([]);
  const [editableFields, setEditableFields] = useState<Array<"leads" | "visits" | "sales">>([]);

  useEffect(() => {
    if (!token) return;
    if (role !== "SuperAdmin") {
      router.replace("/dashboard");
    }
  }, [token, role, router]);

  const loadTargets = useCallback(async () => {
    if (role !== "SuperAdmin") return;
    setLoading(true);
    try {
      const { data } = await axios.get<CurrentTargetResponse>(
        `/api/monthly-target/current?month=${month}&year=${year}`,
      );
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
    } catch {
      setAvailableCities([]);
      setExistingTargetsByCity([]);
      setEditableFields([]);
    } finally {
      setLoading(false);
    }
  }, [month, year, role]);

  useEffect(() => {
    void loadTargets();
  }, [loadTargets]);

  if (role !== "SuperAdmin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Heading
          heading="Monthly Targets"
          subheading="Configure leads, visits, and sales targets per city for any month."
        />
        <div className="flex items-center gap-2 shrink-0">
          <Target className="h-5 w-5 text-primary hidden sm:block" />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="space-y-1.5 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground">Month</label>
          <Select
            value={String(month)}
            onValueChange={(v) => setMonth(Number(v))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, index) => (
                <SelectItem key={name} value={String(index + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 min-w-[120px]">
          <label className="text-xs font-medium text-muted-foreground">Year</label>
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {buildYearOptions().map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <MonthlyTargetSetupPanel
          role={role}
          availableCities={availableCities}
          currentMonth={month}
          currentYear={year}
          existingTargetsByCity={existingTargetsByCity}
          editableFields={editableFields}
          onSaved={() => void loadTargets()}
          showFooter
        />
      )}
    </div>
  );
}
