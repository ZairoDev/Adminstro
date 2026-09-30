import Query from "@/models/query";
import { connectDb } from "@/util/db";
import {
  assertValidDispositionTransition,
  dispositionActionToLeadStatus,
  dispositionRequiresLeadQuality,
  formatLeadStatusLabel,
  isLeadQualityByReviewer,
  normalizeLeadStatus,
  type CoreWhatsAppDispositionAction,
  type LeadQualityByReviewer,
} from "@/lib/leads/leadDisposition";
import {
  isLeadDeclineReason,
  isLeadRejectionReason,
  toQueryRejectionReasonEnum,
} from "@/lib/leads/dispositionReasons";

export type ApplyLeadDispositionInput = {
  leadId: string;
  action: CoreWhatsAppDispositionAction;
  leadQualityByReviewer?: string;
  reason?: string;
  actorEmployeeId?: string;
};

export type ApplyLeadDispositionResult = {
  leadId: string;
  beforeStatus: string;
  afterStatus: string;
  action: CoreWhatsAppDispositionAction;
  leadName?: string;
  phoneNo?: string;
};

/**
 * Dashboard / Copilot lead disposition — uses leadDisposition.ts rules.
 * Does not require a WhatsApp conversationId.
 */
export async function applyLeadDisposition(
  input: ApplyLeadDispositionInput,
): Promise<ApplyLeadDispositionResult> {
  await connectDb();

  const lead = await Query.findById(input.leadId);
  if (!lead) {
    throw Object.assign(new Error("Lead not found"), { status: 404 });
  }

  const beforeStatus = normalizeLeadStatus(lead.leadStatus);
  assertValidDispositionTransition(beforeStatus, input.action);

  if (dispositionRequiresLeadQuality(input.action)) {
    const q = input.leadQualityByReviewer?.trim() || "";
    if (!isLeadQualityByReviewer(q)) {
      throw Object.assign(
        new Error(
          "Lead quality is required: Good, Average, or Below Average",
        ),
        { status: 400 },
      );
    }
  }

  const reason = input.reason?.trim() || "";

  if (input.action === "decline_lead") {
    if (!reason || !isLeadDeclineReason(reason)) {
      throw Object.assign(new Error("A valid decline reason is required"), {
        status: 400,
      });
    }
  }

  if (input.action === "reject_lead") {
    if (!reason || !isLeadRejectionReason(reason)) {
      throw Object.assign(new Error("A valid rejection reason is required"), {
        status: 400,
      });
    }
  }

  const afterStatus = dispositionActionToLeadStatus(input.action);
  const update: Record<string, unknown> = {
    leadStatus: afterStatus,
  };

  if (
    input.leadQualityByReviewer &&
    isLeadQualityByReviewer(input.leadQualityByReviewer)
  ) {
    update.leadQualityByReviewer =
      input.leadQualityByReviewer as LeadQualityByReviewer;
  }

  switch (input.action) {
    case "good_to_go":
      update.reason = "";
      update.rejectionReason = null;
      break;
    case "decline_lead":
      update.reason = reason;
      update.rejectionReason = null;
      break;
    case "reject_lead":
      update.reason = reason;
      update.rejectionReason = toQueryRejectionReasonEnum(reason);
      break;
    case "revert_to_fresh":
      update.reason = null;
      update.rejectionReason = null;
      break;
  }

  await Query.findByIdAndUpdate(input.leadId, { $set: update });

  return {
    leadId: String(lead._id),
    beforeStatus,
    afterStatus,
    action: input.action,
    leadName: typeof lead.name === "string" ? lead.name : undefined,
    phoneNo: typeof lead.phoneNo === "string" ? lead.phoneNo : undefined,
  };
}

export function describeDispositionPlan(
  beforeStatus: string,
  action: CoreWhatsAppDispositionAction,
  quality?: string,
  reason?: string,
): string[] {
  const after = dispositionActionToLeadStatus(action);
  const lines = [
    `From: ${formatLeadStatusLabel(beforeStatus)} (${beforeStatus})`,
    `To: ${formatLeadStatusLabel(after)} (${after})`,
    `Action: ${action}`,
  ];
  if (quality) lines.push(`Quality: ${quality}`);
  if (reason) lines.push(`Reason: ${reason}`);
  return lines;
}
