import Employees from "@/models/employee";
import {
  resolveEmployeeRentalType,
  type EmployeeRentalType,
} from "@/util/employeeRentalTypeAccess";
import type { PricingRules } from "@/util/pricingRule";
import type { PropertyVisibilityRules } from "@/util/propertyVisibilityRule";
import {
  ownerRulesForRole,
  type PropertyTypeRules,
} from "@/util/propertyTypeAllowList";

export type GuestLeadLocationBlock = {
  all?: string[];
};

export interface EmployeeLeadContext {
  pricingRules: PricingRules | null;
  propertyVisibilityRules: PropertyVisibilityRules | null;
  ownerPropertyTypeVisibilityRules: PropertyTypeRules | null;
  guestLeadLocationBlock: GuestLeadLocationBlock | null;
  rentalType: EmployeeRentalType | null;
}

const EMPTY_CONTEXT: EmployeeLeadContext = {
  pricingRules: null,
  propertyVisibilityRules: null,
  ownerPropertyTypeVisibilityRules: null,
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
      "pricingRules propertyVisibilityRules ownerPropertyTypeVisibilityRules guestLeadLocationBlock rentalType",
    )
    .lean();

  const doc = emp as {
    pricingRules?: PricingRules;
    propertyVisibilityRules?: PropertyVisibilityRules;
    ownerPropertyTypeVisibilityRules?: PropertyTypeRules;
    guestLeadLocationBlock?: GuestLeadLocationBlock;
    rentalType?: unknown;
  } | null;

  return {
    pricingRules: doc?.pricingRules ?? null,
    propertyVisibilityRules: doc?.propertyVisibilityRules ?? null,
    ownerPropertyTypeVisibilityRules: doc?.ownerPropertyTypeVisibilityRules ?? null,
    guestLeadLocationBlock: doc?.guestLeadLocationBlock ?? null,
    rentalType: resolveEmployeeRentalType(tokenRentalType, doc?.rentalType),
  };
}

export function ownerPropertyTypeRulesForToken(
  role: string | undefined,
  rules: PropertyTypeRules | null | undefined,
): PropertyTypeRules | null {
  return ownerRulesForRole(role, rules);
}

export async function loadOwnerPropertyTypeRules(
  employeeId: string,
): Promise<PropertyTypeRules | null> {
  if (!employeeId) return null;
  const emp = await Employees.findById(employeeId)
    .select("ownerPropertyTypeVisibilityRules")
    .lean<{ ownerPropertyTypeVisibilityRules?: PropertyTypeRules } | null>();
  return emp?.ownerPropertyTypeVisibilityRules ?? null;
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
