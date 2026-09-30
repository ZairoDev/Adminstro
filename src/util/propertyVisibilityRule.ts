import Employees from "@/models/employee";
import {
  listIncludesType,
  resolveAllowedPropertyTypes,
  type PropertyTypeRules,
} from "@/util/propertyTypeAllowList";

export type PropertyVisibilityRule = {
  enabled?: boolean;
  allowedFurnishing?: string[];
  allowedTypeOfProperty?: string[];
};

export type PropertyVisibilityRules = {
  all?: PropertyVisibilityRule;
  byLocation?: Record<string, PropertyVisibilityRule>;
};

export async function loadEmployeePropertyVisibilityRule(
  employeeId: string,
): Promise<PropertyVisibilityRule | null> {
  if (!employeeId) return null;
  const emp = await Employees.findById(employeeId).select("propertyVisibilityRule").lean();
  return (emp as any)?.propertyVisibilityRule || null;
}

export async function loadEmployeePropertyVisibilityRules(
  employeeId: string,
): Promise<PropertyVisibilityRules | null> {
  if (!employeeId) return null;
  const emp = await Employees.findById(employeeId).select("propertyVisibilityRules").lean();
  return (emp as any)?.propertyVisibilityRules || null;
}

function normalizeLocationKey(location: string): string {
  return String(location).trim().toLowerCase();
}

function getRuleForLocation(
  rules: PropertyVisibilityRules | null,
  location: string,
): PropertyVisibilityRule | null {
  if (!rules) return null;
  const key = normalizeLocationKey(location);
  const byLoc = rules.byLocation || {};
  return byLoc[key] || rules.all || null;
}

export function applyPropertyVisibilityRuleToLeadQuery(params: {
  query: Record<string, any>;
  rule: PropertyVisibilityRule | null;
  uiPropertyType?: unknown;
  uiTypeOfProperty?: unknown;
  ownerAllowedTypes?: string[] | null;
}): { impossible: boolean } {
  const { query, rule, uiPropertyType, uiTypeOfProperty, ownerAllowedTypes } = params;
  if (!rule?.enabled) {
    if (uiPropertyType) query.propertyType = uiPropertyType;
    const ownerOnly = applyOwnerTypesToLeadQuery({
      query,
      ownerAllowedTypes: ownerAllowedTypes ?? null,
      uiTypeOfProperty,
    });
    if (ownerOnly.impossible) return ownerOnly;
    if (!ownerAllowedTypes && uiTypeOfProperty) query.typeOfProperty = uiTypeOfProperty;
    return { impossible: false };
  }

  const allowedFurnishing = Array.isArray(rule.allowedFurnishing)
    ? rule.allowedFurnishing.map(String).filter(Boolean)
    : [];
  const allowedTypeOfProperty = Array.isArray(rule.allowedTypeOfProperty)
    ? rule.allowedTypeOfProperty.map(String).filter(Boolean)
    : [];

  // Furnishing / propertyType intersection
  if (allowedFurnishing.length > 0) {
    if (uiPropertyType && String(uiPropertyType).trim() !== "") {
      const v = String(uiPropertyType);
      if (!allowedFurnishing.includes(v)) return { impossible: true };
      query.propertyType = v;
    } else {
      query.propertyType = { $in: allowedFurnishing };
    }
  } else {
    // No restriction from rule: still honor UI filter if provided
    if (uiPropertyType) query.propertyType = uiPropertyType;
  }

  const guestTypes = allowedTypeOfProperty.length > 0 ? allowedTypeOfProperty : null;
  const ownerTypes =
    ownerAllowedTypes && ownerAllowedTypes.length > 0 ? ownerAllowedTypes : null;
  let effectiveTypes: string[] | null = null;
  if (guestTypes && ownerTypes) {
    effectiveTypes = guestTypes.filter((type) => listIncludesType(ownerTypes, type));
    if (effectiveTypes.length === 0) return { impossible: true };
  } else {
    effectiveTypes = guestTypes || ownerTypes;
  }

  if (effectiveTypes && effectiveTypes.length > 0) {
    if (uiTypeOfProperty && String(uiTypeOfProperty).trim() !== "") {
      const v = String(uiTypeOfProperty);
      if (!listIncludesType(effectiveTypes, v)) return { impossible: true };
      query.typeOfProperty = v;
    } else {
      query.typeOfProperty = { $in: effectiveTypes };
    }
  } else if (uiTypeOfProperty) {
    query.typeOfProperty = uiTypeOfProperty;
  }

  return { impossible: false };
}

function applyOwnerTypesToLeadQuery(params: {
  query: Record<string, any>;
  ownerAllowedTypes: string[] | null;
  uiTypeOfProperty?: unknown;
}): { impossible: boolean } {
  const { query, ownerAllowedTypes, uiTypeOfProperty } = params;
  if (!ownerAllowedTypes || ownerAllowedTypes.length === 0) {
    return { impossible: false };
  }
  if (uiTypeOfProperty && String(uiTypeOfProperty).trim() !== "") {
    const v = String(uiTypeOfProperty);
    if (!listIncludesType(ownerAllowedTypes, v)) return { impossible: true };
    query.typeOfProperty = v;
    return { impossible: false };
  }
  query.typeOfProperty = { $in: ownerAllowedTypes };
  return { impossible: false };
}

export function applyPropertyVisibilityRulesByLocationToLeadQuery(params: {
  query: Record<string, any>;
  rules: PropertyVisibilityRules | null;
  locations: string[] | null;
  uiPropertyType?: unknown;
  uiTypeOfProperty?: unknown;
  ownerRules?: PropertyTypeRules | null;
}): { impossible: boolean } {
  const { query, rules, locations, uiPropertyType, uiTypeOfProperty, ownerRules } = params;

  if (!locations || locations.length === 0) {
    // Unknown/all locations: apply only global rule.
    return applyPropertyVisibilityRuleToLeadQuery({
      query,
      rule: rules?.all || null,
      uiPropertyType,
      uiTypeOfProperty,
      ownerAllowedTypes: resolveAllowedPropertyTypes(ownerRules, null),
    });
  }

  if (locations.length === 1) {
    const rule = getRuleForLocation(rules, locations[0]);
    return applyPropertyVisibilityRuleToLeadQuery({
      query,
      rule,
      uiPropertyType,
      uiTypeOfProperty,
      ownerAllowedTypes: resolveAllowedPropertyTypes(ownerRules, locations[0]),
    });
  }

  const locationClauses: Record<string, any>[] = [];
  for (const loc of locations) {
    const rule = getRuleForLocation(rules, loc);
    // Build a clause that restricts location and (optionally) furnishing/type based on rule+UI.
    const clause: Record<string, any> = {
      location: new RegExp(`^${String(loc).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    };

    // We'll re-use the single-rule applier on a temp object and then merge.
    const temp: Record<string, any> = {};
    const { impossible } = applyPropertyVisibilityRuleToLeadQuery({
      query: temp,
      rule,
      uiPropertyType,
      uiTypeOfProperty,
      ownerAllowedTypes: resolveAllowedPropertyTypes(ownerRules, loc),
    });
    if (impossible) continue;
    Object.assign(clause, temp);
    locationClauses.push(clause);
  }

  if (locationClauses.length === 0) return { impossible: true };

  if ("location" in query) {
    delete query.location;
  }
  const andList = Array.isArray(query.$and) ? query.$and : [];
  query.$and = [...andList, { $or: locationClauses }];
  return { impossible: false };
}

