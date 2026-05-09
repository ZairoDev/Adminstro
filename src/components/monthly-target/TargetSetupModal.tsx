"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import axios from "@/util/axios";
import { normalizeCityKey } from "@/lib/city-normalizer";
import type { MonthlyTargetRow } from "./types";
import { EmployeeTargetSection } from "./EmployeeTargetSection";

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

function isRowDone(
  role: string,
  existing: MonthlyTargetRow | undefined,
  localStatus: RowStatus
): boolean {
  if (!existing && localStatus !== "saved") return false;
  if (role === "SuperAdmin") {
    return Boolean(existing?.visitsConfigured) && Boolean(existing?.salesConfigured);
  }
  return localStatus === "saved" || Boolean(existing);
}

/* ------------------------------------------------------------------ */
/* Status badge                                                         */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: RowStatus }) {
  if (status === "saved")
    return (
      <Badge className="gap-1 bg-green-100 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950/60 dark:text-green-400 dark:border-green-800">
        <CheckCircle2 className="h-3 w-3" /> Saved
      </Badge>
    );
  if (status === "saving")
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving
      </Badge>
    );
  if (status === "error")
    return <Badge variant="destructive">Error</Badge>;
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Not configured
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                        */
/* ------------------------------------------------------------------ */

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

  const existingByCityKey = useMemo(() => {
    const map = new Map<string, MonthlyTargetRow>();
    existingTargetsByCity.forEach((t) => map.set(t.cityKey, t));
    return map;
  }, [existingTargetsByCity]);

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
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

  const toggleExpand = (city: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      next.has(city) ? next.delete(city) : next.add(city);
      return next;
    });
  };

  // Sync when server data refreshes (e.g. after Continue triggers re-fetch)
  useEffect(() => {
    setRows((prev) => {
      const next: Record<string, RowState> = {};
      for (const city of availableCities) {
        const ck = normalizeCityKey(city);
        const existing = existingByCityKey.get(ck);
        const prevRow = prev[city];

        if (!prevRow) {
          const done = isRowDone(role, existing, existing ? "saved" : "idle");
          next[city] = {
            leads: String(existing?.leads ?? 0),
            visits: String(existing?.visits ?? 0),
            sales: String(existing?.sales ?? 0),
            status: done ? "saved" : "idle",
          };
        } else if (prevRow.status === "saving") {
          next[city] = prevRow;
        } else {
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
      setGlobalError("Some cities failed to save.");
    }
  };

  const saveAll = async () => {
    const pending = availableCities.filter(
      (city) => rows[city]?.status === "idle" || rows[city]?.status === "error"
    );
    if (!pending.length) return;
    setIsSavingAll(true);
    await Promise.allSettled(pending.map((city) => saveRow(city)));
    setIsSavingAll(false);
  };

  const savedCount = Object.values(rows).filter((r) => r.status === "saved").length;
  const totalCount = availableCities.length;
  const allSaved = totalCount > 0 && savedCount === totalCount;
  const hasUnsaved = availableCities.some(
    (city) => rows[city]?.status === "idle" || rows[city]?.status === "error"
  );
  const progress = totalCount > 0 ? (savedCount / totalCount) * 100 : 0;

  const handleContinue = async () => {
    setIsSubmitting(true);
    await onSuccess();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-background">

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-semibold leading-tight">Monthly Targets Setup</h1>
                <p className="text-xs text-muted-foreground mt-0.5">{monthLabel} {currentYear}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium">
                <span className="tabular-nums">{savedCount}</span>
                <span className="text-muted-foreground"> / {totalCount}</span>
              </p>
              <p className="text-xs text-muted-foreground">cities configured</p>
            </div>
          </div>

          {totalCount > 0 && (
            <div className="space-y-1">
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-2">

          {/* Unauthorized */}
          {!isAuthorized && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <p className="font-semibold">Targets Not Yet Set</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Monthly targets for{" "}
                  <strong>{monthLabel} {currentYear}</strong> haven&apos;t been configured.
                  Contact your Team Lead or Super Admin to unlock the dashboard.
                </p>
              </div>
            </div>
          )}

          {isAuthorized && (
            <>
              {/* Role scope info */}
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                You can configure:{" "}
                <span className="font-medium text-foreground">
                  {editableFields
                    .map((f) => f.charAt(0).toUpperCase() + f.slice(1))
                    .join(", ")}
                </span>
              </div>

              {/* No locations */}
              {availableCities.length === 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  No active locations found. Ask an admin to configure locations.
                </div>
              )}

              {/* Global error */}
              {globalError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {globalError}
                </div>
              )}

              {/* City cards */}
              {availableCities.map((city) => {
                const row = rows[city];
                if (!row) return null;
                const isExpanded = expandedCities.has(city);
                const isSaving = row.status === "saving";

                return (
                  <div
                    key={city}
                    className={cn(
                      "rounded-xl border transition-colors duration-200",
                      row.status === "saved"
                        ? "border-green-500/30 bg-green-50/40 dark:bg-green-950/10"
                        : row.status === "error"
                        ? "border-destructive/30 bg-destructive/5"
                        : row.status === "saving"
                        ? "border-primary/20 bg-primary/5"
                        : "border-border bg-card"
                    )}
                  >
                    {/* Card header — clickable */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(city)}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {/* Status dot */}
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          row.status === "saved"
                            ? "bg-green-500"
                            : row.status === "error"
                            ? "bg-destructive"
                            : row.status === "saving"
                            ? "animate-pulse bg-primary"
                            : "bg-muted-foreground/25"
                        )}
                      />

                      <span className="flex-1 text-sm font-medium">{city}</span>

                      {/* Quick value summary when saved + collapsed */}
                      {row.status === "saved" && !isExpanded && (
                        <span className="hidden sm:flex items-center gap-2.5 text-xs text-muted-foreground mr-1">
                          {canEditField("leads") && <span>L {row.leads}</span>}
                          {showVisits && <span>V {row.visits}</span>}
                          {showSales && <span>S {row.sales}</span>}
                        </span>
                      )}

                      <StatusBadge status={row.status} />

                      {isExpanded ? (
                        <ChevronDown className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    {/* Expanded body */}
                    {isExpanded && (
                      <div className="border-t px-4 pb-4 pt-4 space-y-4">
                        {/* Input grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {canEditField("leads") && (
                            <LabeledInput
                              label="Leads Target"
                              value={row.leads}
                              disabled={isSaving}
                              onChange={(v) => updateField(city, "leads", v)}
                            />
                          )}
                          {showVisits && (
                            <LabeledInput
                              label="Visits Target"
                              value={row.visits}
                              disabled={isSaving}
                              onChange={(v) => updateField(city, "visits", v)}
                            />
                          )}
                          {showSales && (
                            <LabeledInput
                              label="Sales Target"
                              value={row.sales}
                              disabled={isSaving}
                              onChange={(v) => updateField(city, "sales", v)}
                            />
                          )}
                        </div>

                        {/* Row-level error */}
                        {row.status === "error" && row.error && (
                          <p className="flex items-center gap-1.5 text-xs text-destructive">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {row.error}
                          </p>
                        )}

                        {/* Save city */}
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant={row.status === "saved" ? "outline" : "default"}
                            onClick={() => saveRow(city)}
                            disabled={isSaving}
                            className="gap-1.5"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                              </>
                            ) : row.status === "saved" ? (
                              <>
                                <Save className="h-3.5 w-3.5" /> Update
                              </>
                            ) : (
                              <>
                                <Save className="h-3.5 w-3.5" /> Save City
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Employee targets (optional, lazy) */}
                        <div className="border-t pt-3">
                          <EmployeeTargetSection
                            city={city}
                            currentMonth={currentMonth}
                            currentYear={currentYear}
                            editableFields={editableFields}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="h-2" />
            </>
          )}
        </div>
      </div>

      {/* ── Sticky footer ─────────────────────────────────────────── */}
      {isAuthorized && availableCities.length > 0 && (
        <div className="shrink-0 border-t bg-background/95 backdrop-blur-sm px-4 sm:px-6 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {allSaved ? (
                <span className="flex items-center gap-1.5 font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  All cities configured
                </span>
              ) : (
                <span>
                  {availableCities.filter((c) => rows[c]?.status !== "saved").length} remaining
                </span>
              )}
            </p>

            <div className="flex items-center gap-2">
              {hasUnsaved && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveAll}
                  disabled={isSavingAll}
                  className="gap-1.5"
                >
                  {isSavingAll ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving all…
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" /> Save All
                    </>
                  )}
                </Button>
              )}

              {allSaved && (
                <Button
                  size="sm"
                  onClick={handleContinue}
                  disabled={isSubmitting}
                  className="gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…
                    </>
                  ) : (
                    "Continue to Dashboard →"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Labeled number input                                                  */
/* ------------------------------------------------------------------ */

function LabeledInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <Input
        type="number"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="h-9"
      />
    </div>
  );
}
