/**
 * Paid leave ledger against an in-memory MongoDB: accrual is idempotent, consumption and
 * cancellation net to zero, and a manual leave day cannot overdraw the balance.
 */
import { clearCollections, setupTestDb, teardownTestDb } from "@/modules/finance/__tests__/test-db";
import LeaveLedger from "@/models/leaveLedger";
import {
  ensureAccruals,
  getLedgerBalance,
  postBalanceAdjustment,
  postLeaveConsumption,
  reverseLeaveConsumption,
  syncManualLeaveConsumption,
} from "@/modules/attendance/leave/ledger";
import { DEFAULT_LEAVE_POLICY } from "@/modules/attendance/types";

const employeeId = "emp-1";
const actor = { id: "hr-1", name: "HR User" };
const policy = { ...DEFAULT_LEAVE_POLICY, leaveAccrualStartMonth: "2026-09" };

beforeAll(async () => {
  await setupTestDb();
  await LeaveLedger.init();
}, 120_000);

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearCollections();
});

describe("leave ledger", () => {
  it("accrues each month once, however often it runs", async () => {
    const run = () =>
      ensureAccruals({ employeeId, joiningDate: "2020-01-01", policy, throughMonth: "2026-11" });
    await run();
    await run();
    await Promise.all([run(), run()]);
    // September, October and November at 1.5 days each
    expect(await getLedgerBalance(employeeId)).toBe(4.5);
    expect(await LeaveLedger.countDocuments({ employeeId, entryType: "accrual" })).toBe(3);
  });

  it("starts accrual at the policy start month for staff who joined earlier", async () => {
    await ensureAccruals({ employeeId, joiningDate: "2018-04-01", policy, throughMonth: "2026-09" });
    expect(await getLedgerBalance(employeeId)).toBe(1.5);
  });

  it("returns paid days when approved leave is cancelled", async () => {
    await ensureAccruals({ employeeId, joiningDate: null, policy, throughMonth: "2026-10" });
    await postLeaveConsumption({ employeeId, leaveRequestId: "req-1", date: "2026-11-18", actor });
    await postLeaveConsumption({ employeeId, leaveRequestId: "req-1", date: "2026-11-19", actor });
    expect(await getLedgerBalance(employeeId)).toBe(1);

    const reversed = await reverseLeaveConsumption({ leaveRequestId: "req-1", actor, reason: "Leave cancelled" });
    expect(reversed).toBe(2);
    expect(await getLedgerBalance(employeeId)).toBe(3);

    // Cancelling again must not hand back more days.
    expect(await reverseLeaveConsumption({ leaveRequestId: "req-1", actor, reason: "Leave cancelled" })).toBe(0);
    expect(await getLedgerBalance(employeeId)).toBe(3);
  });

  it("gives back only the days from a date onward when a started leave is shortened", async () => {
    await ensureAccruals({ employeeId, joiningDate: null, policy, throughMonth: "2026-10" });
    for (const date of ["2026-11-17", "2026-11-18", "2026-11-19"]) {
      await postLeaveConsumption({ employeeId, leaveRequestId: "req-2", date, actor });
    }
    const reversed = await reverseLeaveConsumption({
      leaveRequestId: "req-2",
      fromDate: "2026-11-18",
      actor,
      reason: "Leave cancelled",
    });
    expect(reversed).toBe(2);
    expect(await getLedgerBalance(employeeId)).toBe(2);
  });

  it("does not post the same consumption twice", async () => {
    await ensureAccruals({ employeeId, joiningDate: null, policy, throughMonth: "2026-09" });
    await postLeaveConsumption({ employeeId, leaveRequestId: "req-3", date: "2026-11-18", actor });
    await postLeaveConsumption({ employeeId, leaveRequestId: "req-3", date: "2026-11-18", actor });
    expect(await getLedgerBalance(employeeId)).toBe(0.5);
  });

  it("spends and returns one day for a manual paid leave, and refuses to overdraw", async () => {
    await ensureAccruals({ employeeId, joiningDate: null, policy, throughMonth: "2026-09" });
    const manual = { employeeId, attendanceRecordId: "rec-1", attendanceDate: "2026-11-18", actor };

    await syncManualLeaveConsumption({ ...manual, wantsPaid: true });
    expect(await getLedgerBalance(employeeId)).toBe(0.5);
    // Saving the same paid day again changes nothing.
    await syncManualLeaveConsumption({ ...manual, wantsPaid: true });
    expect(await getLedgerBalance(employeeId)).toBe(0.5);

    await syncManualLeaveConsumption({ ...manual, wantsPaid: false });
    expect(await getLedgerBalance(employeeId)).toBe(1.5);

    await postBalanceAdjustment({ employeeId, days: -1, reason: "Correction", monthKey: "2026-11", actor });
    await expect(
      syncManualLeaveConsumption({ ...manual, attendanceRecordId: "rec-2", wantsPaid: true }),
    ).rejects.toThrow("no paid leave balance");
  });
});
