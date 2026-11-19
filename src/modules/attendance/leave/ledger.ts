import { randomUUID } from "crypto";
import LeaveLedger from "@/models/leaveLedger";
import { roundLop } from "@/modules/attendance/calculate";
import { AttendanceError, isDuplicateKeyError } from "@/modules/attendance/errors";
import {
  accrualStartMonth,
  monthKeyOf,
  planAccruals,
  wholePaidDaysAvailable,
} from "@/modules/attendance/leave/calculate";
import type { LedgerEntryType, LeaveLedgerEntryView } from "@/modules/attendance/leave/types";
import type { LeavePolicyRules } from "@/modules/attendance/types";

export type LedgerActor = { id: string; name: string } | null;

type LedgerEntryInput = {
  employeeId: string;
  monthKey: string;
  entryType: LedgerEntryType;
  days: number;
  idempotencyKey: string;
  leaveRequestId?: string | null;
  attendanceRecordId?: string | null;
  leaveDate?: string | null;
  reason?: string;
  actor?: LedgerActor;
};

/** Posts one ledger entry. Returns false when the same entry was already posted. */
async function postEntry(entry: LedgerEntryInput): Promise<boolean> {
  try {
    await LeaveLedger.create({
      employeeId: entry.employeeId,
      monthKey: entry.monthKey,
      entryType: entry.entryType,
      days: entry.days,
      idempotencyKey: entry.idempotencyKey,
      leaveRequestId: entry.leaveRequestId ?? null,
      attendanceRecordId: entry.attendanceRecordId ?? null,
      leaveDate: entry.leaveDate ?? null,
      reason: entry.reason ?? "",
      createdBy: entry.actor?.id ?? null,
      createdByName: entry.actor?.name ?? null,
    });
    return true;
  } catch (error) {
    if (isDuplicateKeyError(error)) return false;
    throw error;
  }
}

export async function getLedgerBalance(employeeId: string): Promise<number> {
  const rows = await LeaveLedger.aggregate<{ total: number }>([
    { $match: { employeeId } },
    { $group: { _id: null, total: { $sum: "$days" } } },
  ]);
  return roundLop(rows[0]?.total ?? 0);
}

/**
 * Credits any months that have not been accrued yet, up to and including `throughMonth`.
 * Safe to call on every read: month entries are keyed, so a repeat call posts nothing.
 */
export async function ensureAccruals(input: {
  employeeId: string;
  joiningDate: string | null;
  policy: LeavePolicyRules;
  throughMonth: string;
}): Promise<void> {
  const start = accrualStartMonth(
    input.joiningDate,
    input.policy.leaveAccrualStartMonth,
    input.throughMonth,
  );
  if (start > input.throughMonth) return;
  const [accrued, balance] = await Promise.all([
    LeaveLedger.find({ employeeId: input.employeeId, entryType: "accrual" })
      .select("monthKey")
      .lean<{ monthKey: string }[]>(),
    getLedgerBalance(input.employeeId),
  ]);
  const entries = planAccruals({
    startMonth: start,
    throughMonth: input.throughMonth,
    accruedMonths: new Set(accrued.map((item) => item.monthKey)),
    joiningDate: input.joiningDate,
    currentBalance: balance,
    policy: input.policy,
  });
  for (const entry of entries) {
    await postEntry({
      employeeId: input.employeeId,
      monthKey: entry.monthKey,
      entryType: entry.entryType,
      days: entry.days,
      idempotencyKey: `${entry.entryType}:${input.employeeId}:${entry.monthKey}`,
      reason:
        entry.entryType === "accrual"
          ? "Monthly paid leave credit"
          : "Balance trimmed to the carry-forward cap",
    });
  }
}

/** Spends one paid day for an approved planned leave day. */
export async function postLeaveConsumption(input: {
  employeeId: string;
  leaveRequestId: string;
  date: string;
  actor: LedgerActor;
}): Promise<void> {
  await postEntry({
    employeeId: input.employeeId,
    monthKey: monthKeyOf(input.date),
    entryType: "consumption",
    days: -1,
    idempotencyKey: `consume:${input.leaveRequestId}:${input.date}`,
    leaveRequestId: input.leaveRequestId,
    leaveDate: input.date,
    reason: "Paid planned leave",
    actor: input.actor,
  });
}

