import ExpoPushTokens from "@/models/expoPushToken";
import { connectDb } from "@/util/db";

type PushData = Record<string, unknown>;

export type SendExpoPushInput = {
  employeeId: string;
  title: string;
  body: string;
  data?: PushData;
  sound?: "default";
  channelId?: string;
};

type ExpoPushMessage = {
  to: string;
  title?: string;
  body?: string;
  data?: PushData;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
};

type ExpoPushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

type ExpoPushReceipt =
  | { status: "ok" }
  | { status: "error"; message: string; details?: { error?: string } };

export type PushDeliveryError = {
  to?: string;
  /** Stage where the failure surfaced. */
  stage: "ticket" | "receipt";
  /** Expo/FCM error code, e.g. DeviceNotRegistered, MismatchSenderId. */
  code?: string;
  message?: string;
};

export type SendExpoPushResult = {
  attempted: number;
  /** Tickets Expo accepted (queued). */
  accepted: number;
  /** Receipts confirmed delivered (only populated when receipts are checked). */
  delivered: number;
  /** Tokens removed because they were invalid/unregistered. */
  removed: number;
  errors: PushDeliveryError[];
};

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_ENDPOINT = "https://exp.host/--/api/v2/push/getReceipts";
const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

/**
 * Validates an Expo push token without depending on `expo-server-sdk`.
 *
 * The SDK's runtime (`ExpoClient.js`) does `require('../package.json')`, which
 * breaks in bundled/standalone deployments ("Cannot find module '../package.json'").
 * We talk to Expo's HTTP API directly instead, so there is no such dependency.
 */
export function isExpoPushToken(token: unknown): token is string {
  return typeof token === "string" && EXPO_TOKEN_PATTERN.test(token.trim());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function expoHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
  };
  // Optional — only needed if the Expo account enforces push security.
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }
  return headers;
}

