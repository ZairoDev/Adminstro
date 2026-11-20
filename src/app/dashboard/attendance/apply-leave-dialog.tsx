"use client";

import { useEffect, useState } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LeavePreview } from "@/modules/attendance/leave/types";
import { UNPLANNED_MAX_FUTURE_DAYS } from "@/modules/attendance/leave/types";
import type { LeaveCategory } from "@/modules/attendance/types";
import { addDaysToDateKey, apiErrorMessage, formatDayCount, todayInIst } from "./leave-shared";
import { useRefreshPendingLeaveCount } from "@/hooks/usePendingLeaveDecisions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set when HR files leave for someone else. Leave it out when applying for yourself. */
  employeeId?: string;
  employeeName?: string;
  /** HR and admins filing for someone else may approve in the same step. */
  canApproveNow?: boolean;
  onSubmitted: () => void;
};

const TYPE_OPTIONS: { value: LeaveCategory; title: string; text: string }[] = [
  {
    value: "planned",
    title: "Planned leave",
    text: "Asked for ahead of time. Uses your paid leave balance first. Days beyond the balance are unpaid.",
  },
  {
    value: "unplanned",
    title: "Unplanned leave",
    text: "Sudden or already taken. It is always unpaid and costs extra loss of pay.",
  },
];

export default function ApplyLeaveDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  canApproveNow = false,
  onSubmitted,
}: Props) {
  const [leaveType, setLeaveType] = useState<LeaveCategory | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [approveNow, setApproveNow] = useState(false);
  const [preview, setPreview] = useState<LeavePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const refreshPendingCount = useRefreshPendingLeaveCount();

  useEffect(() => {
    if (!open) return;
    setLeaveType("");
    setFromDate("");
    setToDate("");
    setReason("");
    setApproveNow(false);
    setPreview(null);
    setFormError(null);
  }, [open]);

  const chooseType = (value: LeaveCategory) => {
    setLeaveType(value);
    setFormError(null);
    if (value === "unplanned") {
      const today = todayInIst();
      setFromDate((current) => (current && current <= today ? current : today));
      setToDate((current) => (current && current <= addDaysToDateKey(today, UNPLANNED_MAX_FUTURE_DAYS) ? current : today));
    }
  };

  useEffect(() => {
    if (!open || !leaveType || !fromDate || !toDate) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    const timer = setTimeout(() => {
      void axios
        .post<{ success: boolean; data: LeavePreview }>("/api/attendance/leaves/preview", {
          employeeId,
          leaveType,
          fromDate,
          toDate,
        })
        .then((response) => {
          if (!cancelled) setPreview(response.data.data);
        })
        .catch((previewError: unknown) => {
          if (cancelled) return;
          setPreview(null);
          setFormError(apiErrorMessage(previewError, "Could not check these dates"));
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, employeeId, leaveType, fromDate, toDate]);

  const canSubmit =
    Boolean(leaveType && fromDate && toDate && reason.trim().length >= 3) &&
    Boolean(preview && preview.workingDays.length > 0 && !preview.message) &&
    !submitting;

  const submit = async () => {
    if (!leaveType) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await axios.post("/api/attendance/leaves", {
        employeeId,
        leaveType,
        fromDate,
        toDate,
        reason: reason.trim(),
        approveNow: canApproveNow && approveNow,
      });
      onOpenChange(false);
      refreshPendingCount();
      onSubmitted();
    } catch (submitError) {
      setFormError(apiErrorMessage(submitError, "Could not save the leave"));
    } finally {
      setSubmitting(false);
    }
  };

  const unplannedPerDay =
    preview && preview.leaveType === "unplanned" && preview.workingDays.length > 0
      ? preview.lopDays / preview.workingDays.length
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{employeeName ? `Mark leave for ${employeeName}` : "Apply for leave"}</DialogTitle>
          <DialogDescription>
            Say whether this leave was planned or unplanned. Weekly offs and holidays are not counted.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Type of leave</legend>
            <RadioGroup
              value={leaveType}
              onValueChange={(value) => chooseType(value as LeaveCategory)}
              className="gap-2"
            >
              {TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`leave-type-${option.value}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2",
                    leaveType === option.value ? "border-foreground bg-muted" : "border-border",
                  )}
                >
                  <RadioGroupItem id={`leave-type-${option.value}`} value={option.value} className="mt-1" />
                  <span>
                    <span className="block text-sm font-medium">{option.title}</span>
                    <span className="block text-xs text-muted-foreground">{option.text}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>

          {leaveType === "unplanned" ? (
            <p
              role="alert"
              className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-50"
            >
              Unplanned leave is unpaid.{" "}
              {unplannedPerDay !== null
                ? `Each day costs ${formatDayCount(unplannedPerDay)} days of loss of pay.`
                : "Each day costs extra days of loss of pay."}{" "}
              If you knew about this leave earlier, choose planned leave next time.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="leave-from" className="text-sm font-medium">From</label>
              <Input
                id="leave-from"
                type="date"
                value={fromDate}
                max={leaveType === "unplanned" ? todayInIst() : undefined}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setFormError(null);
                  if (!toDate || toDate < event.target.value) setToDate(event.target.value);
                }}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="leave-to" className="text-sm font-medium">To</label>
              <Input
                id="leave-to"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                max={leaveType === "unplanned" ? addDaysToDateKey(todayInIst(), UNPLANNED_MAX_FUTURE_DAYS) : undefined}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setFormError(null);
                }}
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="leave-reason" className="text-sm font-medium">Reason</label>
            <Textarea
              id="leave-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Short reason for HR"
            />
          </div>

          {leaveType && fromDate && toDate ? (
            <div className="space-y-1 rounded-md border border-border px-3 py-2 text-sm" aria-live="polite">
              {previewLoading && !preview ? <p className="text-muted-foreground">Checking dates…</p> : null}
              {preview ? (
                <>
                  <p className="font-medium">
                    {preview.workingDays.length} working day{preview.workingDays.length === 1 ? "" : "s"}
                    {preview.skippedDays.length > 0
                      ? ` (${preview.skippedDays.length} off day${preview.skippedDays.length === 1 ? "" : "s"} skipped)`
                      : ""}
                  </p>
                  {preview.workingDays.length > 0 ? (
                    <ul className="text-muted-foreground">
                      {preview.leaveType === "planned" ? (
                        <>
                          <li>Paid leave balance: {formatDayCount(preview.balance)} day(s)</li>
                          <li>Paid: {preview.paidDays} · Unpaid: {preview.unpaidDays}</li>
                        </>
                      ) : null}
                      <li>Loss of pay added: {formatDayCount(preview.lopDays)} day(s)</li>
                    </ul>
                  ) : null}
                  {preview.message ? <p className="text-destructive">{preview.message}</p> : null}
                </>
              ) : null}
            </div>
          ) : null}

          {canApproveNow ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={approveNow} onChange={(event) => setApproveNow(event.target.checked)} />
              Approve right away
            </label>
          ) : null}

          {formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" className="h-10 cursor-pointer" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" className="h-10 cursor-pointer" disabled={!canSubmit}>
              {submitting ? "Saving…" : approveNow ? "Save and approve" : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
