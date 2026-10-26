import {
  addPayrollMonths,
  comparePayrollMonths,
  currentPayrollMonth,
  daysInPayrollMonth,
  latestOpenPayrollMonth,
  lossOfPayDeduction,
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