/**
 * Gives back the paid days a request used. When `fromDate` is set, only days on or after it
 * are returned, which is how a leave that has already started gets shortened.
 */
export async function reverseLeaveConsumption(input: {
  leaveRequestId: string;
  fromDate?: string;
  actor: LedgerActor;
  reason: string;
}): Promise<number> {
  const consumed = await LeaveLedger.find({
    leaveRequestId: input.leaveRequestId,
    entryType: "consumption",
  }).lean<{ employeeId: string; leaveDate: string | null }[]>();
  let reversed = 0;
  for (const entry of consumed) {
    if (!entry.leaveDate) continue;
    if (input.fromDate && entry.leaveDate < input.fromDate) continue;
    const posted = await postEntry({
      employeeId: entry.employeeId,
      monthKey: monthKeyOf(entry.leaveDate),
      entryType: "reversal",
      days: 1,
      idempotencyKey: `reverse:${input.leaveRequestId}:${entry.leaveDate}`,
      leaveRequestId: input.leaveRequestId,
      leaveDate: entry.leaveDate,
      reason: input.reason,
      actor: input.actor,
    });
    if (posted) reversed += 1;
  }
  return reversed;
}

/**
 * Keeps the ledger in step with a leave day set by hand on an attendance record.
 * A paid planned leave spends one day. Changing the day to anything else gives it back.
 */
export async function syncManualLeaveConsumption(input: {
  employeeId: string;
  attendanceRecordId: string;
  attendanceDate: string;
  wantsPaid: boolean;
  actor: LedgerActor;
}): Promise<void> {
  const entries = await LeaveLedger.find({ attendanceRecordId: input.attendanceRecordId })
    .select("days")
    .lean<{ days: number }[]>();
  const consumed = Math.max(0, -entries.reduce((sum, entry) => sum + entry.days, 0));
  const wanted = input.wantsPaid ? 1 : 0;
  if (wanted > consumed) {
    const balance = await getLedgerBalance(input.employeeId);
    if (wholePaidDaysAvailable(balance) < wanted - consumed) {
      throw new AttendanceError(
        400,
        "There is no paid leave balance left for this employee. Mark the leave as unpaid instead",
      );
    }
    await postEntry({
      employeeId: input.employeeId,
      monthKey: monthKeyOf(input.attendanceDate),
      entryType: "consumption",
      days: -1,
      idempotencyKey: `manual:${input.attendanceRecordId}:${randomUUID()}`,
      attendanceRecordId: input.attendanceRecordId,
      leaveDate: input.attendanceDate,
      reason: "Paid leave set on the attendance record",
      actor: input.actor,
    });
  } else if (wanted < consumed) {
    await postEntry({
      employeeId: input.employeeId,
      monthKey: monthKeyOf(input.attendanceDate),
      entryType: "reversal",
      days: 1,
      idempotencyKey: `manual-reverse:${input.attendanceRecordId}:${randomUUID()}`,
      attendanceRecordId: input.attendanceRecordId,
      leaveDate: input.attendanceDate,
      reason: "Leave removed from the attendance record",
      actor: input.actor,
    });
  }
}

export async function postBalanceAdjustment(input: {
  employeeId: string;
  days: number;
  reason: string;
  monthKey: string;
  actor: LedgerActor;
}): Promise<void> {
  await postEntry({
    employeeId: input.employeeId,
    monthKey: input.monthKey,
    entryType: "adjustment",
    days: roundLop(input.days),
    idempotencyKey: `adjust:${input.employeeId}:${randomUUID()}`,
    reason: input.reason,
    actor: input.actor,
  });
}

export async function listLedgerEntries(
  employeeId: string,
  limit = 60,
): Promise<LeaveLedgerEntryView[]> {
  const rows = await LeaveLedger.find({ employeeId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean<
      {
        _id: { toString(): string };
        entryType: LedgerEntryType;
        days: number;
        monthKey: string;
        leaveDate?: string | null;
        leaveRequestId?: string | null;
        reason?: string;
        createdByName?: string | null;
        createdAt?: Date;
      }[]
    >();
  return rows.map((row) => ({
    id: String(row._id),
    entryType: row.entryType,
    days: row.days,
    monthKey: row.monthKey,
    leaveDate: row.leaveDate ?? null,
    leaveRequestId: row.leaveRequestId ?? null,
    reason: row.reason ?? "",
    createdByName: row.createdByName ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : "",
  }));
}
