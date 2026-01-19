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
      return "bg-green-100 text-green-800";
    case "shortlisted":
      return "bg-blue-100 text-blue-800";
    case "interview":
      return "bg-purple-100 text-purple-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "onboarding":
      return "bg-purple-100 text-purple-800";
    case "pending":
    default:
      return "bg-yellow-100 text-yellow-800";
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

