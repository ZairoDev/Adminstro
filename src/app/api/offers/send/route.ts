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
import { computeOfferTotals, formatEuroAmount } from "@/util/offerPricing";
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
  pricePerProperty: z.number().min(0).optional(),
  propertiesAllowed: z.number().int().min(1).optional().default(1),
  discountType: z.enum(["PER_PROPERTY", "TOTAL"]).optional().default("TOTAL"),
  discountUnit: z.enum(["FIXED", "PERCENT"]).optional().default("FIXED"),
  discountValue: z.number().min(0).optional(),
  discount: z.number().min(0).optional().default(0), // legacy fallback
  totalPrice: z.number().min(0).optional(),
  effectivePrice: z.number().min(0).optional(),
  expiryDate: z.coerce.date().nullable().optional().default(null),

  // existing fields
  services: z.string().optional().default(""),
  platform: z.enum(["VacationSaga", "Holidaysera", "HousingSaga", "TechTunes"]),
}).superRefine((value, ctx) => {
  if (value.discountUnit === "PERCENT") {
    const rawPercent = value.discountValue ?? value.discount ?? 0;
    if (rawPercent > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "Percentage discount cannot exceed 100",
      });
    }
  }
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
  discountType: "percentage" | "fixed";
  discountValue: number;
  propertiesAllowed: number;
  pricePerProperty: number;
  offerDiscountScope: "PER_PROPERTY" | "TOTAL";
  validUntil: Date;
  expiresAt: Date | null;
  applicablePlans: string[];
}): Promise<string | null> {
  const {
    discountType,
    discountValue,
    propertiesAllowed,
    pricePerProperty,
    offerDiscountScope,
    validUntil,
    expiresAt,
    applicablePlans,
  } = params;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const couponCode = generateOfferCouponCode();

    try {
      await Coupon.create({
        code: couponCode,
        discountType,
        discountValue,
        propertiesAllowed,
        pricePerProperty,
        offerDiscountScope,
        minPurchaseAmount: 0,
        validFrom: new Date(),
        validUntil,
        expiresAt,
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

    const rawBody = await req.json();
    const body = BodySchema.safeParse(rawBody);
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
    const rawBodyObject = rawBody as Record<string, unknown>;
    const hasPricingField = (field: string): boolean =>
      typeof rawBodyObject === "object" &&
      rawBodyObject !== null &&
      Object.prototype.hasOwnProperty.call(rawBodyObject, field);

    const isHousingSaga = organization === "HousingSaga";
    if (isHousingSaga) {
      if (!hasPricingField("propertiesAllowed") || !hasPricingField("pricePerProperty")) {
        return NextResponse.json(
          {
            error:
              "HousingSaga offer requires explicit propertiesAllowed and pricePerProperty values.",
          },
          { status: 400 },
        );
      }
      if (
        typeof body.data.pricePerProperty !== "number" ||
        !Number.isFinite(body.data.pricePerProperty) ||
        body.data.pricePerProperty <= 0
      ) {
        return NextResponse.json(
          { error: "HousingSaga offer requires pricePerProperty greater than 0." },
          { status: 400 },
        );
      }
    }

    const propertiesAllowed = Math.max(1, body.data.propertiesAllowed ?? 1);
    const pricePerProperty = Math.max(
      0,
      isHousingSaga ? (body.data.pricePerProperty ?? 0) : (body.data.pricePerProperty ?? parsedPlan.price),
    );
    const discountValue = Math.max(0, body.data.discountValue ?? body.data.discount ?? 0);
    const pricing = computeOfferTotals({
      pricePerProperty,
      propertiesAllowed,
      discountType: body.data.discountType,
      discountUnit: body.data.discountUnit,
      discountValue,
    });

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
      pricing.totalDiscount > 0 &&
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
            discountType: body.data.discountUnit === "PERCENT" ? "percentage" : "fixed",
            discountValue,
            propertiesAllowed,
            pricePerProperty,
            offerDiscountScope: body.data.discountType,
            validUntil: resolveOfferCouponExpiry(body.data.expiryDate),
            expiresAt: body.data.expiryDate,
            applicablePlans,
          });
          if (couponCode) {
            console.info("[OfferSend] coupon.created", {
              couponCode,
              organization,
              propertiesAllowed,
              discountType: body.data.discountType,
              discountUnit: body.data.discountUnit,
            });
          }
        }
      } catch (couponError) {
        console.error("[OfferSend] Failed to create coupon:", couponError);
      }
    }

    const payNowUrl = buildPayNowUrl(organization, body.data.propertyUrl, {
      couponCode,
      holidayseraPlanId,
    });

    const originalPrice = pricing.totalDiscount > 0 ? `€ ${formatEuroAmount(pricing.baseTotal)}` : "";
    const discountApplied =
      pricing.totalDiscount > 0
        ? body.data.discountUnit === "PERCENT"
          ? `${formatEuroAmount(discountValue)}%`
          : `€ ${formatEuroAmount(pricing.totalDiscount)}`
        : "";

    const { alias, renderedHtml } = await sendOfferEmailUsingAlias({
      employeeId,
      organizationOverride: organization,
      aliasId: body.data.aliasId,
      to: body.data.email,
      subject,
      placeholders: {
        ownerName: body.data.name,
        price: pricing.baseTotal,
        planName: parsedPlan.planName,
        originalPrice,
        pricePerProperty: formatEuroAmount(pricePerProperty),
        propertiesAllowed,
        totalPrice: formatEuroAmount(pricing.baseTotal),
        discountApplied,
        employeeName: String((employee as any).name ?? ""),
        employeeEmail: String((employee as any).email ?? ""),
        propertyName: body.data.propertyName,
        propertyUrl: body.data.propertyUrl,
        plan: normalizedPlan,
        payNowUrl,
        discount: pricing.totalDiscount,
        effectivePrice: pricing.effectivePrice,
        ...planFeatures,
      },
    });

    const updateFields = {
      ...body.data,
      plan: normalizedPlan,
      propertiesAllowed,
      pricePerProperty,
      discountType: body.data.discountType,
      discountUnit: body.data.discountUnit,
      discountValue,
      totalPrice: pricing.baseTotal,
      discount: pricing.totalDiscount,
      effectivePrice: pricing.effectivePrice,
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
    console.info("[OfferSend] offer.persisted", {
      offerId: String(offerDoc._id),
      organization,
      couponCode,
      propertiesAllowed,
      effectivePrice: pricing.effectivePrice,
    });

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

