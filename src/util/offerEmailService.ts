import nodemailer from "nodemailer";
import type { Types } from "mongoose";

import Aliases from "@/models/alias";
import Employees from "@/models/employee";
import EmailTemplates from "@/models/emailTemplate";
import { connectDb } from "@/util/db";
import type { Organization } from "@/util/organizationConstants";
import { renderTemplate } from "@/util/templateEngine";

export type OfferEmailPlaceholders = {
  ownerName: string;
  price: number;
  employeeName: string;
  employeeEmail: string;
  propertyName: string;
  propertyUrl: string;
  plan: string;
  payNowUrl?: string;
  discount?: number | null;
  effectivePrice?: number | null;
};

export type ResolvedAlias = {
  _id: Types.ObjectId;
  aliasName: string;
  aliasEmail: string;
  aliasEmailPassword: string;
  organization: Organization;
};

export type ResolvedTemplate = {
  _id: Types.ObjectId;
  name: string;
  html: string;
  organization: Organization;
};

async function findAliasForEmployee(params: {
  employeeId: string;
  employeeEmail: string;
  organization: Organization;
}): Promise<ResolvedAlias | null> {
  const { employeeId, employeeEmail, organization } = params;

  // Primary (new) path: assignedTo is ObjectId of Employees
  const byId = await Aliases.findOne({
    assignedTo: employeeId,
    organization,
    status: "Active",
  })
    .select("aliasName aliasEmail aliasEmailPassword organization")
    .lean();
  if (byId) return byId as unknown as ResolvedAlias;

  // Backward compatibility: legacy aliases may have assignedTo stored as employee email string.
  // Use native collection query to avoid Mongoose casting `assignedTo` to ObjectId.
  const legacy = await Aliases.collection.findOne({
    assignedTo: employeeEmail,
    organization,
    status: "Active",
  });
  if (!legacy) return null;

  return {
    _id: legacy._id as Types.ObjectId,
    aliasName: String((legacy as any).aliasName ?? ""),
    aliasEmail: String((legacy as any).aliasEmail ?? ""),
    aliasEmailPassword: String((legacy as any).aliasEmailPassword ?? ""),
    organization: (legacy as any).organization as Organization,
  };
}

async function findActiveTemplate(params: {
  organization: Organization;
}): Promise<ResolvedTemplate | null> {
  const { organization } = params;
  const t = await EmailTemplates.findOne({ organization, isActive: true })
    .sort({ updatedAt: -1 })
    .select("name html organization")
    .lean();
  return (t as unknown as ResolvedTemplate) || null;
}

export async function sendOfferEmailUsingAlias(params: {
  employeeId: string;
  organizationOverride?: Organization;
  aliasId?: string;
  to: string;
  subject: string;
  placeholders: OfferEmailPlaceholders;
}): Promise<{
  alias: ResolvedAlias;
  template: ResolvedTemplate;
  renderedHtml: string;
}> {
  await connectDb();

  const employee = await Employees.findById(params.employeeId).lean();
  if (!employee) {
    throw new Error("Employee not found");
  }

  const employeeOrg = (employee as any).organization as Organization | undefined;
  const org = employeeOrg ?? params.organizationOverride;
  if (!org) {
    throw new Error("Employee organization is missing");
  }

  const alias = params.aliasId
    ? ((await Aliases.findById(params.aliasId)
        .select("aliasName aliasEmail aliasEmailPassword organization status")
        .lean()) as unknown as (ResolvedAlias & { status?: string }) | null)
    : await findAliasForEmployee({
        employeeId: params.employeeId,
        employeeEmail: String((employee as any).email ?? ""),
        organization: org,
      });
  if (!alias) {
    throw new Error("No active alias found for this employee in the same organization");
  }

  if ((alias as any)?.status && String((alias as any).status) !== "Active") {
    throw new Error("Selected alias is not active");
  }

  if (alias.organization !== org) {
    throw new Error("Cross-organization alias usage is not allowed");
  }

  const template = await findActiveTemplate({ organization: org });
  if (!template) {
    throw new Error("No active email template found for this organization");
  }

  const renderedHtml = renderTemplate(template.html, {
    ...params.placeholders,
    employeeName: params.placeholders.employeeName,
    employeeEmail: params.placeholders.employeeEmail,
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: alias.aliasEmail,
      pass: alias.aliasEmailPassword,
    },
  });

  const mailResponse = await transporter.sendMail({
    from: `${alias.aliasName} <${alias.aliasEmail}>`,
    to: params.to,
    subject: params.subject,
    html: renderedHtml,
  });

  if (mailResponse.rejected.length > 0) {
    throw new Error("Email address was rejected or invalid");
  }

  return { alias, template, renderedHtml };
}

