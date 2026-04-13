import type { Organization } from "@/util/organizationConstants";

/** Default Pay Now targets when env overrides are not set (email-safe links). */
const DEFAULT_PAY_NOW_URL: Record<Organization, string> = {
  VacationSaga: "https://vacationsaga.com/subscription",
  Holidaysera: "https://holidaysera.com/subscriptions#perfect-plan",
  HousingSaga: "https://housingsaga.com/pricing",
};

function pickEnvForOrg(organization: Organization): string | undefined {
  if (organization === "VacationSaga") {
    return process.env.VACATIONSAGA_PAY_NOW_URL ?? process.env.NEXT_PUBLIC_VACATIONSAGA_PAY_NOW_URL;
  }
  if (organization === "Holidaysera") {
    return process.env.HOLIDAYSERA_PAY_NOW_URL ?? process.env.NEXT_PUBLIC_HOLIDAYSERA_PAY_NOW_URL;
  }
  return process.env.HOUSINGSAGA_PAY_NOW_URL ?? process.env.NEXT_PUBLIC_HOUSINGSAGA_PAY_NOW_URL;
}

/**
 * Resolves the Pay Now href for offer emails: optional env override, else org default, else `fallbackUrl`.
 */
export function resolvePayNowUrl(organization: Organization, fallbackUrl: string): string {
  const fromEnv = (pickEnvForOrg(organization) ?? "").trim();
  if (fromEnv.length > 0) return fromEnv;

  const fromDefault = DEFAULT_PAY_NOW_URL[organization]?.trim();
  if (fromDefault && fromDefault.length > 0) return fromDefault;

  return fallbackUrl.trim().length > 0 ? fallbackUrl : "#";
}
