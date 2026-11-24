import {
  addPayrollMonths,
  comparePayrollMonths,
  currentPayrollMonth,
  daysBeforeJoiningInMonth,
  daysInPayrollMonth,
  earliestPayrollMonth,
  latestOpenPayrollMonth,
  lossOfPayDeduction,
  maxLossOfPayDays,
  monthPayFromAttendance,
  parsePayrollMonth,
  payrollMonthEnd,
  payrollMonthLabel,
} from "../salary-month";
import { rupeesInWords } from "../rupees-in-words";

describe("payroll months", () => {
  it("uses the India calendar month", () => {
    const month = currentPayrollMonth(new Date("2026-10-26T18:45:00.000Z"));
    expect(month.key).toBe("2026-10");
    expect(payrollMonthLabel(month)).toBe("October 2026");
  });

  it("rejects months before the current one and keeps later months open", () => {
    const now = new Date("2026-10-26T10:00:00+05:30");
    const current = currentPayrollMonth(now);
    const previous = addPayrollMonths(current, -1);
    const next = addPayrollMonths(current, 1);
    expect(comparePayrollMonths(previous, current)).toBeLessThan(0);
    expect(comparePayrollMonths(next, current)).toBeGreaterThan(0);
    expect(parsePayrollMonth("2026-10")?.key).toBe("2026-10");
    expect(parsePayrollMonth("2026-13")).toBeNull();
    expect(latestOpenPayrollMonth(now).key).toBe("2028-04");
  });

  it("ends a month at the last instant in India", () => {
    const end = payrollMonthEnd({ year: 2026, month: 10, key: "2026-10" });
    expect(end.toISOString()).toBe("2026-10-31T18:29:59.999Z");
  });

  it("deducts loss of pay from the monthly gross", () => {
    const october = { year: 2026, month: 10, key: "2026-10" };
    expect(daysInPayrollMonth(october)).toBe(31);
    expect(lossOfPayDeduction(50000, 31, 0)).toBe(0);
    expect(lossOfPayDeduction(50000, 31, 2)).toBe(3225.81);
  });

  it("pays the month from attendance loss of pay", () => {
    const pay = monthPayFromAttendance(31000, 31, { lopDays: 2, notJoinedDays: 0 });
    expect(pay.perDaySalary).toBe(1000);
    expect(pay.payableDays).toBe(29);
    expect(pay.lossOfPayAmount).toBe(2000);
    expect(pay.payableSalary).toBe(29000);
  });

  it("does not pay days before joining", () => {
    const november = { year: 2026, month: 11, key: "2026-11" };
    expect(daysBeforeJoiningInMonth("2026-11-10T00:00:00+05:30", november)).toBe(9);
    expect(daysBeforeJoiningInMonth("2026-10-10T00:00:00+05:30", november)).toBe(0);
    const pay = monthPayFromAttendance(31000, 31, { lopDays: 1, notJoinedDays: 10 });
    expect(pay.payableDays).toBe(20);
    expect(pay.joiningDeduction).toBe(10000);
    expect(pay.payableSalary).toBe(20000);
  });

  it("caps payable salary at zero when loss of pay exceeds the month", () => {
    const pay = monthPayFromAttendance(31000, 31, { lopDays: 40, notJoinedDays: 0 });
    expect(pay.payableDays).toBe(0);
    expect(pay.payableSalary).toBe(0);
    expect(pay.lossOfPayAmount).toBe(31000);
  });

  it("keeps the last 12 months open for payroll", () => {
    const now = new Date("2026-11-24T10:00:00+05:30");
    expect(earliestPayrollMonth(now).key).toBe("2025-11");
    expect(latestOpenPayrollMonth(now).key).toBe("2028-05");
  });

  it("allows more loss of pay days than the month has, and caps the deduction at gross", () => {
    expect(maxLossOfPayDays(31)).toBeGreaterThan(31);
    // 20 unplanned days at 2 LOP each is 40 days in a 31-day month
    expect(lossOfPayDeduction(50000, 31, 40)).toBe(50000);
    // 3 unplanned days is 6 LOP days
    expect(lossOfPayDeduction(31000, 31, 6)).toBe(6000);
  });
});

describe("rupeesInWords", () => {
  it("spells whole rupees and paise in the Indian system", () => {
    expect(rupeesInWords(0)).toBe("Zero Rupees Only");
    expect(rupeesInWords(1)).toBe("One Rupee Only");
    expect(rupeesInWords(12500)).toBe("Twelve Thousand Five Hundred Rupees Only");
    expect(rupeesInWords(100000)).toBe("One Lakh Rupees Only");
    expect(rupeesInWords(10000.5)).toBe(
      "Ten Thousand Rupees and Fifty Paise Only",
    );
  });
});
