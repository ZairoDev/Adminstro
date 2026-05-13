import crypto from "crypto";
import mongoose from "mongoose";
import WhatsAppCallLog from "@/models/whatsappCallLog";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";

export function hashSdpAnswer(sdp: string): string {
  return crypto.createHash("sha256").update(sdp, "utf8").digest("hex");
}

export type RecordCallStartedInput = {
  callId: string;
  conversationId?: string;
  businessPhoneId: string;
  participantPhone: string;
  participantName?: string;
};

/**
 * Upsert a row when Meta accepts `start_call` (business-initiated).
 */
export async function recordCallStarted(input: RecordCallStartedInput): Promise<void> {
  const convId =
    input.conversationId && mongoose.Types.ObjectId.isValid(input.conversationId)
      ? new mongoose.Types.ObjectId(input.conversationId)
      : undefined;

  await WhatsAppCallLog.findOneAndUpdate(
    { callId: input.callId },
    {
      $setOnInsert: {
        callId: input.callId,
        startedAt: new Date(),
        direction: "business_initiated",
        lifecycleStatus: "signaling",
      },
      $set: {
        ...(convId ? { conversationId: convId } : {}),
        businessPhoneId: input.businessPhoneId,
        participantPhone: input.participantPhone,
        ...(input.participantName ? { participantName: input.participantName } : {}),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

/**
 * Returns `true` if this SDP answer should be emitted to clients (not a duplicate).
 * Uses atomic compare on stored hash so duplicate webhook deliveries are ignored.
 */
export async function shouldEmitSdpAnswerAndMark(
  callId: string,
  sdp: string,
  meta: { conversationId?: string; businessPhoneId?: string },
): Promise<boolean> {
  const hash = hashSdpAnswer(sdp);
  const convId =
    meta.conversationId && mongoose.Types.ObjectId.isValid(meta.conversationId)
      ? new mongoose.Types.ObjectId(meta.conversationId)
      : undefined;

  const res = await WhatsAppCallLog.updateOne(
    {
      callId,
      $or: [
        { lastEmittedSdpAnswerHash: { $exists: false } },
        { lastEmittedSdpAnswerHash: null },
        { lastEmittedSdpAnswerHash: { $ne: hash } },
      ],
    },
    {
      $set: {
        lastEmittedSdpAnswerHash: hash,
        lastEmittedSdpAnswerAt: new Date(),
        lifecycleStatus: "ringing",
        updatedAt: new Date(),
        ...(convId ? { conversationId: convId } : {}),
        ...(meta.businessPhoneId ? { businessPhoneId: meta.businessPhoneId } : {}),
      },
      $setOnInsert: {
        callId,
        startedAt: new Date(),
        direction: "business_initiated",
      },
    },
    { upsert: true },
  );

  return res.modifiedCount > 0 || res.upsertedCount > 0;
}

export type RecordUserInitiatedIncomingOfferInput = {
  callId: string;
  conversationId: string;
  businessPhoneId: string;
  participantPhone: string;
  participantName?: string;
};

/**
 * Persist / refresh call log when a customer starts a call (Call Connect webhook with SDP offer).
 */
export async function recordUserInitiatedIncomingOffer(
  input: RecordUserInitiatedIncomingOfferInput,
): Promise<void> {
  const convId = new mongoose.Types.ObjectId(input.conversationId);
  await WhatsAppCallLog.findOneAndUpdate(
    { callId: input.callId },
    {
      $setOnInsert: {
        callId: input.callId,
        startedAt: new Date(),
        direction: "user_initiated",
      },
      $set: {
        conversationId: convId,
        businessPhoneId: input.businessPhoneId,
        participantPhone: input.participantPhone,
        ...(input.participantName ? { participantName: input.participantName } : {}),
        lifecycleStatus: "ringing",
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function updateCallFromMetaStatus(input: {
  callId: string;
  metaStatus: string;
  duration?: number;
}): Promise<void> {
  const norm = input.metaStatus.toLowerCase();
  let lifecycle:
    | undefined
    | "signaling"
    | "ringing"
    | "connected"
    | "ended"
    | "missed"
    | "failed"
    | "declined"
    | "busy"
    | "timeout" = undefined;
  if (norm === "ringing") lifecycle = "ringing";
  else if (norm === "accepted" || norm === "in_progress") lifecycle = "connected";
  else if (norm === "rejected" || norm === "declined") lifecycle = "declined";
  else if (norm === "busy") lifecycle = "busy";
  else if (norm === "missed") lifecycle = "missed";
  else if (norm === "failed") lifecycle = "failed";
  else if (norm === "terminated" || norm === "completed") lifecycle = "ended";
  else if (norm === "timeout") lifecycle = "timeout";

  const patch: Record<string, unknown> = {
    metaCallStatus: input.metaStatus,
    updatedAt: new Date(),
  };
  if (lifecycle) patch.lifecycleStatus = lifecycle;
  if (typeof input.duration === "number" && input.duration > 0) {
    patch.durationSeconds = input.duration;
  }
  if (lifecycle === "ended" || lifecycle === "missed" || lifecycle === "failed" || lifecycle === "declined") {
    patch.endedAt = new Date();
  }

  await WhatsAppCallLog.updateOne({ callId: input.callId }, { $set: patch }, { upsert: false });
}

export type ClientTelemetryInput = {
  callId: string;
  conversationId: string;
  event: "client_ended" | "client_connected" | "client_failed";
  disconnectReason?: string;
  stats?: Record<string, unknown>;
  /** Wall-clock duration of the call session (client). */
  durationSeconds?: number;
  /** When true and `client_ended`, append an internal chat line with duration. */
  recordChatSummary?: boolean;
  /** Chat log line wording: business placed call vs customer placed call. */
  chatSummaryVariant?: "outbound" | "inbound";
};

/**
 * Internal-only chat row so agents see that a WhatsApp call happened and how long it lasted.
 */
export async function createCallEndedInternalChatMessage(input: {
  conversationId: string;
  callId: string;
  durationSeconds: number;
  disconnectReason?: string;
  summaryVariant?: "outbound" | "inbound";
}): Promise<void> {
  const conversation = await WhatsAppConversation.findById(input.conversationId);
  if (!conversation) return;

  const phoneId = String(conversation.businessPhoneId || "");
  /** One chat line per Meta callId (idempotent across repeated telemetry / clicks). */
  const internalMessageId = `internal_call_end_${input.callId}`;

  const sec = Math.max(0, Math.floor(input.durationSeconds));
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  const durLabel = sec < 60 ? `${sec}s` : `${mm}:${String(ss).padStart(2, "0")}`;
  const reason =
    input.disconnectReason && input.disconnectReason !== "user_hangup"
      ? ` · ${input.disconnectReason}`
      : "";
  const lineKind =
    input.summaryVariant === "inbound" ? "Inbound voice call (customer)" : "Outbound voice call";
  const text = `📞 ${lineKind} · ${durLabel}${reason}`;
  const timestamp = new Date();

  let savedMessage;
  try {
    savedMessage = await WhatsAppMessage.create({
      conversationId: conversation._id,
      messageId: internalMessageId,
      ...(phoneId ? { businessPhoneId: phoneId } : {}),
      from: phoneId || "internal",
      to: conversation.participantPhone,
      source: "internal",
      type: "text",
      content: { text },
      status: "sent",
      statusEvents: [],
      direction: "outgoing",
      timestamp,
      conversationSnapshot: {
        participantPhone: conversation.participantPhone,
        assignedAgent: conversation.assignedAgent,
      },
    });
  } catch (e: unknown) {
    /** Unique index on (messageId, businessPhoneId) — concurrent telemetry only one insert wins. */
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code: unknown }).code : undefined;
    if (code === 11000) {
      return;
    }
    throw e;
  }

  await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
    lastMessageId: internalMessageId,
    lastMessageContent: text.substring(0, 100),
    lastMessageTime: timestamp,
    lastMessageDirection: "outgoing",
    lastOutgoingMessageTime: timestamp,
  });

  emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
    conversationId: conversation._id.toString(),
    businessPhoneId: phoneId || undefined,
    isInternal: true,
    message: {
      id: savedMessage._id.toString(),
      messageId: internalMessageId,
      from: phoneId || "internal",
      to: conversation.participantPhone,
      type: "text",
      content: { text },
      status: "sent",
      direction: "outgoing",
      timestamp,
      source: "internal",
      isInternal: true,
      senderName: "Call log",
    },
  });
}

export async function recordClientTelemetry(input: ClientTelemetryInput): Promise<void> {
  const convId = mongoose.Types.ObjectId.isValid(input.conversationId)
    ? new mongoose.Types.ObjectId(input.conversationId)
    : undefined;

  const patch: Record<string, unknown> = {
    updatedAt: new Date(),
    ...(input.stats ? { lastClientStats: input.stats } : {}),
  };

  if (typeof input.durationSeconds === "number" && input.durationSeconds >= 0) {
    patch.durationSeconds = Math.round(input.durationSeconds);
  }

  if (input.event === "client_ended") {
    patch.lifecycleStatus = "ended";
    patch.endedAt = new Date();
    if (input.disconnectReason) patch.disconnectReason = input.disconnectReason;
  } else if (input.event === "client_connected") {
    patch.lifecycleStatus = "connected";
  } else if (input.event === "client_failed") {
    patch.lifecycleStatus = "failed";
    patch.endedAt = new Date();
    if (input.disconnectReason) patch.disconnectReason = input.disconnectReason;
  }

  await WhatsAppCallLog.updateOne(
    { callId: input.callId, ...(convId ? { conversationId: convId } : {}) },
    { $set: patch },
  );

  if (
    input.event === "client_ended" &&
    input.recordChatSummary &&
    typeof input.durationSeconds === "number" &&
    input.durationSeconds >= 0
  ) {
    try {
      await createCallEndedInternalChatMessage({
        conversationId: input.conversationId,
        callId: input.callId,
        durationSeconds: input.durationSeconds,
        disconnectReason: input.disconnectReason,
        summaryVariant: input.chatSummaryVariant,
      });
    } catch (e) {
      console.warn("[callHistory] createCallEndedInternalChatMessage:", e);
    }
  }
}
