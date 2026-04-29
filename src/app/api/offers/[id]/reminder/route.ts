import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import EmailTemplates from "@/models/emailTemplate";
import Employees from "@/models/employee";
import { Offer } from "@/models/offer";
import { connectDb } from "@/util/db";
import { sendDirectEmailUsingAlias } from "@/util/offerEmailService";
import { OrganizationZod } from "@/util/organizationConstants";
import { renderTemplate } from "@/util/templateEngine";
import { getDataFromToken } from "@/util/getDataFromToken";

const ParamsSchema = z.object({ id: z.string().min(1) });
const ReminderTypeZod = z.enum(["REM1", "REM2", "REM3", "REM4"]);

const BodySchema = z.object({
  organization: OrganizationZod.optional(),
  type: ReminderTypeZod,
  subject: z.string().min(1),
  html: z.string().min(1),
  note: z.string().optional().default(""),
  aliasId: z.string().optional(),
});

const PREVIOUS_REMINDER: Record<z.infer<typeof ReminderTypeZod>, z.infer<typeof ReminderTypeZod> | null> = {
  REM1: null,
  REM2: "REM1",
  REM3: "REM2",
  REM4: "REM3",
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getDataFromToken(req);
    const employeeId = (payload as { id?: string }).id as string;
    if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body", details: body.error.flatten() }, { status: 400 });
    }

    await connectDb();
    const employee = await Employees.findById(employeeId).select("name organization").lean();
    const employeeOrg = employee ? String((employee as { organization?: string }).organization ?? "") : "";
    const organization = body.data.organization ?? (OrganizationZod.safeParse(employeeOrg).success ? employeeOrg as z.infer<typeof OrganizationZod> : undefined);
    if (!organization) return NextResponse.json({ error: "Organization is required" }, { status: 400 });

    const { id } = ParamsSchema.parse(await ctx.params);
    let offer = await Offer.findOne({ _id: id, organization }).lean();
    if (!offer) {
      offer = await Offer.findOne({ _id: id }).lean();
    }
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

    const existingKinds = new Set(
      Array.isArray((offer as { emailEvents?: Array<{ kind?: string }> }).emailEvents)
        ? ((offer as { emailEvents?: Array<{ kind?: string }> }).emailEvents ?? [])
            .map((event) => event.kind)
            .filter((kind): kind is string => Boolean(kind))
        : [],
    );
    const requiredPrevious = PREVIOUS_REMINDER[body.data.type];
    if (requiredPrevious && !existingKinds.has(requiredPrevious)) {
      return NextResponse.json(
        { error: `${body.data.type} cannot be sent before ${requiredPrevious}` },
        { status: 400 },
      );
    }
    const isResend = existingKinds.has(body.data.type);

    const activeTemplate = await EmailTemplates.findOne({
      organization,
      type: body.data.type,
      isActive: true,
    })
      .select("_id")
      .lean();
    const activeTemplateId =
      activeTemplate && !Array.isArray(activeTemplate) && "_id" in activeTemplate
        ? activeTemplate._id
        : null;

    const renderedHtml = renderTemplate(body.data.html, {
      name: String((offer as { name?: string }).name ?? ""),
      ownerName: String((offer as { name?: string }).name ?? ""),
      propertyName: String((offer as { propertyName?: string }).propertyName ?? ""),
      propertyUrl: String((offer as { propertyUrl?: string }).propertyUrl ?? ""),
      email: String((offer as { email?: string }).email ?? ""),
      relation: String((offer as { relation?: string }).relation ?? ""),
      platform: String((offer as { platform?: string }).platform ?? ""),
      plan: String((offer as { plan?: string }).plan ?? ""),
      organization,
    });

    const renderedSubject = renderTemplate(body.data.subject, {
      name: String((offer as { name?: string }).name ?? ""),
      ownerName: String((offer as { name?: string }).name ?? ""),
      propertyName: String((offer as { propertyName?: string }).propertyName ?? ""),
      organization,
      plan: String((offer as { plan?: string }).plan ?? ""),
    });

    await sendDirectEmailUsingAlias({
      employeeId,
      organizationOverride: organization,
      aliasId: body.data.aliasId,
      to: String((offer as { email?: string }).email ?? ""),
      subject: renderedSubject,
      html: renderedHtml,
    });

    const historyEntry = {
      type: "reminder",
      status: `${body.data.type} Sent`,
      note: body.data.note || "",
      updatedBy: employeeId,
      updatedByName: String((employee as { name?: string })?.name ?? ""),
      createdAt: new Date(),
    };

    const eventEntry = {
      kind: body.data.type,
      subjectSnapshot: renderedSubject,
      contentSnapshot: renderedHtml,
      sentAt: new Date(),
      sentBy: employeeId,
      sentByName: String((employee as { name?: string })?.name ?? ""),
      templateId: activeTemplateId,
    };

    const updated = await Offer.findByIdAndUpdate(
      id,
      { $push: { history: historyEntry, emailEvents: eventEntry } },
      { new: true },
    ).lean();

    return NextResponse.json({ offer: updated, isResend }, { status: 200 });
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

