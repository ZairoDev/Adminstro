import {
  buildSalaryAnnexure,
  ctcInWords,
  formatAnnexureInr,
  salaryAnnexureFormNumber,
} from "../salary-annexure";

describe("buildSalaryAnnexure", () => {
  it("matches the five-lakh annexure, monthly and yearly", () => {
    const annexure = buildSalaryAnnexure(500000);

    expect(formatAnnexureInr(annexure.basic.monthlyPaise)).toBe("20,833.33");
    expect(formatAnnexureInr(annexure.basic.yearlyPaise)).toBe("2,50,000");
    expect(formatAnnexureInr(annexure.houseRentAllowance.monthlyPaise)).toBe("10,416.67");
    expect(formatAnnexureInr(annexure.houseRentAllowance.yearlyPaise)).toBe("1,25,000");
    expect(formatAnnexureInr(annexure.cityCompensatoryAllowance.monthlyPaise)).toBe("5,000");
    expect(formatAnnexureInr(annexure.cityCompensatoryAllowance.yearlyPaise)).toBe("60,000");
    expect(formatAnnexureInr(annexure.gradeAllowance.monthlyPaise)).toBe("3,000");
    expect(formatAnnexureInr(annexure.gradeAllowance.yearlyPaise)).toBe("36,000");
    expect(formatAnnexureInr(annexure.otherAllowance.monthlyPaise)).toBe("2,416.67");
    expect(formatAnnexureInr(annexure.otherAllowance.yearlyPaise)).toBe("29,000");
    expect(formatAnnexureInr(annexure.emoluments.monthlyPaise)).toBe("41,666.67");
    expect(formatAnnexureInr(annexure.emoluments.yearlyPaise)).toBe("5,00,000");
    expect(annexure.takeHome).toEqual(annexure.emoluments);
    expect(annexure.totalCtc).toEqual(annexure.emoluments);
  });

  it("keeps yearly parts equal to CTC and monthly parts equal to CTC divided by twelve", () => {
    for (const ctc of [252000, 333333, 840000, 1250000.5]) {
      const annexure = buildSalaryAnnexure(ctc);
      const yearly =
        annexure.basic.yearlyPaise +
        annexure.houseRentAllowance.yearlyPaise +
        annexure.cityCompensatoryAllowance.yearlyPaise +
        annexure.gradeAllowance.yearlyPaise +
        annexure.otherAllowance.yearlyPaise;
      const monthly =
        annexure.basic.monthlyPaise +
        annexure.houseRentAllowance.monthlyPaise +
        annexure.cityCompensatoryAllowance.monthlyPaise +
        annexure.gradeAllowance.monthlyPaise +
        annexure.otherAllowance.monthlyPaise;
      expect(yearly).toBe(annexure.annualCtcPaise);
      expect(monthly).toBe(annexure.emoluments.monthlyPaise);
      expect(annexure.otherAllowance.yearlyPaise).toBeGreaterThanOrEqual(0);
      expect(annexure.otherAllowance.monthlyPaise).toBeGreaterThanOrEqual(0);
    }
  });

  it("fixes basic at half of annual CTC", () => {
    const annexure = buildSalaryAnnexure(840000);
    expect(annexure.basic.yearlyPaise).toBe(annexure.annualCtcPaise / 2);
  });

  it("rejects a CTC that is not a positive number", () => {
    expect(() => buildSalaryAnnexure(0)).toThrow(/positive/);
    expect(() => buildSalaryAnnexure(-500000)).toThrow(/positive/);
  });
});

describe("ctcInWords", () => {
  it("phrases a whole-rupee CTC the way the annexure note does", () => {
    expect(ctcInWords(50000000)).toBe("Rupees Five Lakh Only");
  });
});

describe("salaryAnnexureFormNumber", () => {
  it("uses the issue year and the end of the candidate id", () => {
    expect(salaryAnnexureFormNumber("64ab12cd90ef3456aa11bb22", new Date("2026-11-16T00:00:00.000Z"))).toBe(
      "SA-2026-11BB22",
    );
  });
});
