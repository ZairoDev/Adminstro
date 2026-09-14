"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PipRecordCard } from "@/components/pip/PipRecordCard";
import type { PIPRecord } from "@/util/type";
interface PipAcknowledgmentScreenProps {
  pips: PIPRecord[];
  onAcknowledge: () => Promise<void>;
}
export function PipAcknowledgmentScreen({
  pips,
  onAcknowledge,
}: PipAcknowledgmentScreenProps) {
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleContinue = async () => {
    if (!hasAcknowledged || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onAcknowledge();
    } catch {
      setError(
        "We couldn't record your acknowledgment. Please try again before continuing.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[9999] flex min-h-dvh flex-col bg-background">
      <header className="shrink-0 border-b bg-background/95 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
            <ShieldAlert
              className="h-5 w-5 text-amber-700 dark:text-amber-400"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Action required
            </p>
            <h1 className="text-lg font-semibold leading-tight text-foreground">
              Performance Improvement Plan Notice
            </h1>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Please review your plan carefully
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
              The concerns below have been shared to help set clear expectations
              and support your improvement. You must read and acknowledge them
              before entering the dashboard.
            </p>
          </div>
          <div className="space-y-4">
            {pips.map((pip) => (
              <PipRecordCard key={pip._id ?? `${pip.startDate}-${pip.pipLevel}`} pip={pip} />
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Checkbox
                id="pip-acknowledgment"
                checked={hasAcknowledged}
                onCheckedChange={(checked) => setHasAcknowledged(checked === true)}
                disabled={isSubmitting}
                className="mt-0.5 h-5 w-5"
              />
              <Label
                htmlFor="pip-acknowledgment"
                className="cursor-pointer text-sm leading-6 text-foreground sm:text-base"
              >
                I have read and understood all concerns raised above, and I
                acknowledge this Performance Improvement Plan.
              </Label>
            </div>
          </div>
          {error ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>
      </main>
      <footer className="shrink-0 border-t bg-background/95 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">
            Your acknowledgment confirms receipt and understanding of this
            notice. It does not prevent you from discussing it with HR.
          </p>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!hasAcknowledged || isSubmitting}
            className="min-h-11 shrink-0 sm:min-w-52"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Recording…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Continue to Dashboard
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}