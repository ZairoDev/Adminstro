"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "@/util/axios";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  LogOut,
  MapPin,
  User,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/AuthStore";
import { clearMonthlyTargetGateSkip } from "@/lib/monthly-target-gate-skip";
import { clearVisitStatusGateSkip } from "@/lib/visits/visit-status-gate-skip";
import {
  VISIT_CANCEL_REASONS,
  VISIT_NO_SHOW_REASONS,
} from "@/lib/visits/visitStatus";
import { useVisitCloseActions } from "@/hooks/useVisitCloseActions";
import { useToast } from "@/hooks/use-toast";
import type { OverdueVisitSummary } from "@/lib/visits/overdueVisit";
import { Toaster } from "@/components/ui/toaster";
import { useVisitOverdue } from "./VisitOverdueContext";

const DROPDOWN_Z = "z-[10050]";

function localDateInputValue(date: Date | string | undefined): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayLocalDateInput(): string {
  return localDateInputValue(new Date());
}

function formatSchedule(visit: OverdueVisitSummary): string {
  const slot = visit.schedule?.[0];
  if (!slot?.date) return "No schedule";
  const date = new Date(slot.date);
  if (Number.isNaN(date.getTime())) return "No schedule";
  return `${date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} · ${slot.time}`;
}

interface OverdueVisitCardProps {
  visit: OverdueVisitSummary;
  loadingId: string | null;
  onComplete: (visitId: string) => void;
  onCancel: (visitId: string, reason: string) => void;
  onNoShow: (visitId: string, reason: string) => void;
  onRescheduled: () => void;
}

function OverdueVisitCard({
  visit,
  loadingId,
  onComplete,
  onCancel,
  onNoShow,
  onRescheduled,
}: OverdueVisitCardProps) {
  const { toast } = useToast();
  const [showReschedule, setShowReschedule] = useState(false);
  const [date, setDate] = useState(todayLocalDateInput());
  const [time, setTime] = useState(visit.schedule?.[0]?.time ?? "");
  const [reason, setReason] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const isBusy = loadingId === visit._id || rescheduleLoading;
  const VisitTypeIcon = visit.visitType === "virtual" ? Video : MapPin;

  const handleReschedule = async () => {
    if (!date || !time) {
      toast({
        title: "Date and time are required",
        variant: "destructive",
      });
      return;
    }

    setRescheduleLoading(true);
    try {
      await axios.patch(`/api/visits/${visit._id}/reschedule`, {
        date,
        time,
        reason: reason.trim() || undefined,
      });
      toast({ title: "Visit rescheduled" });
      setShowReschedule(false);
      onRescheduled();
    } catch (error) {
      const apiMessage =
        typeof error === "object" &&
        error &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: unknown } } }).response?.data
          ?.error === "string"
          ? (error as { response: { data: { error: string } } }).response.data.error
          : "Unable to reschedule visit";
      toast({
        title: apiMessage,
        variant: "destructive",
      });
    } finally {
      setRescheduleLoading(false);
    }
  };

  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold leading-tight">
              {visit.VSID || "No VSID"}
            </h2>
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              {visit.daysOverdue} {visit.daysOverdue === 1 ? "day" : "days"} overdue
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{formatSchedule(visit)}</p>
        </div>
        <Link
          href={`/dashboard/visits/${visit._id}`}
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Full details
        </Link>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="text-xs text-muted-foreground">Guest</dt>
            <dd className="font-medium">{visit.lead?.name || "—"}</dd>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="text-xs text-muted-foreground">Owner</dt>
            <dd className="font-medium">{visit.ownerName || "—"}</dd>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VisitTypeIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="text-xs text-muted-foreground">Visit type</dt>
            <dd className="font-medium capitalize">{visit.visitType || "—"}</dd>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="text-xs text-muted-foreground">Agent</dt>
            <dd className="font-medium">{visit.agentName || "—"}</dd>
          </div>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={isBusy}
          onClick={() => onComplete(visit._id)}
        >
          {loadingId === visit._id ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Mark completed"
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={isBusy}>
              Cancel
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={DROPDOWN_Z}>
            {VISIT_CANCEL_REASONS.map((cancelReason) => (
              <DropdownMenuItem
                key={cancelReason}
                className="cursor-pointer"
                onClick={() => onCancel(visit._id, cancelReason)}
              >
                {cancelReason}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={isBusy}>
              No-show
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={DROPDOWN_Z}>
            {VISIT_NO_SHOW_REASONS.map((noShowReason) => (
              <DropdownMenuItem
                key={noShowReason}
                className="cursor-pointer"
                onClick={() => onNoShow(visit._id, noShowReason)}
              >
                {noShowReason}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="secondary"
          disabled={isBusy}
          onClick={() => setShowReschedule((open) => !open)}
        >
          <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
          Reschedule
        </Button>
      </div>

      {showReschedule && (
        <div className="mt-3 space-y-3 rounded-md border bg-muted/40 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`reschedule-date-${visit._id}`}>New date</Label>
              <Input
                id={`reschedule-date-${visit._id}`}
                type="date"
                min={todayLocalDateInput()}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`reschedule-time-${visit._id}`}>New time</Label>
              <Input
                id={`reschedule-time-${visit._id}`}
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`reschedule-reason-${visit._id}`}>Reason (optional)</Label>
            <Textarea
              id={`reschedule-reason-${visit._id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this visit being rescheduled?"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowReschedule(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={rescheduleLoading}
              onClick={() => void handleReschedule()}
            >
              {rescheduleLoading ? "Saving…" : "Save new date"}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

export function OverdueVisitInbox() {
  const router = useRouter();
  const { token, clearToken } = useAuthStore();
  const { visits, count, refresh, skip, canSkip } = useVisitOverdue();
  const { loadingId, complete, cancel, noShow } = useVisitCloseActions();
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const remainingLabel = useMemo(
    () => `${count} remaining`,
    [count],
  );

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await axios.get("/api/employeelogout", { withCredentials: true });
      if (token?.id) {
        clearMonthlyTargetGateSkip(String(token.id));
        clearVisitStatusGateSkip(String(token.id));
      }
      clearToken();
      router.push("/login");
    } catch {
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-background">
      <Toaster />
      <div className="shrink-0 border-b bg-background/95 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">
                Close overdue visits
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Each visit needs a final status before you can continue
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canSkip ? (
              <Button type="button" variant="ghost" size="sm" onClick={skip}>
                Skip for now
              </Button>
            ) : null}
            {confirmLogout ? (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmLogout(false)}
                  disabled={loggingOut}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleLogout()}
                  disabled={loggingOut}
                >
                  {loggingOut ? "Logging out…" : "Confirm logout"}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setConfirmLogout(true)}
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-3 px-4 py-5 sm:px-6">
          {visits.map((visit) => (
            <OverdueVisitCard
              key={visit._id}
              visit={visit}
              loadingId={loadingId}
              onComplete={(id) => void complete(id)}
              onCancel={(id, reason) => void cancel(id, reason)}
              onNoShow={(id, reason) => void noShow(id, reason)}
              onRescheduled={() => void refresh()}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {count === 0 ? (
              <span className="flex items-center gap-1.5 font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                All overdue visits closed
              </span>
            ) : (
              remainingLabel
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
