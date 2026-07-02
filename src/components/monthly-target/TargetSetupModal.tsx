"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MonthlyTargetRow } from "./types";
import { MonthlyTargetSetupPanel } from "./MonthlyTargetSetupPanel";
import type { MonthlyTargetGateFooterActions } from "@/lib/monthly-target-gate-skip";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const AUTHORIZED_ROLES = ["SuperAdmin", "Sales-TeamLead", "LeadGen-TeamLead"];

interface TargetSetupModalProps {
  role: string;
  availableCities: string[];
  currentMonth: number;
  currentYear: number;
  existingTargetsByCity: MonthlyTargetRow[];
  editableFields: Array<"leads" | "visits" | "sales">;
  onSuccess: () => void;
  /** SuperAdmin only: dismiss gate until logout or hard refresh. */
  onSkip?: () => void;
}

export function TargetSetupModal({
  role,
  availableCities,
  currentMonth,
  currentYear,
  existingTargetsByCity,
  editableFields,
  onSuccess,
  onSkip,
}: TargetSetupModalProps) {
  const isAuthorized = AUTHORIZED_ROLES.includes(role);
  const monthLabel = MONTH_NAMES[currentMonth - 1] ?? "Current month";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allSaved, setAllSaved] = useState(false);
  const [remainingCount, setRemainingCount] = useState(availableCities.length);
  const [gateFooter, setGateFooter] = useState<MonthlyTargetGateFooterActions | null>(
    null,
  );
  const canSkip = role === "SuperAdmin" && Boolean(onSkip);

  const handleContinue = async () => {
    setIsSubmitting(true);
    await onSuccess();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-background">
      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Monthly Targets Setup</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {monthLabel} {currentYear}
              </p>
            </div>
          </div>
          {canSkip ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground shrink-0"
              onClick={onSkip}
            >
              Skip for now
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5">
          {!isAuthorized ? (
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
          ) : (
            <MonthlyTargetSetupPanel
              role={role}
              availableCities={availableCities}
              currentMonth={currentMonth}
              currentYear={currentYear}
              existingTargetsByCity={existingTargetsByCity}
              editableFields={editableFields}
              onSaved={() => void onSuccess()}
              onProgressChange={(saved, total) => {
                setAllSaved(total > 0 && saved === total);
                setRemainingCount(Math.max(0, total - saved));
              }}
              onGateFooterActions={setGateFooter}
              showFooter={false}
            />
          )}
        </div>
      </div>

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
                  {canSkip
                    ? "Save all cities to continue, or skip for now"
                    : `${remainingCount} remaining`}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {gateFooter?.hasUnsaved ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void gateFooter.saveAll()}
                  disabled={gateFooter.isSavingAll}
                  className="gap-1.5"
                >
                  {gateFooter.isSavingAll ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving all…
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" /> Save All
                    </>
                  )}
                </Button>
              ) : null}
              {canSkip ? (
                <Button type="button" variant="outline" size="sm" onClick={onSkip}>
                  Skip without saving
                </Button>
              ) : null}
              {allSaved ? (
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
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
