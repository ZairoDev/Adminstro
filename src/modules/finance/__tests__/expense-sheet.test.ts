import {
  amountForMonth,
  baseAmountForMonth,
  buildExpenseRegister,
  changeFromPrevious,
  expenseRegisterCsv,
  expenseSheetCsv,
  filterExpenseLines,
  previousMonthKey,
  recurringAppliesToMonth,
  reviseAmountHistory,
  summarizeExpenses,
  type ExpenseLine,
  type RecurringDefinition,
} from "../expense-sheet";

const monthly: RecurringDefinition = {
  frequency: "monthly",
  startMonth: "2026-03",
  endMonth: null,
  isActive: true,
};

function line(overrides: Partial<ExpenseLine> = {}): ExpenseLine {
  return {
    id: "1",
    source: "oneOff",
    title: "Item",
    category: "Office",
    vendor: "",
    notes: "",
    amount: 100,
    status: "pending",
    paidOn: null,
    frequency: null,
    startMonth: null,
    endMonth: null,
    skipped: false,
    baseAmount: 100,
    overridden: false,
    invoiceUrl: null,
    invoiceName: null,
    ...overrides,
  };
}

describe("recurringAppliesToMonth", () => {
  it("starts on the start month and never before", () => {
    expect(recurringAppliesToMonth(monthly, "2026-02")).toBe(false);
    expect(recurringAppliesToMonth(monthly, "2026-03")).toBe(true);
    expect(recurringAppliesToMonth(monthly, "2027-11")).toBe(true);
  });

  it("stops after the end month", () => {
    const ended = { ...monthly, endMonth: "2026-06" };
    expect(recurringAppliesToMonth(ended, "2026-06")).toBe(true);
    expect(recurringAppliesToMonth(ended, "2026-07")).toBe(false);
  });

  it("repeats quarterly and yearly from the start month", () => {
    const quarterly = { ...monthly, frequency: "quarterly" as const };
    expect(["2026-03", "2026-04", "2026-06", "2026-09", "2026-12"].map((m) => recurringAppliesToMonth(quarterly, m))).toEqual([
      true,
      false,
      true,
      true,
      true,
    ]);
    const yearly = { ...monthly, frequency: "yearly" as const };
    expect(recurringAppliesToMonth(yearly, "2027-03")).toBe(true);
    expect(recurringAppliesToMonth(yearly, "2027-04")).toBe(false);
  });

  it("never applies when inactive", () => {
    expect(recurringAppliesToMonth({ ...monthly, isActive: false }, "2026-05")).toBe(false);
  });
});

describe("recurring amounts", () => {
  const history = reviseAmountHistory([{ fromMonth: "2026-03", amount: 10000 }], "2026-08", 12000);

  it("keeps earlier months at the old amount when revised from a month onward", () => {
    expect(baseAmountForMonth(history, "2026-07")).toBe(10000);
    expect(baseAmountForMonth(history, "2026-08")).toBe(12000);
    expect(baseAmountForMonth(history, "2027-01")).toBe(12000);
  });

  it("drops later revisions when a revision is set earlier", () => {
    const revised = reviseAmountHistory(history, "2026-05", 11000);
    expect(revised).toEqual([
      { fromMonth: "2026-03", amount: 10000 },
      { fromMonth: "2026-05", amount: 11000 },
    ]);
  });

  it("prefers a month override over the base amount", () => {
    expect(amountForMonth(history, 500, "2026-09")).toBe(500);
    expect(amountForMonth(history, 0, "2026-09")).toBe(0);
    expect(amountForMonth(history, null, "2026-09")).toBe(12000);
  });
});

describe("previousMonthKey", () => {
  it("rolls back across a year", () => {
    expect(previousMonthKey("2026-01")).toBe("2025-12");
    expect(previousMonthKey("2026-11")).toBe("2026-10");
  });
});

