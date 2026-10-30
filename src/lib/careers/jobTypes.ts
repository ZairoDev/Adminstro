export const EMPLOYMENT_TYPES = [
  { value: "fulltime", label: "Full time" },
  { value: "parttime", label: "Part time" },
  { value: "intern", label: "Internship" },
  { value: "contract", label: "Contract" },
] as const;

export const WORK_MODES = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Work from home" },
] as const;

export type JobEmploymentType = (typeof EMPLOYMENT_TYPES)[number]["value"];
export type JobWorkMode = (typeof WORK_MODES)[number]["value"];

export function employmentTypeLabel(value: string | null | undefined): string {
  return EMPLOYMENT_TYPES.find((item) => item.value === value)?.label ?? "";
}

export function workModeLabel(value: string | null | undefined): string {
  return WORK_MODES.find((item) => item.value === value)?.label ?? "";
}
