"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  LeaveBalanceView,
  LeaveListPayload,
  LeaveRequestView,
} from "@/modules/attendance/leave/types";
import ApplyLeaveDialog from "./apply-leave-dialog";
import {
  apiErrorMessage,
  formatDayCount,
  LeaveStatusBadge,
  LeaveTypeBadge,
} from "./leave-shared";
import { useRefreshPendingLeaveCount } from "@/hooks/usePendingLeaveDecisions";

type Props = {
  /** Leave out for the signed-in employee's own page. */
  employeeId?: string;
  selfService: boolean;
  /** HR and admins viewing an employee: allows filing leave on their behalf. */
  canManage: boolean;
  /** Called after any change so the attendance grid can refresh. */
  onChanged?: () => void;
};

const LEDGER_LABELS: Record<string, string> = {
  accrual: "Monthly credit",
  consumption: "Paid leave used",
  reversal: "Paid leave returned",
  adjustment: "Adjustment",
  cap_trim: "Trimmed to carry-forward cap",
};

export default function LeavePanel({ employeeId, selfService, canManage, onChanged }: Props) {
  const refreshPendingCount = useRefreshPendingLeaveCount();
  const [balance, setBalance] = useState<LeaveBalanceView | null>(null);
  const [requests, setRequests] = useState<LeaveRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [adjustDays, setAdjustDays] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balanceResponse, listResponse] = await Promise.all([
        axios.get<{ success: boolean; data: LeaveBalanceView }>("/api/attendance/leave-balance", {
          params: selfService ? {} : { employeeId },
        }),
        axios.get<{ success: boolean; data: LeaveListPayload }>("/api/attendance/leaves", {
          params: selfService ? { scope: "mine" } : { scope: "all", employeeId },
        }),
      ]);
      setBalance(balanceResponse.data.data);
      setRequests(listResponse.data.data.items);
    } catch (loadError) {
      setError(apiErrorMessage(loadError, "Could not load leave"));
    } finally {
      setLoading(false);
    }
  }, [employeeId, selfService]);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = () => {
    refreshPendingCount();
    void load();
    onChanged?.();
  };

  const cancel = async (request: LeaveRequestView) => {
    setBusyId(request.id);
    setMessage(null);
    try {
      await axios.post(`/api/attendance/leaves/${request.id}/cancel`);
      setMessage("Leave cancelled.");
      changed();
    } catch (cancelError) {
      setMessage(apiErrorMessage(cancelError, "Could not cancel the leave"));
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (request: LeaveRequestView, decision: "approve" | "reject") => {
    setBusyId(request.id);
    setMessage(null);
    try {
      await axios.post(`/api/attendance/leaves/${request.id}/decision`, { decision, note: "" });
      setMessage(decision === "approve" ? "Leave approved." : "Leave rejected.");
      changed();
    } catch (decideError) {
      setMessage(apiErrorMessage(decideError, "Could not save the decision"));
    } finally {
      setBusyId(null);
    }
  };

  const adjust = async () => {
    if (!balance) return;
    const days = Number(adjustDays);
    if (!Number.isFinite(days) || days === 0) {
      setMessage("Enter the number of days to add or remove.");
      return;
    }
    setAdjusting(true);
    setMessage(null);
    try {
      await axios.post("/api/attendance/leave-balance/adjust", {
        employeeId: balance.employeeId,
        days,
        reason: adjustReason,
      });
      setAdjustDays("");
      setAdjustReason("");
      setMessage("Balance adjusted.");
      changed();
    } catch (adjustError) {
      setMessage(apiErrorMessage(adjustError, "Could not adjust the balance"));
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <section className="space-y-3" aria-labelledby="leave-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="leave-heading" className="text-sm font-semibold">Leave</h2>
        <Button type="button" variant="outline" className="h-10 cursor-pointer" onClick={() => setApplyOpen(true)}>
          {selfService ? "Apply for leave" : "Mark leave"}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground" aria-live="polite">{message}</p> : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Tile label="Paid leave balance" value={balance ? `${formatDayCount(balance.balance)} days` : "—"} />
        <Tile label="Waiting for approval" value={balance ? `${balance.pendingPlannedDays} days` : "—"} />
        <Tile label="Credited each month" value={balance ? `${formatDayCount(balance.monthlyAccrual)} days` : "—"} />
        <Tile label="Highest balance" value={balance ? `${formatDayCount(balance.maxBalance)} days` : "—"} />
      </div>

      {loading && requests.length === 0 ? <p className="text-sm text-muted-foreground">Loading leave…</p> : null}
      {!loading && requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leave requests yet.</p>
      ) : null}
      {requests.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Dates</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 text-right font-medium">Paid</th>
                <th className="py-2 pr-3 text-right font-medium">Unpaid</th>
                <th className="py-2 pr-3 text-right font-medium">LOP</th>
                <th className="py-2 pr-3 font-medium">Reason</th>
                <th className="py-2 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-b border-border align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {request.fromDate === request.toDate ? request.fromLabel : `${request.fromLabel} to ${request.toLabel}`}
                  </td>
                  <td className="py-2 pr-3"><LeaveTypeBadge type={request.leaveType} /></td>
                  <td className="py-2 pr-3"><LeaveStatusBadge status={request.status} /></td>
                  <td className="py-2 pr-3 text-right tabular-nums">{request.status === "approved" ? request.paidDays : "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{request.status === "approved" ? request.unpaidDays : "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{request.status === "approved" ? formatDayCount(request.lopDays) : "—"}</td>
                  <td className="max-w-xs py-2 pr-3 text-muted-foreground">
                    {request.reason}
                    {request.decisionNote ? <span className="block text-xs">HR note: {request.decisionNote}</span> : null}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <div className="flex gap-1">
                      {request.canDecide ? (
                        <>
                          <Button type="button" size="sm" className="h-8 cursor-pointer" disabled={busyId === request.id} onClick={() => void decide(request, "approve")}>
                            Approve
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="h-8 cursor-pointer" disabled={busyId === request.id} onClick={() => void decide(request, "reject")}>
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {request.canCancel ? (
                        <Button type="button" size="sm" variant="ghost" className="h-8 cursor-pointer" disabled={busyId === request.id} onClick={() => void cancel(request)}>
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {balance && balance.ledger.length > 0 ? (
        <div>
          <Button type="button" variant="ghost" size="sm" className="h-8 cursor-pointer px-0" aria-expanded={showLedger} onClick={() => setShowLedger((value) => !value)}>
            {showLedger ? "Hide balance history" : "Show balance history"}
          </Button>
          {showLedger ? (
            <ul className="mt-1 space-y-1 text-sm">
              {balance.ledger.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-1.5">
                  <span>
                    {LEDGER_LABELS[entry.entryType] ?? entry.entryType}
                    <span className="text-muted-foreground">
                      {entry.leaveDate ? ` · ${entry.leaveDate}` : ` · ${entry.monthKey}`}
                      {entry.reason ? ` · ${entry.reason}` : ""}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {entry.days > 0 ? "+" : ""}
                    {formatDayCount(entry.days)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {balance?.canAdjust && !selfService ? (
        <form
          className="flex flex-wrap items-end gap-2 border-t border-border pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            void adjust();
          }}
        >
          <div className="space-y-1">
            <label htmlFor="adjust-days" className="text-xs font-medium text-muted-foreground">Add or remove days</label>
            <Input id="adjust-days" inputMode="decimal" value={adjustDays} onChange={(event) => setAdjustDays(event.target.value)} placeholder="e.g. 2 or -1" className="h-10 w-36" />
          </div>
          <div className="space-y-1">
            <label htmlFor="adjust-reason" className="text-xs font-medium text-muted-foreground">Reason</label>
            <Input id="adjust-reason" value={adjustReason} onChange={(event) => setAdjustReason(event.target.value)} className="h-10 w-64" />
          </div>
          <Button type="submit" variant="outline" className="h-10 cursor-pointer" disabled={adjusting || adjustReason.trim().length < 3}>
            {adjusting ? "Saving…" : "Adjust balance"}
          </Button>
        </form>
      ) : null}

      <ApplyLeaveDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        employeeId={selfService ? undefined : employeeId}
        employeeName={selfService ? undefined : balance?.employeeName}
        canApproveNow={canManage && !selfService}
        onSubmitted={() => {
          setMessage("Leave saved.");
          changed();
        }}
      />
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
