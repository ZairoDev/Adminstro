import crypto from "crypto";
import { connectDb } from "@/util/db";
import FinancePayment from "@/models/financePayment";
import RazorpayWebhookLog from "@/models/razorpayWebhookLog";
import {
  isSupportedEvent,
  parseWebhookPayload,
} from "@/services/finance/razorpayWebhookParser";

type HeaderMap = Record<string, string>;

function headersToObject(headers: Headers): HeaderMap {
  const out: HeaderMap = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function hmacHex(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function signaturesMatch(expectedHex: string, incoming: string): boolean {
  const a = expectedHex.trim().toLowerCase();
  const b = incoming.trim().toLowerCase();
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return a === b;
  }
}

/**
 * Razorpay signs with the Webhook Secret configured on that webhook URL.
 * We also try RAZORPAY_API_SECRET because some dashboards were set up with the key secret by mistake.
 */
function verifySignature(
  body: string,
  signature: string | null,
): { ok: boolean; matched?: string; candidates: Array<{ name: string; length: number }> } {
  const candidates: Array<{ name: string; secret: string }> = [];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  const apiSecret = process.env.RAZORPAY_API_SECRET?.trim();

  if (webhookSecret) {
    candidates.push({ name: "RAZORPAY_WEBHOOK_SECRET", secret: webhookSecret });
  }
  if (apiSecret && apiSecret !== webhookSecret) {
    candidates.push({ name: "RAZORPAY_API_SECRET", secret: apiSecret });
  }

  const candidateMeta = candidates.map((c) => ({
    name: c.name,
    length: c.secret.length,
  }));

  if (!signature || candidates.length === 0) {
    return { ok: false, candidates: candidateMeta };
  }

  for (const candidate of candidates) {
    const expected = hmacHex(body, candidate.secret);
    if (signaturesMatch(expected, signature)) {
      return { ok: true, matched: candidate.name, candidates: candidateMeta };
    }
  }

  return { ok: false, candidates: candidateMeta };
}

async function upsertFinancePayment(
  event: string,
  payload: unknown,
): Promise<{ upserted: boolean; ignored?: boolean }> {
  const parsed = parseWebhookPayload(
    event,
    (payload as { payload?: unknown })?.payload ?? payload,
  );

  if (!parsed) {
    return { upserted: false, ignored: true };
  }

  const setFields: Record<string, unknown> = {
    ...parsed,
    lastEvent: event,
    source: "webhook",
    rawPayload: payload,
  };

  // Never overwrite existing CRM mapping fields via webhook
  delete setFields.mapped;
  delete setFields.mappedAt;
  delete setFields.mappedBy;
  delete setFields.mappedByName;
  delete setFields.bookingId;
  delete setFields.bookingObjectId;
  delete setFields.guestId;
  delete setFields.guestName;
  delete setFields.guestEmail;
  delete setFields.invoiceId;
  delete setFields.invoiceNumber;
  delete setFields.propertyId;
  delete setFields.ownerId;
  delete setFields.mappingHistory;

  for (const key of Object.keys(setFields)) {
    if (setFields[key] === undefined) {
      delete setFields[key];
    }
  }

  let existing = null;
  if (parsed.paymentId) {
    existing = await FinancePayment.findOne({ paymentId: parsed.paymentId });
  }
  if (!existing && parsed.paymentLinkId) {
    existing = await FinancePayment.findOne({
      paymentLinkId: parsed.paymentLinkId,
    });
  }

  if (existing) {
    Object.assign(existing, setFields);
    await existing.save();
    return { upserted: true };
  }

  await FinancePayment.create({
    ...setFields,
    mapped: false,
    mappingHistory: [],
  });

  return { upserted: true };
}

export type ProcessWebhookResult = {
  ok: boolean;
  statusCode: number;
  body: Record<string, unknown>;
};

export async function processRazorpayWebhook(params: {
  rawBody: string;
  signature: string | null;
  headers: Headers;
}): Promise<ProcessWebhookResult> {
  await connectDb();

  const receivedAt = new Date();
  const headerObj = headersToObject(params.headers);

  let parsedJson: Record<string, unknown> | null = null;
  try {
    parsedJson = JSON.parse(params.rawBody) as Record<string, unknown>;
  } catch {
    parsedJson = null;
  }

  const event =
    typeof parsedJson?.event === "string" ? parsedJson.event : undefined;
  const payloadRoot = parsedJson?.payload as Record<string, unknown> | undefined;
  const paymentEntity = (payloadRoot?.payment as { entity?: { id?: string } })
    ?.entity;
  const paymentLinkEntity = (
    payloadRoot?.payment_link as { entity?: { id?: string } }
  )?.entity;

  const log = await RazorpayWebhookLog.create({
    event,
    signature: params.signature ?? undefined,
    signatureVerified: false,
    headers: headerObj,
    payload: parsedJson ?? { raw: params.rawBody },
    receivedAt,
    processed: false,
    status: "received",
    paymentId: paymentEntity?.id,
    paymentLinkId: paymentLinkEntity?.id,
  });

  if (!process.env.RAZORPAY_WEBHOOK_SECRET?.trim() && !process.env.RAZORPAY_API_SECRET?.trim()) {
    await RazorpayWebhookLog.findByIdAndUpdate(log._id, {
      status: "error",
      processed: true,
      processedAt: new Date(),
      error: "Missing RAZORPAY_WEBHOOK_SECRET",
    });
    return {
      ok: false,
      statusCode: 500,
      body: { error: "Missing webhook secret" },
    };
  }

  const skipVerify =
    process.env.RAZORPAY_WEBHOOK_SKIP_VERIFY === "true" &&
    process.env.NODE_ENV !== "production";

  const verification = skipVerify
    ? { ok: true, matched: "SKIP_VERIFY", candidates: [] as Array<{ name: string; length: number }> }
    : verifySignature(params.rawBody, params.signature);

  if (!verification.ok) {
    console.error(
      "[razorpay/webhook] Invalid signature — paste the exact Webhook Secret from Razorpay Dashboard → Webhooks for this URL into RAZORPAY_WEBHOOK_SECRET, then restart the server",
      {
        hasSignature: Boolean(params.signature),
        signatureLength: params.signature?.length ?? 0,
        bodyLength: params.rawBody.length,
        event,
        triedSecrets: verification.candidates,
      },
    );
    await RazorpayWebhookLog.findByIdAndUpdate(log._id, {
      signatureVerified: false,
      status: "invalid_signature",
      processed: true,
      processedAt: new Date(),
      error: `Invalid signature (tried: ${verification.candidates.map((c) => `${c.name}:${c.length}`).join(", ") || "none"})`,
    });
    return {
      ok: false,
      statusCode: 400,
      body: { error: "Invalid signature" },
    };
  }

  if (verification.matched === "RAZORPAY_API_SECRET") {
    console.warn(
      "[razorpay/webhook] Signature matched RAZORPAY_API_SECRET — set RAZORPAY_WEBHOOK_SECRET to your Razorpay webhook secret for clarity",
    );
  }
  if (verification.matched === "SKIP_VERIFY") {
    console.warn("[razorpay/webhook] Signature verification skipped (RAZORPAY_WEBHOOK_SKIP_VERIFY=true)");
  }

  await RazorpayWebhookLog.findByIdAndUpdate(log._id, {
    signatureVerified: verification.matched !== "SKIP_VERIFY",
  });

  if (!event) {
    await RazorpayWebhookLog.findByIdAndUpdate(log._id, {
      status: "ignored",
      processed: true,
      processedAt: new Date(),
      error: "Missing event",
    });
    return { ok: true, statusCode: 200, body: { success: true, ignored: true } };
  }

  if (!isSupportedEvent(event)) {
    await RazorpayWebhookLog.findByIdAndUpdate(log._id, {
      status: "ignored",
      processed: true,
      processedAt: new Date(),
      error: `Unsupported event: ${event}`,
    });
    return {
      ok: true,
      statusCode: 200,
      body: { success: true, ignored: true, event },
    };
  }

  try {
    const result = await upsertFinancePayment(event, parsedJson);
    await RazorpayWebhookLog.findByIdAndUpdate(log._id, {
      status: result.ignored ? "ignored" : "processed",
      processed: true,
      processedAt: new Date(),
      error: result.ignored ? "No payment identifiers in payload" : undefined,
      paymentId: paymentEntity?.id,
      paymentLinkId: paymentLinkEntity?.id,
    });
    return {
      ok: true,
      statusCode: 200,
      body: { success: true, ...result, event },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    await RazorpayWebhookLog.findByIdAndUpdate(log._id, {
      status: "error",
      processed: true,
      processedAt: new Date(),
      error: message,
      retryCount: (log.retryCount ?? 0) + 1,
    });
    // Still 200 so Razorpay does not hammer retries forever after we logged
    return {
      ok: true,
      statusCode: 200,
      body: { success: false, logged: true, error: message },
    };
  }
}
