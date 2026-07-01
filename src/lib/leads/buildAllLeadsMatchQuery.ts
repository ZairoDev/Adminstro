import {
  addHours,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  subDays,
} from "date-fns";

import { applyEmployeeRentalTypeLeadFilter } from "@/lib/enforceEmployeeRentalType";
import {
  getBlockedLeadLocations,
  loadEmployeeLeadContext,
  type EmployeeLeadContext,
} from "@/lib/leads/employeeLeadContext";
import {
  ALL_LEADS_LOCATION_EXEMPT_ROLES,
  parseAssignedAreasFromToken,
  resolveEffectiveLeadLocations,
} from "@/util/guestLeadLocationScope";
import { exactCaseInsensitiveRegex } from "@/util/regex";
import { applyPricingRulesByLocationToQuery } from "@/util/pricingRule";
import { applyPropertyVisibilityRulesByLocationToLeadQuery } from "@/util/propertyVisibilityRule";

function convertToIST(date: Date): Date {
  return addHours(date, 5.5);
}

function getISTStartOfDay(date: Date): Date {
  const istDate = convertToIST(date);
  return setMilliseconds(setSeconds(setMinutes(setHours(istDate, 0), 0), 0), 0);
}

export interface AllLeadsFilterInput {
  searchType?: string;
  searchTerm?: string;
  dateFilter?: string;
  customDays?: string | number;
  fromDate?: string;
  toDate?: string;
  guest?: string;
  noOfBeds?: string;
  propertyType?: string;
  billStatus?: string;
  budgetFrom?: string;
  budgetTo?: string;
  leadQuality?: string;
  allotedArea?: string;
  typeOfProperty?: string;
  salesPriority?: string;
}

export type AllLeadsQueryBuildResult =
  | { ok: true; query: Record<string, unknown>; employeeContext: EmployeeLeadContext }
  | { ok: false; emptyResponse: { data: []; totalPages: number; totalQueries: number } };

