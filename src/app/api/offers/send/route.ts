import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Offer } from "@/models/offer";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { sendOfferEmailUsingAlias } from "@/util/offerEmailService";
import { DEFAULT_ORGANIZATION, OrganizationZod } from "@/util/organizationConstants";

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

    await connectDb();

    const employee = await Employees.findById(employeeId).lean();
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    const employeeOrg = (employee as any).organization;
    const organization =
      employeeOrg ??
      (role === "SuperAdmin" ? body.data.organization ?? undefined : undefined) ??
      (employeeId === "test-superadmin" ? body.data.organization ?? DEFAULT_ORGANIZATION : undefined);
    if (!organization) {
      return NextResponse.json({ error: "Organization is required" }, { status: 400 });
    }

    const isAdminOverrideRole = role === "HAdmin" || role === "SuperAdmin";
    if (body.data.aliasId && !isAdminOverrideRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Send email + get rendered HTML snapshot
    const subject = `Offer - ${body.data.plan}`;
    const { alias, renderedHtml } = await sendOfferEmailUsingAlias({
      employeeId,
      organizationOverride: organization,
      aliasId: body.data.aliasId,
      to: body.data.email,
      subject,
      placeholders: {
        ownerName: body.data.name,
        price: body.data.effectivePrice,
        employeeName: String((employee as any).name ?? ""),
        employeeEmail: String((employee as any).email ?? ""),
        propertyName: body.data.propertyName,
        propertyUrl: body.data.propertyUrl,
        plan: body.data.plan,
        discount: body.data.discount,
        effectivePrice: body.data.effectivePrice,
      },
    });

    const updateFields = {
      ...body.data,
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

    const offerDoc = body.data.leadId
      ? await Offer.findOneAndUpdate(
          { _id: body.data.leadId, organization },
          { $set: updateFields, $push: { history: historyEntry } },
          { new: true },
        )
      : await Offer.create({
          ...updateFields,
          history: [historyEntry],
        });

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

