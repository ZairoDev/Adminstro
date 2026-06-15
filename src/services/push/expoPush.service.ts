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

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
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

/** POSTs one chunk (max 100 messages) to Expo and returns ordered tickets. */
async function sendChunk(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
  };
  // Optional — only needed if the Expo account enforces push security.
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  const res = await fetch(EXPO_PUSH_ENDPOINT, {
    method: "POST",
    headers,
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

export async function sendExpoPushToEmployee(input: SendExpoPushInput): Promise<{
  attempted: number;
  sent: number;
  removed: number;
}> {
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
    return { attempted: 0, sent: 0, removed: 0 };
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

  // Expo accepts up to 100 messages per request.
  const chunks = chunk(messages, 100);

  let sent = 0;
  let removed = 0;
  const attempted = messages.length;

  for (const messageChunk of chunks) {
    // Retry this chunk with 0s, 1s, 3s, 7s backoff.
    const backoffs = [0, 1000, 3000, 7000];

    let tickets: ExpoPushTicket[] | null = null;
    let lastErr: any = null;

    for (let attempt = 0; attempt < backoffs.length; attempt++) {
      const waitMs = backoffs[attempt];
      if (waitMs > 0) await sleep(waitMs);

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
      continue;
    }

    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      const msg = messageChunk[i];
      if (t?.status === "ok") {
        sent += 1;
        continue;
      }

      const errCode = t?.status === "error" ? t.details?.error : undefined;
      console.warn("[push][expo] ticket error", {
        to: msg?.to,
        status: t?.status,
        message: t?.status === "error" ? t.message : undefined,
        code: errCode,
      });

      if (errCode === "DeviceNotRegistered" && msg?.to) {
        await ExpoPushTokens.deleteOne({ token: String(msg.to) });
        removed += 1;
      }
    }
  }

  return { attempted, sent, removed };
}

/** Send a test push to every device registered for the given employee. */
export async function sendExpoPushTestToEmployee(employeeId: string) {
  return sendExpoPushToEmployee({
    employeeId,
    title: "Test notification",
    body: "Push notifications are working on this device.",
    data: {
      conversationId: "__push_test__",
      messageType: "text",
      timestamp: Date.now(),
    },
    channelId: "whatsapp-messages",
  });
}
