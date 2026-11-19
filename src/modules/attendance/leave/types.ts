import type { LeaveCategory, LeavePay } from "@/modules/attendance/types";

export const LEAVE_REQUEST_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;

export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number];

export const LEDGER_ENTRY_TYPES = [
  "accrual",
  "consumption",
  "reversal",
  "adjustment",
  "cap_trim",
] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

/** Longest range one request may cover, in calendar days. */
export const MAX_LEAVE_RANGE_DAYS = 31;

/** An unplanned leave that has already started may run this many days past today. */
export const UNPLANNED_MAX_FUTURE_DAYS = 3;

export type LeaveDayKind =
  | "working"
  | "holiday"
  | "weekly_off"
  | "not_joined"
  | "after_exit";

export type LeaveDay = {
  date: string;
  pay: LeavePay;
  category: LeaveCategory;
};

export type SkippedLeaveDay = {
  date: string;
  reason: Exclude<LeaveDayKind, "working">;
};

export type LeaveSplit = {
  days: LeaveDay[];
  paidDays: number;
  unpaidDays: number;
  /** LOP days this leave adds to the month. */
  lopDays: number;
};

export type LeaveWindowCheck = { ok: true } | { ok: false; message: string };

export type LeaveRequestView = {
  id: string;
  employee: {
    id: string;
    name: string;
    employeeCode: string | null;
    department: string;
  };
  leaveType: LeaveCategory;
  fromDate: string;
  toDate: string;
  fromLabel: string;
  toLabel: string;
  reason: string;
  status: LeaveRequestStatus;
  workingDayCount: number;
  paidDays: number;
  unpaidDays: number;
  lopDays: number;
  days: LeaveDay[];
  requestedByName: string;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string;
  createdAt: string;
  canCancel: boolean;
  canDecide: boolean;
};

export type LeaveLedgerEntryView = {
  id: string;
  entryType: LedgerEntryType;
  days: number;
  monthKey: string;
  leaveDate: string | null;
  leaveRequestId: string | null;
  reason: string;
  createdByName: string | null;
  createdAt: string;
};

export type LeaveBalanceView = {
  employeeId: string;
  employeeName: string;
  /** Only HR and super admins may post manual adjustments. */
  canAdjust: boolean;
  balance: number;
  /** Working days still waiting for a decision on planned requests. */
  pendingPlannedDays: number;
  monthlyAccrual: number;
  maxBalance: number;
  ledger: LeaveLedgerEntryView[];
};

export type LeavePreview = {
  leaveType: LeaveCategory;
  fromDate: string;
  toDate: string;
  workingDays: string[];
  skippedDays: SkippedLeaveDay[];
  paidDays: number;
  unpaidDays: number;
  lopDays: number;
  balance: number;
  noticeOk: boolean;
  message: string | null;
};

export type LeaveListPayload = {
  items: LeaveRequestView[];
  canManage: boolean;
};
