/**
 * Canonical onboarding document keys and labels.
 * Keep save, verify, re-upload, and UI lists in sync from this module.
 */

export const ONBOARDING_FILE_DOCUMENT_KEYS = [
  "aadharCard",
  "aadharCardFront",
  "aadharCardBack",
  "panCard",
  "cancelledCheque",
  "passbookPhoto",
  "highSchoolMarksheet",
  "interMarksheet",
  "graduationMarksheet",
  "experienceLetter",
  "relievingLetter",
  "salarySlips",
] as const;

export const ONBOARDING_REUPLOAD_DOCUMENT_KEYS = [
  "aadharCardFront",
  "aadharCardBack",
  "panCard",
  "cancelledCheque",
  "passbookPhoto",
  "highSchoolMarksheet",
  "interMarksheet",
  "graduationMarksheet",
  "experienceLetter",
  "relievingLetter",
  "salarySlips",
] as const;

export const ONBOARDING_VERIFIABLE_DOCUMENT_KEYS = [
  ...ONBOARDING_FILE_DOCUMENT_KEYS,
  "sign",
] as const;

export const ONBOARDING_REQUIRED_FILE_DOCUMENT_KEYS = [
  "aadharCardFront",
  "aadharCardBack",
  "panCard",
  "cancelledCheque",
  "highSchoolMarksheet",
  "interMarksheet",
  "graduationMarksheet",
] as const;

export type OnboardingFileDocumentKey =
  (typeof ONBOARDING_FILE_DOCUMENT_KEYS)[number];

export type OnboardingReuploadDocumentKey =
  (typeof ONBOARDING_REUPLOAD_DOCUMENT_KEYS)[number];

export type OnboardingVerifiableDocumentKey =
  (typeof ONBOARDING_VERIFIABLE_DOCUMENT_KEYS)[number];

export const ONBOARDING_DOCUMENT_LABELS: Record<string, string> = {
  aadharCard: "Aadhaar Card",
  aadharCardFront: "Aadhaar Card - Front",
  aadharCardBack: "Aadhaar Card - Back",
  panCard: "PAN Card",
  cancelledCheque: "Cancelled Cheque",
  passbookPhoto: "Passbook photo",
  highSchoolMarksheet: "High School Marksheet",
  interMarksheet: "Intermediate Marksheet",
  graduationMarksheet: "Graduation Marksheet",
  experienceLetter: "Experience Letter",
  relievingLetter: "Relieving Letter",
  salarySlips: "Salary Slips",
  sign: "Digital Signature",
};

export function isOnboardingReuploadDocumentKey(
  value: string
): value is OnboardingReuploadDocumentKey {
  return (ONBOARDING_REUPLOAD_DOCUMENT_KEYS as readonly string[]).includes(
    value
  );
}

export function isOnboardingVerifiableDocumentKey(
  value: string
): value is OnboardingVerifiableDocumentKey {
  return (ONBOARDING_VERIFIABLE_DOCUMENT_KEYS as readonly string[]).includes(
    value
  );
}

export function getOnboardingDocumentLabel(key: string): string {
  return ONBOARDING_DOCUMENT_LABELS[key] || key;
}

export type OnboardingBankDetailsValue = {
  hasBankAccount: boolean;
  accountHolderName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  bankName: string | null;
};

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOnboardingBankDetails(
  raw: Record<string, unknown> | null | undefined
): OnboardingBankDetailsValue {
  const hasBankAccount = raw?.hasBankAccount !== false && raw?.hasBankAccount !== "false";
  if (!hasBankAccount) {
    return {
      hasBankAccount: false,
      accountHolderName: null,
      accountNumber: null,
      ifscCode: null,
      bankName: null,
    };
  }

  return {
    hasBankAccount: true,
    accountHolderName: asTrimmedString(raw?.accountHolderName) || null,
    accountNumber: asTrimmedString(raw?.accountNumber) || null,
    ifscCode: asTrimmedString(raw?.ifscCode)?.toUpperCase() || null,
    bankName: asTrimmedString(raw?.bankName) || null,
  };
}

export function isCompleteOnboardingBankDetails(
  bank: OnboardingBankDetailsValue
): boolean {
  if (!bank.hasBankAccount) return true;
  return Boolean(
    bank.accountHolderName &&
      bank.accountNumber &&
      bank.ifscCode &&
      bank.bankName
  );
}