/** POSTs one chunk (max 100 messages) to Expo and returns ordered tickets. */
async function sendChunk(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const res = await fetch(EXPO_PUSH_ENDPOINT, {
    method: "POST",
    headers: expoHeaders(),
    body: JSON.stringify(messages),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Expo push returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(`Expo push HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  if (json?.errors) {
    throw new Error(`Expo push error: ${JSON.stringify(json.errors).slice(0, 300)}`);
  }

  const data = json?.data;
  return Array.isArray(data) ? data : data ? [data] : [];
}

/** Fetches delivery receipts for the given ticket IDs. */
async function fetchReceipts(ids: string[]): Promise<Record<string, ExpoPushReceipt>> {
  if (ids.length === 0) return {};
  const res = await fetch(EXPO_RECEIPTS_ENDPOINT, {
    method: "POST",
    headers: expoHeaders(),
    body: JSON.stringify({ ids }),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Expo receipts non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`Expo receipts HTTP ${res.status}: ${text.slice(0, 300)}`);
  return (json?.data ?? {}) as Record<string, ExpoPushReceipt>;
}

async function disableToken(token: string) {
  await ExpoPushTokens.deleteOne({ token });
}

/**
 * Sends a push to every device registered for an employee.
 *
 * @param verifyDelivery When true, waits for and inspects Expo receipts so the
 *   caller learns the *real* FCM/APNs delivery outcome (not just "queued").
 *   Used by the in-app test so failures surface on the device.
 */
export async function sendExpoPushToEmployee(
  input: SendExpoPushInput,
  verifyDelivery = false,
): Promise<SendExpoPushResult> {
  await connectDb();

  const tokens = await ExpoPushTokens.find({
    employeeId: input.employeeId,
    disabledAt: null,
  })
    .select("token")
    .lean();

  const expoTokens = tokens
    .map((t: any) => String(t.token))
    .filter((t) => isExpoPushToken(t));

  if (expoTokens.length === 0) {
    console.warn("[push][expo] no registered device tokens", {
      employeeId: input.employeeId,
    });
    return { attempted: 0, accepted: 0, delivered: 0, removed: 0, errors: [] };
  }

  const messages: ExpoPushMessage[] = expoTokens.map((to) => ({
    to,
    title: input.title,
    body: input.body,
    data: input.data ?? {},
    sound: input.sound ?? "default",
    priority: "high",
    ...(input.channelId ? { channelId: input.channelId } : {}),
  }));

  const chunks = chunk(messages, 100);

  let accepted = 0;
  let removed = 0;
  const attempted = messages.length;
  const errors: PushDeliveryError[] = [];
  // Map ticket id → token so receipt errors can be traced back to a device.
  const ticketIdToToken = new Map<string, string>();

  for (const messageChunk of chunks) {
    const backoffs = [0, 1000, 3000, 7000];
    let tickets: ExpoPushTicket[] | null = null;
    let lastErr: any = null;

    for (let attempt = 0; attempt < backoffs.length; attempt++) {
      if (backoffs[attempt] > 0) await sleep(backoffs[attempt]);
      try {
        tickets = await sendChunk(messageChunk);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!tickets) {
      console.error("[push][expo] chunk send failed", {
        error: String(lastErr?.message ?? lastErr),
      });
      errors.push({ stage: "ticket", message: String(lastErr?.message ?? lastErr) });
      continue;
    }

    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      const to = messageChunk[i]?.to;
      if (t?.status === "ok") {
        accepted += 1;
        if (t.id && to) ticketIdToToken.set(t.id, to);
        continue;
      }

      const code = t?.status === "error" ? t.details?.error : undefined;
      const message = t?.status === "error" ? t.message : "unknown ticket error";
      console.warn("[push][expo] ticket error", { to, code, message });
      errors.push({ to, stage: "ticket", code, message });

      if (code === "DeviceNotRegistered" && to) {
        await disableToken(to);
        removed += 1;
      }
    }
  }

  let delivered = 0;

  if (verifyDelivery && ticketIdToToken.size > 0) {
    // Receipts are usually ready within a few seconds for hard errors
    // (MismatchSenderId, InvalidCredentials, DeviceNotRegistered).
    await sleep(2500);
    const ids = [...ticketIdToToken.keys()];
    try {
      const receipts = await fetchReceipts(ids);
      for (const id of ids) {
        const r = receipts[id];
        if (!r) continue; // not ready yet — treat as pending, not failed
        if (r.status === "ok") {
          delivered += 1;
          continue;
        }
        const code = r.status === "error" ? r.details?.error : undefined;
        const message = r.status === "error" ? r.message : "unknown receipt error";
        const to = ticketIdToToken.get(id);
        console.warn("[push][expo] receipt error", { to, code, message });
        errors.push({ to, stage: "receipt", code, message });

        if (code === "DeviceNotRegistered" && to) {
          await disableToken(to);
          removed += 1;
        }
      }
    } catch (e) {
      console.error("[push][expo] receipt fetch failed", {
        error: String((e as any)?.message ?? e),
      });
    }
  }

  return { attempted, accepted, delivered, removed, errors };
}

export type PushTestResult = SendExpoPushResult & {
  /** Human-readable outcome for the in-app diagnostics card. */
  summary: string;
  ok: boolean;
};

/** Send a test push and verify real delivery via receipts. */
export async function sendExpoPushTestToEmployee(employeeId: string): Promise<PushTestResult> {
  const result = await sendExpoPushToEmployee(
    {
      employeeId,
      title: "Test notification",
      body: "Push notifications are working on this device.",
      data: {
        conversationId: "__push_test__",
        messageType: "text",
        timestamp: Date.now(),
      },
      channelId: "whatsapp-messages",
    },
    true,
  );

  let ok = false;
  let summary: string;

  if (result.attempted === 0) {
    summary = "No device is registered for your account.";
  } else if (result.delivered > 0) {
    ok = true;
    summary = "Delivered. You should see the notification now.";
  } else if (result.errors.length > 0) {
    const e = result.errors[0];
    summary = e.code
      ? `Delivery failed: ${e.code}${e.message ? ` — ${e.message}` : ""}`
      : `Delivery failed: ${e.message ?? "unknown error"}`;
  } else {
    // Accepted by Expo but receipt not ready yet — usually still arrives.
    ok = result.accepted > 0;
    summary = result.accepted > 0
      ? "Queued by Expo. If it doesn't arrive, check device notification settings."
      : "Could not queue the notification.";
  }

  return { ...result, ok, summary };
}
