"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Save, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "@/util/axios";
import { normalizeCityKey } from "@/lib/city-normalizer";
import type { MonthlyTargetRow } from "./MonthlyTargetGate";

interface TargetSetupModalProps {
  role: string;
  availableCities: string[];
  currentMonth: number;
  currentYear: number;
  existingTargetsByCity: MonthlyTargetRow[];
  editableFields: Array<"leads" | "visits" | "sales">;
  onSuccess: () => void;
}

type RowStatus = "idle" | "saving" | "saved" | "error";

type RowState = {
  leads: string;
  visits: string;
  sales: string;
  status: RowStatus;
  error?: string;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const AUTHORIZED_ROLES = ["SuperAdmin", "Sales-TeamLead", "LeadGen-TeamLead"];

/**
 * Decide whether a row is complete for the given role.
 * - SuperAdmin must have both visitsConfigured AND salesConfigured in the DB.
 * - All other roles: having a saved record is enough.
 */
function isRowDone(
  role: string,
  existing: MonthlyTargetRow | undefined,
  localStatus: RowStatus
): boolean {
  if (!existing && localStatus !== "saved") return false;

  if (role === "SuperAdmin") {
    // Must have explicitly configured visits + sales (even if value is 0)
    return Boolean(existing?.visitsConfigured) && Boolean(existing?.salesConfigured);
  }

  // For TeamLeads, any saved record counts
  return localStatus === "saved" || Boolean(existing);
}

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

  const canEditField = (field: "leads" | "visits" | "sales") => editableFields.includes(field);
  const showVisits = canEditField("visits");
  const showSales = canEditField("sales");

  // Build a lookup map keyed by normalised city key
  const existingByCityKey = useMemo(() => {
    const map = new Map<string, MonthlyTargetRow>();
    existingTargetsByCity.forEach((t) => map.set(t.cityKey, t));
    return map;
  }, [existingTargetsByCity]);

  // Compute initial row states from server data — called once on mount and when server data changes
  const buildRows = useMemo<Record<string, RowState>>(() => {
    const entries: Array<[string, RowState]> = availableCities.map((city) => {
      const existing = existingByCityKey.get(normalizeCityKey(city));
      const done = isRowDone(role, existing, existing ? "saved" : "idle");
      return [
        city,
        {
          leads: String(existing?.leads ?? 0),
          visits: String(existing?.visits ?? 0),
          sales: String(existing?.sales ?? 0),
          status: done ? "saved" : "idle",
        },
      ];
    });
    return Object.fromEntries(entries);
  }, [availableCities, existingByCityKey, role]);

  const [rows, setRows] = useState<Record<string, RowState>>(buildRows);
  const [globalError, setGlobalError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep rows in sync when the gate re-fetches after "Continue" triggers a check
  useEffect(() => {
    setRows((prev) => {
      const next: Record<string, RowState> = {};

      for (const city of availableCities) {
        const ck = normalizeCityKey(city);
        const existing = existingByCityKey.get(ck);
        const prevRow = prev[city];

        if (!prevRow) {
          // New city not yet in state
          const done = isRowDone(role, existing, existing ? "saved" : "idle");
          next[city] = {
            leads: String(existing?.leads ?? 0),
            visits: String(existing?.visits ?? 0),
            sales: String(existing?.sales ?? 0),
            status: done ? "saved" : "idle",
          };
        } else if (prevRow.status === "saving") {
          // Don't overwrite while a save is in flight
          next[city] = prevRow;
        } else {
          // If the server now confirms this row is done, mark it saved
          const done = isRowDone(role, existing, prevRow.status);
          next[city] = {
            ...prevRow,
            leads: existing ? String(existing.leads) : prevRow.leads,
            visits: existing ? String(existing.visits) : prevRow.visits,
            sales: existing ? String(existing.sales) : prevRow.sales,
            status: done ? "saved" : prevRow.status === "saved" ? "idle" : prevRow.status,
          };
        }
      }

      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableCities, existingByCityKey]);

  const updateField = (city: string, field: "leads" | "visits" | "sales", value: string) => {
    setRows((prev) => ({
      ...prev,
      [city]: {
        ...prev[city],
        [field]: value,
        // Editing a saved row marks it dirty again
        status: prev[city]?.status === "saved" ? "idle" : prev[city]?.status ?? "idle",
      },
    }));
  };

  const saveRow = async (city: string) => {
    const row = rows[city];
    if (!row || row.status === "saving") return;

    setRows((prev) => ({
      ...prev,
      [city]: { ...prev[city], status: "saving", error: undefined },
    }));

    try {
      await axios.post("/api/monthly-target", {
        city,
        month: currentMonth,
        year: currentYear,
        leads: Number(row.leads) || 0,
        visits: Number(row.visits) || 0,
        sales: Number(row.sales) || 0,
      });

      // Mark saved locally — no gate re-fetch here to avoid flashing
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
          error: axiosErr?.response?.data?.error ?? "Failed to save. Please retry.",
        },
      }));
      setGlobalError("Some rows failed to save.");
    }
  };

  const savedCount = Object.values(rows).filter((r) => r.status === "saved").length;
  const totalCount = availableCities.length;
  const allSaved = totalCount > 0 && savedCount === totalCount;

  const handleContinue = async () => {
    setIsSubmitting(true);
    // Re-check gate — this will dismiss the modal if server confirms completion
    await onSuccess();
    setIsSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"                       
      aria-labelledby="target-modal-title"
    >
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
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
              <div className="text-sm text-muted-foreground font-medium">
                {savedCount} / {totalCount} saved
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-4">
            {/* Unauthorized message */}
            {!isAuthorized && (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  Monthly targets for{" "}
                  <strong>
                    {monthLabel} {currentYear}
                  </strong>{" "}
                  are not yet set. Please contact your Team Lead or Super Admin.
                </p>
              </div>
            )}

            {/* Authorized editor */}
            {isAuthorized && (
              <>
                {availableCities.length === 0 && (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    No active locations found for your scope. Ask an admin to configure locations.
                  </div>
                )}

                {globalError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {globalError}
                  </div>
                )}

                {availableCities.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">City</th>
                          <th className="text-left p-2 font-medium">Leads</th>
                          {showVisits && <th className="text-left p-2 font-medium">Visits</th>}
                          {showSales && <th className="text-left p-2 font-medium">Sales</th>}
                          <th className="text-left p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableCities.map((city) => {
                          const row = rows[city];
                          if (!row) return null;
                          const isSaving = row.status === "saving";
                          return (
                            <tr key={city} className="border-b last:border-0">
                              <td className="p-2 font-medium">{city}</td>
                              <td className="p-2 w-28">
                                <Input
                                  type="number"
                                  min={0}
                                  value={row.leads}
                                  disabled={!canEditField("leads") || isSaving}
                                  onChange={(e) => updateField(city, "leads", e.target.value)}
                                  className="h-8"
                                />
                              </td>
                              {showVisits && (
                                <td className="p-2 w-28">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={row.visits}
                                    disabled={!canEditField("visits") || isSaving}
                                    onChange={(e) => updateField(city, "visits", e.target.value)}
                                    className="h-8"
                                  />
                                </td>
                              )}
                              {showSales && (
                                <td className="p-2 w-28">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={row.sales}
                                    disabled={!canEditField("sales") || isSaving}
                                    onChange={(e) => updateField(city, "sales", e.target.value)}
                                    className="h-8"
                                  />
                                </td>
                              )}
                              <td className="p-2">
                                {row.status === "saved" && (
                                  <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                                  </span>
                                )}
                                {isSaving && (
                                  <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                                  </span>
                                )}
                                {row.status === "error" && (
                                  <span className="text-destructive text-xs">
                                    {row.error ?? "Error"}
                                  </span>
                                )}
                                {row.status === "idle" && (
                                  <span className="text-muted-foreground text-xs">Not saved</span>
                                )}
                              </td>
                              <td className="p-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => saveRow(city)}
                                  disabled={isSaving}
                                  className="h-8"
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <Save className="h-3.5 w-3.5 mr-1" /> Save
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
                )}

                {allSaved && (
                  <Button
                    className="w-full mt-2"
                    onClick={handleContinue}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…</>
                    ) : (
                      "Continue to Dashboard"
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
