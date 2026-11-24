import { salarySheetMoney, sheetDay } from "../salary-sheet";
import type { AttendancePay } from "../salary-month";

const novemberPay = (overrides: Partial<AttendancePay> = {}): AttendancePay => ({
  totalDays: 30,
  notJoinedDays: 0,
  lopDays: 0,
  payableDays: 30,
  perDaySalary: 1000,
  lossOfPayAmount: 0,
  joiningDeduction: 0,
  payableSalary: 30000,
  ...overrides,
});

describe("salary sheet money", () => {
  it("splits the attendance-adjusted salary and pays the full amount when nothing else is entered", () => {
    const money = salarySheetMoney(30000, novemberPay(), {
      pf: 0,
      incentive: 0,
      casual: 0,
      cash: 0,
      advance: 0,
      hold: 0,
    });
    expect(money.finalSalary).toBe(30000);
    expect(money.gross).toBe(30000);
    expect(money.earnedNet).toBe(30000);
    expect(money.basic + money.hra + money.conveyance + money.medical + money.specialAllowance).toBe(30000);
    expect(money.basic).toBe(15000);
    expect(money.hra).toBe(6000);
    expect(money.bank).toBe(30000);
    expect(money.amount).toBe(30000);
  });

  it("takes PF, advance and hold off, and adds incentive and casual", () => {
    const money = salarySheetMoney(
      31000,
      novemberPay({
        totalDays: 31,
        lopDays: 1,
        payableDays: 30,
        perDaySalary: 1000,
        lossOfPayAmount: 1000,
        payableSalary: 30000,
      }),
      { pf: 1800, incentive: 500, casual: 200, cash: 4000, advance: 1000, hold: 900 },
    );
    expect(money.finalSalary).toBe(30000);
    expect(money.gross).toBe(30000);
    expect(money.total).toBe(28900);
    expect(money.earnedNet).toBe(28900);
    expect(money.bank).toBe(24900);
    expect(money.net).toBe(23900);
    expect(money.amount).toBe(23000);
  });
});

describe("salary sheet day marks", () => {
  it("uses the attendance letters from the payroll sheet", () => {
    expect(
      sheetDay({
        date: "2026-11-02",
        status: "present",
        isLate: false,
        leaveCategory: null,
        leavePay: null,
        isFuture: false,
      }).letter,
    ).toBe("P");
    expect(
      sheetDay({
        date: "2026-11-03",
        status: "on_leave",
        isLate: false,
        leaveCategory: "unplanned",
        leavePay: "unpaid",
        isFuture: false,
      }),
    ).toMatchObject({ letter: "UL", tone: "uninformed" });
    expect(
      sheetDay({
        date: "2026-11-04",
        status: "on_leave",
        isLate: false,
        leaveCategory: "planned",
        leavePay: "paid",
        isFuture: false,
      }),
    ).toMatchObject({ letter: "PL", tone: "paid" });
    expect(
      sheetDay({
        date: "2026-11-08",
        status: "weekly_off",
        isLate: false,
        leaveCategory: null,
        leavePay: null,
        isFuture: false,
      }).letter,
    ).toBe("WO");
  });
});
