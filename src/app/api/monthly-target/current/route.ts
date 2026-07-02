import { MonthlyTarget } from "@/models/monthlytarget";
import { MonthlyPerformanceTarget } from "@/models/monthlyPerformanceTarget";
import { dedupeCities, normalizeCityKey, toDisplayCity } from "@/lib/city-normalizer";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";
export const revalidate = 0;

connectDb();

const EDITABLE_FIELDS_BY_ROLE: Record<string, Array<"leads" | "visits" | "sales">> = {
  SuperAdmin: ["leads", "visits", "sales"],
  "LeadGen-TeamLead": ["leads"],
  "Sales-TeamLead": ["leads", "visits", "sales"],
};

export async function GET(req: NextRequest) {
  try {
    const tokenData = await getDataFromToken(req);
    const role = tokenData.role as string;
    const allotedArea = tokenData.allotedArea as string | string[] | undefined;

    const now = new Date();
    let currentMonth = now.getMonth() + 1;
    let currentYear = now.getFullYear();

    if (role === "SuperAdmin") {
      const monthParam = req.nextUrl.searchParams.get("month");
      const yearParam = req.nextUrl.searchParams.get("year");
      if (monthParam && yearParam) {
        const m = Number(monthParam);
        const y = Number(yearParam);
        if (Number.isInteger(m) && m >= 1 && m <= 12 && Number.isInteger(y) && y >= 2020) {
          currentMonth = m;
          currentYear = y;
        }
      }
    }
    const editableFields = EDITABLE_FIELDS_BY_ROLE[role] ?? [];

    // Locations source-of-truth lives in MonthlyTarget. Do not rely on `month` existing/non-existing
    // because older data may still have those fields from earlier experiments.
    const configuredCityDocs = await MonthlyTarget.find(
      { isActive: { $ne: false } },
      { city: 1, _id: 0 }
    ).lean();
    const configuredCities = dedupeCities(configuredCityDocs.map((doc) => toDisplayCity(doc.city || "")));

    const scopedCities =
      role === "SuperAdmin" || role === "LeadGen-TeamLead"
        ? configuredCities
        : dedupeCities(
            (Array.isArray(allotedArea) ? allotedArea : [allotedArea])
              .filter((value): value is string => typeof value === "string")
              .map((city) => toDisplayCity(city))
          );

    const scopedCityKeys = scopedCities.map((city) => normalizeCityKey(city));
    const targetQuery: Record<string, unknown> = {
      month: currentMonth,
      year: currentYear,
    };
    if (scopedCityKeys.length > 0) {
      targetQuery.cityKey = { $in: scopedCityKeys };
    }

    const targets = await MonthlyPerformanceTarget.find(targetQuery).lean();

    const existingTargetsByCity = targets.map((target) => ({
      city: toDisplayCity(target.city || ""),
      cityKey: target.cityKey || normalizeCityKey(target.city || ""),
      leads: target.leads ?? 0,
      visits: target.visits ?? 0,
      sales: target.sales ?? 0,
      leadsConfigured: Boolean(target.leadsConfigured),
      visitsConfigured: Boolean(target.visitsConfigured),
      salesConfigured: Boolean(target.salesConfigured),
      month: target.month,
      year: target.year,
    }));

    const existingByKey = new Map(existingTargetsByCity.map((target) => [target.cityKey, target]));
    const requiredKeys = scopedCities.map((city) => normalizeCityKey(city));

    // Completion rules:
    // - For TeamLeads: presence of a monthly record per city is enough
    // - For SuperAdmin: require visits+sales to be set (>0) for each city (since LeadGen TL may only fill leads)
    const hasTarget =
      requiredKeys.length > 0 &&
      requiredKeys.every((cityKey) => {
        const existing = existingByKey.get(cityKey);
        if (!existing) return false;
        if (role !== "SuperAdmin") return true;
        // SuperAdmin completion requires explicit configuration of visits + sales (0 is allowed)
        return Boolean(existing.visitsConfigured) && Boolean(existing.salesConfigured);
      });

    return NextResponse.json(
      {
        hasTarget,
        existingTargetsByCity,
        availableCities: scopedCities,
        currentMonth,
        currentYear,
        editableFields,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status }
      );
    }
    console.error("Error in GET /api/monthly-target/current:", err);
    return NextResponse.json(
      { error: "Unable to fetch monthly target" },
      { status: 500 }
    );
  }
}
