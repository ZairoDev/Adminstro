import Employee from "@/models/employee";

const TTL_MS = 5 * 60 * 1000;

let cache: { emails: string[]; expiresAt: number } | null = null;

/**
 * Cached LeadGen employee emails — changes infrequently.
 * Used by compare leads and sales/getquery.
 */
export async function getLeadGenEmployeeEmails(): Promise<string[]> {
  const now = Date.now();
  if (cache && now < cache.expiresAt) {
    return cache.emails;
  }

  const leadGenEmployees = await Employee.find({ role: "LeadGen" })
    .select("email")
    .lean();
  const emails = leadGenEmployees
    .map((emp) => emp.email)
    .filter((email): email is string => Boolean(email));

  cache = { emails, expiresAt: now + TTL_MS };
  return emails;
}