export async function buildAllLeadsMatchQuery(params: {
  token: Record<string, unknown>;
  filters: AllLeadsFilterInput;
  forcedSalesPriority?: string;
}): Promise<AllLeadsQueryBuildResult> {
  const { token, filters, forcedSalesPriority } = params;
  const assignedArea = (
    Array.isArray(token.allotedArea)
      ? token.allotedArea.map((a) => String(a))
      : token.allotedArea
        ? [String(token.allotedArea)]
        : []
  ) as string[];
  const role = String(token.role || "");

  const employeeId = String(token.id || "");
  const employeeContext = await loadEmployeeLeadContext(
    employeeId,
    token.rentalType as string | undefined,
  );

  const {
    searchType = "phoneNo",
    searchTerm = "",
    dateFilter = "all",
    customDays = "0",
    fromDate,
    toDate,
    guest,
    noOfBeds,
    propertyType,
    billStatus,
    budgetFrom,
    budgetTo,
    leadQuality,
    allotedArea,
    typeOfProperty,
    salesPriority,
  } = filters;

  const regex = new RegExp(searchTerm, "i");
  let query: Record<string, unknown> = {};

  if (searchTerm) {
    if (searchType === "phoneNo") {
      query.phoneNo = new RegExp(String(searchTerm), "i");
    } else {
      query[searchType] = regex;
    }
  }

  let dateQuery: Record<string, unknown> = {};
  const istToday = getISTStartOfDay(new Date());
  const istYesterday = getISTStartOfDay(subDays(new Date(), 1));
  const customDaysNum = Number(customDays) || 0;

  switch (dateFilter) {
    case "Today":
      dateQuery = {
        createdAt: {
          $gte: new Date(istToday.toISOString()),
          $lt: new Date(addHours(istToday, 24).toISOString()),
        },
      };
      break;
    case "Yesterday":
      dateQuery = {
        createdAt: {
          $gte: new Date(istYesterday.toISOString()),
          $lt: new Date(istToday.toISOString()),
        },
      };
      break;
    case "Last X Days":
      if (customDaysNum > 0) {
        const pastDate = getISTStartOfDay(subDays(new Date(), customDaysNum));
        dateQuery = {
          createdAt: { $gte: new Date(pastDate.toISOString()) },
        };
      }
      break;
    case "Custom Date Range":
      if (fromDate && toDate) {
        const istStartDate = getISTStartOfDay(new Date(fromDate));
        const istEndDate = getISTStartOfDay(addHours(new Date(toDate), 24));
        dateQuery = {
          createdAt: {
            $gte: new Date(istStartDate.toISOString()),
            $lt: new Date(istEndDate.toISOString()),
          },
        };
      }
      break;
    default:
      break;
  }

  query = { ...query, ...dateQuery };

  if (guest) query.guest = { $gte: parseInt(guest, 10) };
  if (noOfBeds) {
    query.noOfBeds =
      noOfBeds === "0"
        ? { $gte: parseInt(noOfBeds, 10) }
        : parseInt(noOfBeds, 10);
  }
  if (billStatus) query.billStatus = billStatus;

  let effectiveLocations = resolveEffectiveLeadLocations({
    role,
    assignedArea,
    uiAllotedArea: allotedArea,
    exemptRoles: ALL_LEADS_LOCATION_EXEMPT_ROLES,
  });

  const blocked = getBlockedLeadLocations(employeeContext.guestLeadLocationBlock);
  if (blocked.size && effectiveLocations?.length) {
    const filtered = effectiveLocations.filter(
      (l) => !blocked.has(String(l).toLowerCase()),
    );
    if (filtered.length === 0) {
      return { ok: false, emptyResponse: { data: [], totalPages: 1, totalQueries: 0 } };
    }
    effectiveLocations = filtered;
  }

  const visibility = applyPropertyVisibilityRulesByLocationToLeadQuery({
    query,
    rules: employeeContext.propertyVisibilityRules,
    locations: effectiveLocations,
    uiPropertyType: propertyType,
    uiTypeOfProperty: typeOfProperty,
  });
  if (visibility.impossible) {
    return { ok: false, emptyResponse: { data: [], totalPages: 1, totalQueries: 0 } };
  }

  const pricing = applyPricingRulesByLocationToQuery({
    query,
    pricingRules: employeeContext.pricingRules,
    uiBudgetFrom: budgetFrom,
    uiBudgetTo: budgetTo,
    locations: effectiveLocations,
  });
  if (pricing.impossible) {
    return { ok: false, emptyResponse: { data: [], totalPages: 1, totalQueries: 0 } };
  }

  if (leadQuality) query.leadQualityByReviewer = leadQuality;

  if (
    role !== "SuperAdmin" &&
    role !== "Sales-TeamLead" &&
    role !== "LeadGen-TeamLead"
  ) {
    query.createdBy = token.email;
  }

  const effectivePriority = forcedSalesPriority ?? salesPriority;
  if (effectivePriority) {
    query.salesPriority = effectivePriority;
  }

  const locationExemptRoles = [
    "SuperAdmin",
    "Admin",
    "Developer",
    "HR",
    "Sales-TeamLead",
    "LeadGen-TeamLead",
    "LeadGen",
    "Advert",
  ];

  if (!locationExemptRoles.includes(role)) {
    if (allotedArea && allotedArea !== "All") {
      const normalizedRequested = allotedArea.toLowerCase();
      const userAreas = assignedArea.map((a) => a.toLowerCase());
      if (userAreas.includes(normalizedRequested)) {
        query.location = new RegExp(allotedArea, "i");
      } else {
        query.location = { $in: [] };
      }
    } else {
      const userAreas = parseAssignedAreasFromToken(assignedArea);
      if (userAreas.length === 1) {
        query.location = exactCaseInsensitiveRegex(userAreas[0]);
      } else if (userAreas.length > 1) {
        query.$or = userAreas.map((area) => ({
          location: exactCaseInsensitiveRegex(area),
        }));
      }
    }
  } else if (allotedArea && allotedArea !== "All") {
    query.location = new RegExp(allotedArea, "i");
  }

  if (blocked.size) {
    if (query.location instanceof RegExp) {
      const requested = String(allotedArea || "")
        .trim()
        .toLowerCase();
      if (requested && blocked.has(requested)) {
        query.location = { $in: [] };
      }
    } else if (typeof query.location === "string") {
      if (blocked.has(query.location.toLowerCase())) {
        query.location = { $in: [] };
      }
    } else if (
      query.location &&
      typeof query.location === "object" &&
      Array.isArray((query.location as { $in?: unknown[] }).$in)
    ) {
      const filtered = ((query.location as { $in: unknown[] }).$in)
        .map((x) => String(x))
        .filter((x) => !blocked.has(x.toLowerCase()));
      query.location = { $in: filtered };
    }
  }

  const scopedQuery = await applyEmployeeRentalTypeLeadFilter(
    query,
    token,
    employeeContext.rentalType,
  );

  return { ok: true, query: scopedQuery, employeeContext };
}

export async function buildNotReplyingMatchQuery(params: {
  token: Record<string, unknown>;
  filters: AllLeadsFilterInput;
}): Promise<AllLeadsQueryBuildResult> {
  return buildAllLeadsMatchQuery({
    ...params,
    forcedSalesPriority: "NR",
  });
}