describe("summarizeExpenses", () => {
  it("totals salaries, recurring and one-off and ignores skipped lines", () => {
    const totals = summarizeExpenses(50000, [
      line({ id: "a", source: "recurring", category: "Rent", amount: 20000, status: "paid" }),
      line({ id: "b", source: "recurring", category: "Software", amount: 3000, skipped: true }),
      line({ id: "c", category: "Office", amount: 1500.5 }),
    ]);
    expect(totals).toMatchObject({
      salaries: 50000,
      recurring: 20000,
      oneOff: 1500.5,
      total: 71500.5,
      paid: 20000,
      pending: 1500.5,
    });
    expect(totals.categories).toEqual([
      { category: "Salaries", amount: 50000 },
      { category: "Rent", amount: 20000 },
      { category: "Office", amount: 1500.5 },
    ]);
  });

  it("reports the change from last month", () => {
    expect(changeFromPrevious(110, 100)).toEqual({ amount: 10, percent: 10 });
    expect(changeFromPrevious(50, 0)).toEqual({ amount: 50, percent: null });
  });
});

describe("filterExpenseLines", () => {
  const lines = [
    line({ id: "1", title: "Office rent", category: "Rent", vendor: "Landlord" }),
    line({ id: "2", title: "Slack", category: "Software", status: "paid" }),
  ];

  it("filters by search, category and status", () => {
    expect(filterExpenseLines(lines, { search: "landlord", category: "all", status: "all" })).toHaveLength(1);
    expect(filterExpenseLines(lines, { search: "", category: "Software", status: "all" })).toHaveLength(1);
    expect(filterExpenseLines(lines, { search: "", category: "all", status: "paid" })[0]?.id).toBe("2");
  });
});

describe("buildExpenseRegister", () => {
  it("lists every salary and leaves skipped expenses out of the month total", () => {
    const register = buildExpenseRegister({
      month: "2026-11",
      monthLabel: "November 2026",
      salaries: [
        {
          id: "b",
          name: "Bina",
          employeeCode: "E2",
          role: "Sales",
          basic: 500,
          hra: 200,
          conveyance: 40,
          medical: 20,
          specialAllowance: 240,
          gross: 1000,
          pf: 100,
          additions: 50,
          deductions: 0,
          amount: 950,
        },
        {
          id: "a",
          name: "Asha",
          employeeCode: null,
          role: "HR",
          basic: 250,
          hra: 100,
          conveyance: 20,
          medical: 10,
          specialAllowance: 120,
          gross: 500,
          pf: 0,
          additions: 0,
          deductions: 0,
          amount: 500,
        },
      ],
      lines: [
        line({ id: "rent", source: "recurring", title: "Rent", frequency: "monthly", amount: 800, status: "paid" }),
        line({ id: "ads", title: "Ads", amount: 80, skipped: true }),
      ],
    });

    expect(register.salaries.map((salary) => salary.name)).toEqual(["Asha", "Bina"]);
    expect(register.expenses[1]?.status).toBe("skipped");
    expect(register.totals.salaries).toBe(1450);
    expect(register.totals.expenses).toBe(800);
    expect(register.totals.paid).toBe(800);
    expect(register.totals.pending).toBe(0);
    expect(register.totals.grandTotal).toBe(2250);

    const csv = expenseRegisterCsv(register);
    expect(csv.split("\n")[0]).toContain("Basic,HRA");
    expect(csv).toContain("Asha");
    expect(csv).toContain("Made");
    expect(csv).toContain("skipped");
  });
});

describe("expenseSheetCsv", () => {
  it("writes the salary row first and escapes commas and quotes", () => {
    const csv = expenseSheetCsv({
      monthLabel: "November 2026",
      salary: { total: 90000, employeeCount: 3, employees: [] },
      lines: [line({ title: 'Rent, "HQ"', amount: 20000, source: "recurring", frequency: "monthly" })],
    });
    const rows = csv.split("\n");
    expect(rows[0]).toContain("Type,Item");
    expect(rows[1]).toContain("Salaries (3 employees)");
    expect(rows[2]).toContain('"Rent, ""HQ"""');
    expect(rows[2]).toContain("Every month");
  });
});
