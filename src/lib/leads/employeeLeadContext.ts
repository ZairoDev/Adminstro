import Employees from "@/models/employee";
import {
  resolveEmployeeRentalType,
  type EmployeeRentalType,
} from "@/util/employeeRentalTypeAccess";
import type { PricingRules } from "@/util/pricingRule";
import type { PropertyVisibilityRules } from "@/util/propertyVisibilityRule";

export type GuestLeadLocationBlock = {
  all?: string[];
};

export interface EmployeeLeadContext {
  pricingRules: PricingRules | null;
  propertyVisibilityRules: PropertyVisibilityRules | null;
  guestLeadLocationBlock: GuestLeadLocationBlock | null;
  rentalType: EmployeeRentalType | null;
}

const EMPTY_CONTEXT: EmployeeLeadContext = {
  pricingRules: null,
  propertyVisibilityRules: null,
  guestLeadLocationBlock: null,
  rentalType: null,
};

/**
 * Single projected employee read for lead list APIs.
 * Replaces 3–4 separate findById calls per request.
 */
export async function loadEmployeeLeadContext(
  employeeId: string,
  tokenRentalType?: unknown,
): Promise<EmployeeLeadContext> {
  if (!employeeId) {
    return {
      ...EMPTY_CONTEXT,
      rentalType: resolveEmployeeRentalType(tokenRentalType, null),
    };
  }

  const emp = await Employees.findById(employeeId)
    .select(
      "pricingRules propertyVisibilityRules guestLeadLocationBlock rentalType",
    )
    .lean();

  const doc = emp as {
    pricingRules?: PricingRules;
    propertyVisibilityRules?: PropertyVisibilityRules;
    guestLeadLocationBlock?: GuestLeadLocationBlock;
    rentalType?: unknown;
  } | null;

  return {
    pricingRules: doc?.pricingRules ?? null,
    propertyVisibilityRules: doc?.propertyVisibilityRules ?? null,
    guestLeadLocationBlock: doc?.guestLeadLocationBlock ?? null,
    rentalType: resolveEmployeeRentalType(tokenRentalType, doc?.rentalType),
  };
}

export function getBlockedLeadLocations(
  guestLeadLocationBlock: GuestLeadLocationBlock | null | undefined,
): Set<string> {
  return new Set(
    Array.isArray(guestLeadLocationBlock?.all)
      ? guestLeadLocationBlock.all.map(String)
      : [],
  );
}
