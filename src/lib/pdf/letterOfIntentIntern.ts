/**
 * Internship letter content helpers (Letter of Intent API uses same PDF layout).
 */

export function resolveIsIntern(
  payloadType?: string,
  candidateEmploymentType?: string | null,
  selectionPositionType?: string | null
): boolean {
  if (payloadType === "intern") return true;
  if (candidateEmploymentType === "intern") return true;
  if (selectionPositionType === "intern") return true;
  return false;
}

/** Internship length for LOI — uses `internDuration` only (not training period or time slot). */
export function resolveInternDuration(internDuration?: string | null): string {
  const id = (internDuration || "").trim();
  return id || "______________";
}

/** PDF uses StandardFonts (WinAnsi) — use "Rs." not "₹". */
export function formatInternStipend(salary?: string | number | null): string {
  if (salary === undefined || salary === null || salary === "") {
    return "______________";
  }
  const salaryStr = String(salary).trim();
  if (salaryStr.toLowerCase().includes("per month")) {
    return salaryStr.replace(/₹/g, "Rs. ");
  }
  const numericStr = salaryStr.replace(/[₹Rs.,\s]/g, "").trim();
  const monthly = parseFloat(numericStr);
  if (!isNaN(monthly) && monthly > 0) {
    return `Rs. ${monthly.toLocaleString("en-IN")} per month`;
  }
  const normalized = salaryStr.replace(/₹/g, "Rs. ");
  return normalized.toLowerCase().includes("per month")
    ? normalized
    : `${normalized} per month`;
}

function withInternSuffix(title: string): string {
  const t = title.trim();
  if (!t) return "Intern";
  if (/\(intern\)/i.test(t)) return t;
  return `${t} (Intern)`;
}

/** LOI designation — avoid doubling "Executive" when role/department already includes it. */
export function buildInternDesignation(
  roleName: string | null,
  position: string | undefined,
  roleDepartment?: string | null
): string {
  const dept = (roleDepartment || "").trim();
  const pos = (position || "").trim();
  const role = (roleName || "").trim();

  // Roles collection department is often the full title (e.g. Business Development Executive)
  if (dept && /\bexecutive\b/i.test(dept)) {
    return withInternSuffix(dept);
  }
  if (role && /\bexecutive\b/i.test(role)) {
    return withInternSuffix(role);
  }
  if (role) {
    return withInternSuffix(`${role} Executive`);
  }
  if (pos && /\bexecutive\b/i.test(pos)) {
    return withInternSuffix(pos);
  }
  const base = pos || dept || "Human Resources";
  return withInternSuffix(base);
}

/** Role title for intern NDA appointment line (e.g. "Sales"). */
export function buildInternAppointmentRole(
  roleName: string | null,
  position?: string
): string {
  if (roleName) return roleName;
  const base = (position || "")
    .replace(/\s*\(Intern\)\s*/gi, "")
    .trim();
  return base || "Intern";
}

export function buildInternTerms(duration: string): string[] {
  return [
    `This internship is for a fixed duration of ${duration}.`,
    "Your performance will be reviewed periodically.",
    "This internship does not guarantee full-time employment; however, based on performance, you may be considered for future opportunities.",
    "You are expected to maintain confidentiality of company information during and after the internship.",
    "Either party may terminate the internship with prior notice, as per company policy.",
  ];
}
