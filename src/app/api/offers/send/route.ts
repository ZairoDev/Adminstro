import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import Coupon from "@/models/coupon";
import { Offer } from "@/models/offer";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { sendOfferEmailUsingAlias } from "@/util/offerEmailService";
import { DEFAULT_ORGANIZATION, OrganizationZod } from "@/util/organizationConstants";
import { buildPayNowUrl } from "@/util/payNowUrl";
import {
  getHolidayseraCheckoutPlanId,
  getHolidayseraPlanFeaturePlaceholders,
  parseOfferPlan,
  serializeOfferPlan,
} from "@/util/offerPlan";

const BodySchema = z.object({
  leadId: z.string().optional(),
  aliasId: z.string().optional(),
  organization: OrganizationZod.optional(),
  // lead details
  phoneNumber: z.string().min(1),
  leadStatus: z.string().min(1),
  note: z.string().optional().default(""),
  name: z.string().min(1),
  propertyName: z.string().min(1),
  relation: z.string().min(1),
  email: z.string().email(),
  propertyUrl: z.string().min(1),
  country: z.string().min(1),
  state: z.string().optional().default(""),
  city: z.string().optional().default(""),

  // pricing
  plan: z.string().min(1),
  discount: z.number().min(0).optional().default(0),
  effectivePrice: z.number().min(0),
  expiryDate: z.coerce.date().nullable().optional().default(null),

  // existing fields
  services: z.string().optional().default(""),
  platform: z.enum(["VacationSaga", "Holidaysera", "HousingSaga", "TechTunes"]),
});

