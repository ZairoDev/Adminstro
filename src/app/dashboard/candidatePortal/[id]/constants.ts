export type EmploymentType = "fulltime" | "intern";

export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: "fulltime", label: "Full Time" },
  { value: "intern", label: "Intern" },
];

export function formatEmploymentType(type?: string | null): string {
  if (type === "fulltime") return "Full Time";
  if (type === "intern") return "Intern";
  return "—";
}

export const ROLE_OPTIONS = [
  "Developer",
  "LeadGen",
  "Sales",
  "Marketing",
  "HR",
] as const;

export const getStatusColor = (status: string) => {
  switch (status) {
    case "selected":
      return "border-transparent bg-[#e5f6eb] text-[#0d5c2e] hover:bg-[#e5f6eb] dark:bg-[#062816] dark:text-[#7ddea0] dark:hover:bg-[#062816]";
    case "shortlisted":
      return "border-transparent bg-[#e5f6fb] text-[#0b4f6c] hover:bg-[#e5f6fb] dark:bg-[#062833] dark:text-[#7ee0f2] dark:hover:bg-[#062833]";
    case "interview":
      return "border-transparent bg-[#e7f1ff] text-[#0a3d7a] hover:bg-[#e7f1ff] dark:bg-[#0a2540] dark:text-[#8ecaff] dark:hover:bg-[#0a2540]";
    case "rejected":
      return "border-transparent bg-[#fdecec] text-[#8b1e1e] hover:bg-[#fdecec] dark:bg-[#3a1010] dark:text-[#ffb4b4] dark:hover:bg-[#3a1010]";
    case "onboarding":
      return "border-transparent bg-[#f0ebff] text-[#3b2a7a] hover:bg-[#f0ebff] dark:bg-[#1c1433] dark:text-[#c9b8ff] dark:hover:bg-[#1c1433]";
    case "pending":
    default:
      return "border-transparent bg-[#fff4d4] text-[#7a4e00] hover:bg-[#fff4d4] dark:bg-[#3a2a08] dark:text-[#ffd60a] dark:hover:bg-[#3a2a08]";
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case "selected":
      return "Selected for Training";
    case "interview":
      return "Interview";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export function getCandidateStatusLabel(
  status: string,
  rejectionCategory?: string | null
): string {
  if (status === "rejected" && rejectionCategory === "onboarding") {
    return "Rejected from onboarding";
  }
  if (status === "rejected" && rejectionCategory === "training") {
    return "Rejected after training";
  }
  return getStatusLabel(status);
}

