/** Employee role options (safe to import from client components). */
export const employeeRoles = [
  "HR",
  "Admin",
  "Sales",
  "sales-intern",
  "Sales-TeamLead",
  "hSale",
  "Guest",
  "Intern",
  "Advert",
  "LeadGen",
  "LeadGen-TeamLead",
  "Content",
  "Developer",
  "Subscription-Sales",
  "HAdmin",
] as const;

export type EmployeeRole = (typeof employeeRoles)[number];
