import { MonthlyTarget } from "@/models/monthlytarget";
import { MonthlyPerformanceTarget } from "@/models/monthlyPerformanceTarget";
import { dedupeCities, normalizeCityKey, toDisplayCity } from "@/lib/city-normalizer";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

const EDITABLE_FIELDS_BY_ROLE: Record<string, Array<"leads" | "visits" | "sales">> = {
  SuperAdmin: ["leads", "visits", "sales"],
  "LeadGen-TeamLead": ["leads"],
  "Sales-TeamLead": ["visits", "sales"],
};

export async function GET(req: NextRequest) {
  try {
    const tokenData = await getDataFromToken(req);
    const role = tokenData.role as string;
    const allotedArea = tokenData.allotedArea as string | string[] | undefined;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const editableFields = EDITABLE_FIELDS_BY_ROLE[role] ?? [];

    const configuredCityDocs = await MonthlyTarget.find(
      { month: { $exists: false } },
      { city: 1, _id: 0 }
    ).lean();
    const configuredCities = dedupeCities(configuredCityDocs.map((doc) => toDisplayCity(doc.city || "")));

    const scopedCities =
      role === "SuperAdmin"
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
      month: target.month,
      year: target.year,
    }));

    const existingTargetKeys = new Set(existingTargetsByCity.map((target) => target.cityKey));
    const requiredKeys = scopedCities.map((city) => normalizeCityKey(city));
    const hasTarget =
      requiredKeys.length > 0 && requiredKeys.every((cityKey) => existingTargetKeys.has(cityKey));

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