function generateOfferCouponCode(): string {
  return `ADMN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function resolveOfferCouponExpiry(expiryDate: Date | null | undefined): Date {
  const now = new Date();
  if (expiryDate instanceof Date && !Number.isNaN(expiryDate.getTime()) && expiryDate > now) {
    return expiryDate;
  }

  const inThirtyDays = new Date(now);
  inThirtyDays.setDate(inThirtyDays.getDate() + 30);
  return inThirtyDays;
}

async function createOneTimeOfferCoupon(params: {
  discount: number;
  validUntil: Date;
  applicablePlans: string[];
}): Promise<string | null> {
  const { discount, validUntil, applicablePlans } = params;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const couponCode = generateOfferCouponCode();

    try {
      await Coupon.create({
        code: couponCode,
        discountType: "fixed",
        discountValue: discount,
        minPurchaseAmount: 0,
        validFrom: new Date(),
        validUntil,
        usageLimit: 1,
        usedCount: 0,
        applicablePlans,
        isActive: true,
        origin: "adminstro",
      });
      return couponCode;
    } catch (error) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000 && attempt < maxAttempts) {
        continue;
      }
      throw error;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getDataFromToken(req);
    const employeeId = (payload as any).id as string;
    if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = String((payload as any).role ?? "").trim();

    const body = BodySchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const parsedPlan = parseOfferPlan(body.data.plan);
    if (!parsedPlan) {
      return NextResponse.json({ error: "Invalid plan format" }, { status: 400 });
    }
    const normalizedPlan = serializeOfferPlan(parsedPlan);
    const planFeatures = getHolidayseraPlanFeaturePlaceholders(parsedPlan);

    await connectDb();

    const employee = await Employees.findById(employeeId).lean();
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    const employeeOrg = (employee as any).organization;
    const organizationCandidate =
      employeeOrg ??
      (role === "SuperAdmin" ? body.data.organization ?? undefined : undefined) ??
      (employeeId === "test-superadmin" ? body.data.organization ?? DEFAULT_ORGANIZATION : undefined);
    const parsedOrganization = OrganizationZod.safeParse(organizationCandidate);
    if (!parsedOrganization.success) {
      return NextResponse.json({ error: "Organization is required" }, { status: 400 });
    }
    const organization = parsedOrganization.data;

    const isAdminOverrideRole = role === "HAdmin" || role === "SuperAdmin";
    if (body.data.aliasId && !isAdminOverrideRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Send email + get rendered HTML snapshot
    const organizationSlug = String(organization).toLowerCase();
    const subject =
      organization === "Holidaysera" || organization === "HousingSaga"
        ? `Partner with ${organization}`
        : `Partner with ${organization}`;
    const holidayseraPlanId = getHolidayseraCheckoutPlanId(parsedPlan);
    const shouldCreateOfferCoupon =
      body.data.discount > 0 &&
      (organization === "HousingSaga" || organization === "Holidaysera");

    let couponCode: string | null = null;

    if (shouldCreateOfferCoupon) {
      try {
        const applicablePlans =
          organization === "HousingSaga"
            ? ["property-listing"]
            : holidayseraPlanId
              ? [holidayseraPlanId]
              : [];

        if (organization !== "Holidaysera" || applicablePlans.length > 0) {
          couponCode = await createOneTimeOfferCoupon({
            discount: body.data.discount,
            validUntil: resolveOfferCouponExpiry(body.data.expiryDate),
            applicablePlans,
          });
        }
      } catch (couponError) {
        console.error("[OfferSend] Failed to create coupon:", couponError);
      }
    }

    const payNowUrl = buildPayNowUrl(organization, body.data.propertyUrl, {
      couponCode,
      holidayseraPlanId,
    });

    const originalAmount = body.data.effectivePrice + body.data.discount;
    const originalPrice =
      body.data.discount > 0 ? `€ ${originalAmount}` : "";

    const { alias, renderedHtml } = await sendOfferEmailUsingAlias({
      employeeId,
      organizationOverride: organization,
      aliasId: body.data.aliasId,
      to: body.data.email,
      subject,
      placeholders: {
        ownerName: body.data.name,
        price: body.data.effectivePrice + body.data.discount,
        planName: parsedPlan.planName,
        originalPrice,
        employeeName: String((employee as any).name ?? ""),
        employeeEmail: String((employee as any).email ?? ""),
        propertyName: body.data.propertyName,
        propertyUrl: body.data.propertyUrl,
        plan: normalizedPlan,
        payNowUrl,
        discount: body.data.discount,
        effectivePrice: body.data.effectivePrice,
        ...planFeatures,
      },
    });

    const updateFields = {
      ...body.data,
      plan: normalizedPlan,
      organization,
      offerStatus: "offer_sent",
      leadStage: "converted",
      sentByEmployee: employeeId,
      aliasUsed: alias._id,
      selectedByAdmin: Boolean(body.data.aliasId && isAdminOverrideRole),
      sentBySnapshot: {
        name: String((employee as any).name ?? ""),
        email: String((employee as any).email ?? ""),
        aliasName: alias.aliasName,
        aliasEmail: alias.aliasEmail,
      },
      emailSubject: subject,
      emailContent: renderedHtml,
    } as const;

    const historyEntry = {
      type: "offer",
      status: "offer_sent",
      note: body.data.note ?? "",
      updatedBy: employeeId,
      createdAt: new Date(),
    } as const;
    console.log("updateFields: ", updateFields);
    let offerDoc = null;
    if (body.data.leadId) {
      offerDoc = await Offer.findOneAndUpdate(
        { _id: body.data.leadId, organization },
        { $set: updateFields, $push: { history: historyEntry } },
        { new: true },
      );

      if (!offerDoc) {
        // Legacy leads can exist without normalized organization values.
        offerDoc = await Offer.findOneAndUpdate(
          { _id: body.data.leadId },
          { $set: updateFields, $push: { history: historyEntry } },
          { new: true },
        );
      }
    } else {
      offerDoc = await Offer.create({
        ...updateFields,
        history: [historyEntry],
      });
    }
    console.log("offerDoc: ", offerDoc);
    if (!offerDoc) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ offer: offerDoc }, { status: 201 });
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

