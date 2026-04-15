import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

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

const expo = new Expo();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDeviceNotRegisteredError(err: any): boolean {
  const details = err?.details;
  const code = details?.error;
  return code === "DeviceNotRegistered";
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
    .filter((t) => Expo.isExpoPushToken(t));

  if (expoTokens.length === 0) {
    return { attempted: 0, sent: 0, removed: 0 };
  }

  const messages: ExpoPushMessage[] = expoTokens.map((to) => ({
    to,
    title: input.title,
    body: input.body,
    data: input.data ?? {},
    sound: input.sound ?? "default",
    ...(input.channelId ? { channelId: input.channelId } : {}),
  }));

  // Expo recommends chunking for large sends.
  const chunks = expo.chunkPushNotifications(messages);

  let sent = 0;
  let removed = 0;
  let attempted = messages.length;

  for (const chunk of chunks) {
    // Retry this chunk up to 3 times with 1s, 3s, 7s backoff.
    const backoffs = [0, 1000, 3000, 7000];

    let tickets: ExpoPushTicket[] | null = null;
    let lastErr: any = null;

    for (let attempt = 0; attempt < backoffs.length; attempt++) {
      const waitMs = backoffs[attempt];
      if (waitMs > 0) await sleep(waitMs);

      try {
        tickets = await expo.sendPushNotificationsAsync(chunk);
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

    // Count successes and remove invalid tokens.
    // Ticket errors are per-message; DeviceNotRegistered can appear here too.
    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i] as any;
      const msg = chunk[i] as any;
      if (t?.status === "ok") {
        sent += 1;
        continue;
      }

      const errDetails = t?.details;
      const errCode = errDetails?.error;
      console.warn("[push][expo] ticket error", {
        to: msg?.to,
        status: t?.status,
        message: t?.message,
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

