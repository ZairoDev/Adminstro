"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type {
  LeaveListPayload,
  LeavePreview,
  LeaveRequestStatus,
  LeaveRequestView,
} from "@/modules/attendance/leave/types";
import type { LeaveCategory } from "@/modules/attendance/types";
import {
  FinanceSheetEmpty,
  FinanceSheetError,
  FinanceSheetSkeleton,
  sheetFrameClass,
  sheetScrollClass,
  sheetToolbarClass,
} from "../../finance/_components/finance-sheet-frame";
import {
  apiErrorMessage,
  formatDayCount,
  LeaveStatusBadge,
  LeaveTypeBadge,
} from "../leave-shared";

type StatusFilter = LeaveRequestStatus | "";
type TypeFilter = LeaveCategory | "";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "", label: "All" },
];

export default function LeavesClient() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [leaveType, setLeaveType] = useState<TypeFilter>("");
  const [month, setMonth] = useState("");
  const [items, setItems] = useState<LeaveRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<LeaveRequestView | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ success: boolean; data: LeaveListPayload }>("/api/attendance/leaves", {
        params: {
          scope: "all",
          status: status || undefined,
          leaveType: leaveType || undefined,
          month: month || undefined,
        },
      });
      setItems(response.data.data.items);
    } catch (loadError) {
      setError(apiErrorMessage(loadError, "Could not load leave requests"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [leaveType, month, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={sheetFrameClass}>
      <div className={sheetToolbarClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            heading="Leave requests"
            subheading="Approve or reject planned and unplanned leave. Approved leave is written to the attendance sheet and counted in loss of pay."
          />
          <Button asChild variant="outline" size="sm" className="h-10 cursor-pointer">
            <Link href="/dashboard/attendance">Back to attendance</Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Status">
            {STATUS_FILTERS.map((item) => (
              <Button
                key={item.label}
                type="button"
                variant={status === item.value ? "default" : "outline"}
                className="h-10 cursor-pointer"
                aria-pressed={status === item.value}
                onClick={() => setStatus(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <label className="sr-only" htmlFor="leave-type-filter">Leave type</label>
          <select
            id="leave-type-filter"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={leaveType}
            onChange={(event) => setLeaveType(event.target.value as TypeFilter)}
          >
            <option value="">All types</option>
            <option value="planned">Planned</option>
            <option value="unplanned">Unplanned</option>
          </select>
          <label className="sr-only" htmlFor="leave-month-filter">Month</label>
          <input
            id="leave-month-filter"
            type="month"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>
        {message ? <p className="text-sm text-muted-foreground" aria-live="polite">{message}</p> : null}
      </div>
      <div className={sheetScrollClass}>
        {loading ? <FinanceSheetSkeleton /> : null}
        {!loading && error ? <FinanceSheetError message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && items.length === 0 ? (
          <FinanceSheetEmpty
            title="No leave requests"
            description="Nothing matches these filters. Try another status or month."
          />
        ) : null}
        {!loading && !error && items.length > 0 ? (
          <table className="w-full min-w-[56rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Employee</th>
                <th className="px-3 py-2 font-medium">Dates</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Days</th>
                <th className="px-3 py-2 text-right font-medium">Paid</th>
                <th className="px-3 py-2 text-right font-medium">LOP</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border align-top hover:bg-muted/40">
                  <td className="px-3 py-2">
                    <Link
                      href={`/dashboard/attendance/${item.employee.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {item.employee.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.employee.employeeCode || "No code"} · {item.employee.department || "No department"}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {item.fromDate === item.toDate ? item.fromLabel : `${item.fromLabel} to ${item.toLabel}`}
                  </td>
                  <td className="px-3 py-2"><LeaveTypeBadge type={item.leaveType} /></td>
                  <td className="px-3 py-2"><LeaveStatusBadge status={item.status} /></td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.workingDayCount}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.status === "approved" ? item.paidDays : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {item.status === "approved" ? formatDayCount(item.lopDays) : "—"}
                  </td>
                  <td className="max-w-xs px-3 py-2 text-muted-foreground">
                    {item.reason}
                    <span className="block text-xs">Filed by {item.requestedByName}</span>
                    {item.decisionNote ? <span className="block text-xs">Note: {item.decisionNote}</span> : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {item.canDecide || item.canCancel ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 cursor-pointer"
                        onClick={() => setSelected(item)}
                      >
                        {item.canDecide ? "Review" : "Manage"}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <ReviewDialog
        request={selected}
        onClose={() => setSelected(null)}
        onDone={(text) => {
          setSelected(null);
          setMessage(text);
          void load();
        }}
      />
    </div>
  );
}

function ReviewDialog({
  request,
  onClose,
  onDone,
}: {
  request: LeaveRequestView | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<LeavePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setNote("");
    setFormError(null);
    setPreview(null);
    if (!request || request.status !== "pending") return;
    let cancelled = false;
    void axios
      .post<{ success: boolean; data: LeavePreview }>("/api/attendance/leaves/preview", {
        employeeId: request.employee.id,
        leaveType: request.leaveType,
        fromDate: request.fromDate,
        toDate: request.toDate,
      })
      .then((response) => {
        if (!cancelled) setPreview(response.data.data);
      })
      .catch((previewError: unknown) => {
        if (!cancelled) setFormError(apiErrorMessage(previewError, "Could not work out the impact"));
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  const run = async (path: "decision" | "cancel", body?: { decision: "approve" | "reject"; note: string }) => {
    if (!request) return;
    setBusy(true);
    setFormError(null);
    try {
      await axios.post(`/api/attendance/leaves/${request.id}/${path}`, body);
      if (path === "cancel") onDone("Leave cancelled.");
      else onDone(body?.decision === "approve" ? "Leave approved." : "Leave rejected.");
    } catch (runError) {
      setFormError(apiErrorMessage(runError, "Could not save that"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={request !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        {request ? (
          <>
            <DialogHeader>
              <DialogTitle>{request.employee.name}</DialogTitle>
              <DialogDescription>
                {request.fromDate === request.toDate ? request.fromLabel : `${request.fromLabel} to ${request.toLabel}`}
                {" · "}
                {request.leaveType === "unplanned" ? "Unplanned leave" : "Planned leave"}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm">{request.reason}</p>

            {request.status === "pending" ? (
              <div className="space-y-1 rounded-md border border-border px-3 py-2 text-sm" aria-live="polite">
                {preview ? (
                  <>
                    <p className="font-medium">
                      If approved: {preview.workingDays.length} working day{preview.workingDays.length === 1 ? "" : "s"}
                    </p>
                    <ul className="text-muted-foreground">
                      {request.leaveType === "planned" ? (
                        <>
                          <li>Paid leave balance now: {formatDayCount(preview.balance)} day(s)</li>
                          <li>Paid: {preview.paidDays} · Unpaid: {preview.unpaidDays}</li>
                        </>
                      ) : (
                        <li>Unplanned leave is unpaid.</li>
                      )}
                      <li>Loss of pay added: {formatDayCount(preview.lopDays)} day(s)</li>
                    </ul>
                  </>
                ) : (
                  <p className="text-muted-foreground">Working out the impact…</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cancelling gives back any paid days from today onward and clears those days from the attendance sheet.
                Days already taken stay as they are.
              </p>
            )}

            {request.canDecide ? (
              <div className="space-y-1.5">
                <label htmlFor="leave-decision-note" className="text-sm font-medium">Note (optional)</label>
                <Textarea id="leave-decision-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
              </div>
            ) : null}
            {formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="h-10 cursor-pointer" onClick={onClose}>
                Close
              </Button>
              {request.canCancel ? (
                <Button type="button" variant="outline" className="h-10 cursor-pointer" disabled={busy} onClick={() => void run("cancel")}>
                  Cancel leave
                </Button>
              ) : null}
              {request.canDecide ? (
                <>
                  <Button type="button" variant="outline" className="h-10 cursor-pointer" disabled={busy} onClick={() => void run("decision", { decision: "reject", note })}>
                    Reject
                  </Button>
                  <Button type="button" className="h-10 cursor-pointer" disabled={busy} onClick={() => void run("decision", { decision: "approve", note })}>
                    Approve
                  </Button>
                </>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
