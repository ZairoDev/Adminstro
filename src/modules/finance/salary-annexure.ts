import { rupeesInWords } from "@/modules/finance/rupees-in-words";

const PAISE_PER_RUPEE = 100;

/**
 * Shares of annual CTC used on the offer-letter salary annexure.
 * Basic is fixed at 50%. The remaining half is split across HRA, city
 * compensatory allowance, grade allowance, and other allowance.
 * Other allowance absorbs rounding so the yearly parts equal the CTC.
 */
const BASIC_SHARE = 50 / 100;
const HRA_SHARE = 25 / 100;
const CITY_COMPENSATORY_SHARE = 12 / 100;
const GRADE_ALLOWANCE_SHARE = 72 / 1000;

export type AnnexureAmount = {
  monthlyPaise: number;
  yearlyPaise: number;
};

export type SalaryAnnexure = {
  annualCtcPaise: number;
  basic: AnnexureAmount;
  houseRentAllowance: AnnexureAmount;
  cityCompensatoryAllowance: AnnexureAmount;
  gradeAllowance: AnnexureAmount;
  otherAllowance: AnnexureAmount;
  emoluments: AnnexureAmount;
  takeHome: AnnexureAmount;
  totalCtc: AnnexureAmount;
};

function yearlyShare(annualPaise: number, share: number): number {
  return Math.round(annualPaise * share);
}

function monthlyFromYearly(yearlyPaise: number): number {
  return Math.round(yearlyPaise / 12);
}

function amount(yearlyPaise: number, monthlyPaise = monthlyFromYearly(yearlyPaise)): AnnexureAmount {
  return { yearlyPaise, monthlyPaise };
}

export function buildSalaryAnnexure(annualCtcRupees: number): SalaryAnnexure {
  if (!Number.isFinite(annualCtcRupees) || annualCtcRupees <= 0) {
    throw new Error("Annual CTC must be a positive number");
  }

  const annualPaise = Math.round(annualCtcRupees * PAISE_PER_RUPEE);
  const basic = yearlyShare(annualPaise, BASIC_SHARE);
  const houseRent = yearlyShare(annualPaise, HRA_SHARE);
  const cityCompensatory = yearlyShare(annualPaise, CITY_COMPENSATORY_SHARE);
  let grade = yearlyShare(annualPaise, GRADE_ALLOWANCE_SHARE);
  let other = annualPaise - basic - houseRent - cityCompensatory - grade;

  if (other < 0) {
    const recover = Math.min(grade, -other);
    grade -= recover;
    other += recover;
  }
  if (other < 0) {
    throw new Error("Salary components exceed annual CTC");
  }

  const basicMonthly = monthlyFromYearly(basic);
  const houseRentMonthly = monthlyFromYearly(houseRent);
  const cityMonthly = monthlyFromYearly(cityCompensatory);
  const gradeMonthly = monthlyFromYearly(grade);
  let otherMonthly = monthlyFromYearly(other);
  const monthlyGross = monthlyFromYearly(annualPaise);
  otherMonthly += monthlyGross - (basicMonthly + houseRentMonthly + cityMonthly + gradeMonthly + otherMonthly);

  const emoluments = amount(annualPaise, monthlyGross);

  return {
    annualCtcPaise: annualPaise,
    basic: amount(basic, basicMonthly),
    houseRentAllowance: amount(houseRent, houseRentMonthly),
    cityCompensatoryAllowance: amount(cityCompensatory, cityMonthly),
    gradeAllowance: amount(grade, gradeMonthly),
    otherAllowance: amount(other, otherMonthly),
    emoluments,
    takeHome: emoluments,
    totalCtc: emoluments,
  };
}

export function formatAnnexureInr(paise: number): string {
  const negative = paise < 0;
  const absolute = Math.abs(Math.round(paise));
  const rupees = Math.floor(absolute / PAISE_PER_RUPEE);
  const fraction = absolute % PAISE_PER_RUPEE;
  const digits = String(rupees);
  const grouped =
    digits.length <= 3
      ? digits
      : `${digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${digits.slice(-3)}`;
  const body = fraction === 0 ? grouped : `${grouped}.${String(fraction).padStart(2, "0")}`;
  return negative ? `-${body}` : body;
}

/** "Rupees Five Lakh Only" for a whole-rupee CTC. */
export function ctcInWords(annualPaise: number): string {
  const words = rupeesInWords(annualPaise / PAISE_PER_RUPEE);
  if (annualPaise % PAISE_PER_RUPEE !== 0) return words;
  const core = words.replace(/ Rupees Only$/, "").replace(/ Rupee Only$/, "");
  return `Rupees ${core} Only`;
}

export function salaryAnnexureFormNumber(candidateId: string | undefined, issuedOn: Date): string {
  const year = issuedOn.getFullYear();
  const suffix = (candidateId || "OL").replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "OL";
  return `SA-${year}-${suffix}`;
}
