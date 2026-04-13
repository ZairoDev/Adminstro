import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import Company, { type CompanyPlan } from "@/models/company";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { OrganizationZod, type Organization } from "@/util/organizationConstants";

const ALLOWED_OFFER_ORGS: readonly Organization[] = [
  "VacationSaga",
  "Holidaysera",
  "HousingSaga",
] as const;

const QuerySchema = z.object({
  organization: OrganizationZod.optional(),
});

type LeanCompany = {
  _id: string;
  name?: string;
  organization?: string;
  plans?: CompanyPlan[];
  content?: Record<string, unknown>;
};

type OfferPlanDto = {
  planName: string;
  duration: string;
  price: number;
  currency: string;
};

function normalizeOrg(rawOrganization: string | undefined, rawName: string | undefined): Organization | null {
  const direct = (rawOrganization ?? "").trim();
  if (ALLOWED_OFFER_ORGS.includes(direct as Organization)) {
    return direct as Organization;
  }

  const fromName = (rawName ?? "").replace(/\s+/g, "").toLowerCase();
  if (fromName === "vacationsaga") return "VacationSaga";
  if (fromName === "holidaysera") return "Holidaysera";
  if (fromName === "housingsaga") return "HousingSaga";
  return null;
}

function parseLegacyContentPlans(content: Record<string, unknown> | undefined): CompanyPlan[] {
  if (!content) return [];
  const rawPlans = content["plans"];
  if (!Array.isArray(rawPlans)) return [];

  return rawPlans
    .map((item): CompanyPlan | null => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;
      const planName = String(candidate.planName ?? "").trim();
      const duration = String(candidate.duration ?? "").trim();
      const priceRaw = Number(candidate.price);
      const currency = String(candidate.currency ?? "EUR").trim() || "EUR";
      const isActive = candidate.isActive === undefined ? true : Boolean(candidate.isActive);
      if (!planName || !duration || Number.isNaN(priceRaw) || priceRaw < 0) return null;
      return {
        planName,
        duration,
        price: priceRaw,
        currency,
        isActive,
      };
    })
    .filter((plan): plan is CompanyPlan => Boolean(plan));
}

function normalizePlans(doc: LeanCompany): OfferPlanDto[] {
  const directPlans = Array.isArray(doc.plans) ? doc.plans : [];
  const fallbackPlans = directPlans.length > 0 ? directPlans : parseLegacyContentPlans(doc.content);

  return fallbackPlans
    .filter((plan) => plan.isActive !== false)
    .map((plan) => ({
      planName: plan.planName,
      duration: plan.duration,
      price: plan.price,
      currency: plan.currency,
    }));
}

export async function GET(req: NextRequest) {
  try {
    await getDataFromToken(req);
    await connectDb();

    const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
    }

    const requestedOrg = parsed.data.organization;
    const docs = (await Company.find({})
      .select("name organization plans content")
      .lean()) as unknown as LeanCompany[];

    const results = docs
      .map((doc) => {
        const organization = normalizeOrg(doc.organization, doc.name);
        if (!organization) return null;
        if (!ALLOWED_OFFER_ORGS.includes(organization)) return null;
        if (requestedOrg && organization !== requestedOrg) return null;

        const plans = normalizePlans(doc);
        return {
          _id: String(doc._id),
          organization,
          companyName: String(doc.name ?? organization),
          plans,
        };
      })
      .filter((item): item is { _id: string; organization: Organization; companyName: string; plans: OfferPlanDto[] } => Boolean(item));

    return NextResponse.json({ companies: results }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json({ code: error.code || "AUTH_FAILED" }, { status: error.status });
    }
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
