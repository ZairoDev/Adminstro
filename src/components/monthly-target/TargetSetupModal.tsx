"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Save, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "@/util/axios";
import { normalizeCityKey } from "@/lib/city-normalizer";

interface MonthlyTargetData {
  city: string;
  cityKey: string;
  leads: number;
  visits: number;
  sales: number;
}

interface TargetSetupModalProps {
  role: string;
  availableCities: string[];
  currentMonth: number;
  currentYear: number;
  existingTargetsByCity: MonthlyTargetData[];
  editableFields: Array<"leads" | "visits" | "sales">;
  onSuccess: () => void;
}

type RowState = {
  leads: string;
  visits: string;
  sales: string;
  status: "idle" | "saving" | "saved" | "error";
  error?: string;
};

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

const AUTHORIZED_ROLES = ["SuperAdmin", "Sales-TeamLead", "LeadGen-TeamLead"];

export function TargetSetupModal({
  role,
  availableCities,
  currentMonth,
  currentYear,
  existingTargetsByCity,
  editableFields,
  onSuccess,
}: TargetSetupModalProps) {
  const isAuthorized = AUTHORIZED_ROLES.includes(role);
  const monthLabel = MONTH_NAMES[currentMonth - 1] ?? "Current month";

  const existingByCityKey = useMemo(() => {
    const map = new Map<string, MonthlyTargetData>();
    existingTargetsByCity.forEach((target) => map.set(target.cityKey, target));
    return map;
  }, [existingTargetsByCity]);

  const initialRows = useMemo<Record<string, RowState>>(() => {
    const entries: Array<[string, RowState]> = availableCities.map((city) => {
      const cityKey = normalizeCityKey(city);
      const existing = existingByCityKey.get(cityKey);
      return [
        city,
        {
          leads: String(existing?.leads ?? 0),
          visits: String(existing?.visits ?? 0),
          sales: String(existing?.sales ?? 0),
          status: existing ? "saved" : "idle",
        },
      ];
    });
    return Object.fromEntries(entries);
  }, [availableCities, existingByCityKey]);

  const [rows, setRows] = useState<Record<string, RowState>>(initialRows);
  const [globalError, setGlobalError] = useState<string>("");

  // Keep UI in sync when server data changes (e.g., after a row save + re-fetch)
  useEffect(() => {
    setRows((prev) => {
      const next: Record<string, RowState> = { ...prev };

      for (const city of availableCities) {
        const cityKey = normalizeCityKey(city);
        const existing = existingByCityKey.get(cityKey);
        const prevRow = prev[city];   

        // If row doesn't exist yet, initialize it
        if (!prevRow) {
          next[city] = {
            leads: String(existing?.leads ?? 0),
            visits: String(existing?.visits ?? 0),
            sales: String(existing?.sales ?? 0),
            status: existing ? "saved" : "idle",
          };
          continue;
        }

        // If server confirms saved target, reflect that (but don't clobber while actively saving)
        if (existing && prevRow.status !== "saving") {
          next[city] = {
            ...prevRow,
            leads: String(existing.leads ?? 0),
            visits: String(existing.visits ?? 0),
            sales: String(existing.sales ?? 0),
            status: "saved",
            error: undefined,
          };
        }
      }

      // Remove rows for cities no longer in scope
      for (const city of Object.keys(next)) {
        if (!availableCities.includes(city)) {
          delete next[city];
        }
      }

      return next;
    });
  }, [availableCities, existingByCityKey]);

  const canEditField = (field: "leads" | "visits" | "sales") =>
    editableFields.includes(field);

  const showVisits = canEditField("visits");
  const showSales = canEditField("sales");

  const updateRowField = (city: string, field: "leads" | "visits" | "sales", value: string) => {
    setRows((prev) => ({
      ...prev,
      [city]: {
        ...prev[city],
        [field]: value,
        status: prev[city]?.status === "saved" ? "idle" : prev[city]?.status ?? "idle",
      },
    }));
  };

  const saveRow = async (city: string) => {
    const row = rows[city];
    if (!row) return;

    setRows((prev) => ({
      ...prev,
      [city]: { ...prev[city], status: "saving", error: undefined },
    }));

    try {
      await axios.post("/api/monthly-target", {
        city,
        month: currentMonth,
        year: currentYear,
        leads: Number(row.leads || 0),
        visits: Number(row.visits || 0),
        sales: Number(row.sales || 0),
      });

      setRows((prev) => ({
        ...prev,
        [city]: { ...prev[city], status: "saved", error: undefined },
      }));
      setGlobalError("");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setRows((prev) => ({
        ...prev,
        [city]: {
          ...prev[city],
          status: "error",
          error: axiosErr?.response?.data?.error ?? "Failed to save row",
        },
      }));
      setGlobalError("Some rows failed to save. Please retry.");
    }
  };

  const savedCount = Object.values(rows).filter((row) => row.status === "saved").length;
  const isComplete = availableCities.length > 0 && savedCount === availableCities.length;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="target-modal-title"
    >
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">
          <div className="bg-primary/5 border-b px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 id="target-modal-title" className="text-lg font-semibold">
                    Monthly Targets Required
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {monthLabel} {currentYear}
                  </p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Saved {savedCount} / {availableCities.length}
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            {!isAuthorized && (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  Monthly targets for <strong>{monthLabel} {currentYear}</strong> are not yet set.
                  Please contact Team Lead or Super Admin.
                </p>
              </div>
            )}

            {isAuthorized && (
              <div className="space-y-4">
                {availableCities.length === 0 && (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    No active locations were found for your scope. Please ask an admin to configure locations.
                  </div>
                )}
                {globalError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {globalError}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">City</th>
                        <th className="text-left p-2">Leads</th>
                        {showVisits && <th className="text-left p-2">Visits</th>}
                        {showSales && <th className="text-left p-2">Sales</th>}
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableCities.map((city) => {
                        const row = rows[city];
                        if (!row) return null;
                        return (
                          <tr key={city} className="border-b">
                            <td className="p-2 font-medium">{city}</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min={0}
                                value={row.leads}
                                disabled={!canEditField("leads") || row.status === "saving"}
                                onChange={(e) => updateRowField(city, "leads", e.target.value)}
                              />
                            </td>
                            {showVisits && (
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min={0}
                                  value={row.visits}
                                  disabled={!canEditField("visits") || row.status === "saving"}
                                  onChange={(e) => updateRowField(city, "visits", e.target.value)}
                                />
                              </td>
                            )}
                            {showSales && (
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min={0}
                                  value={row.sales}
                                  disabled={!canEditField("sales") || row.status === "saving"}
                                  onChange={(e) => updateRowField(city, "sales", e.target.value)}
                                />
                              </td>
                            )}
                            <td className="p-2">
                              {row.status === "saved" && (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-4 w-4" /> Saved
                                </span>
                              )}
                              {row.status === "saving" && (
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Saving
                                </span>
                              )}
                              {row.status === "error" && (
                                <span className="text-destructive">{row.error ?? "Failed"}</span>
                              )}
                              {row.status === "idle" && (
                                <span className="text-muted-foreground">Not saved</span>
                              )}
                            </td>
                            <td className="p-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => saveRow(city)}
                                disabled={row.status === "saving"}
                              >
                                {row.status === "saving" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-1" /> Save
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {isComplete && (
                  <Button className="w-full" onClick={onSuccess}>
                    Continue to Dashboard
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
