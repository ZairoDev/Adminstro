/** Read-only: multi-line / byPhone map impact on active windows. */
import "dotenv/config";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";

const WINDOW_MS = 24 * 60 * 60 * 1000;

async function main() {
  await connectDb();
  const now = Date.now();
  const last24h = new Date(now - WINDOW_MS);

  const active = await WhatsAppConversation.find({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $gte: last24h },
  })
    .select("_id businessPhoneId lastCustomerMessageAt lastCustomerMessageAtByPhone sessionExpiresAt participantName")
    .lean();

  let oldUiBlocked = 0;
  let newUiBlocked = 0;
  const samples: unknown[] = [];

  for (const c of active as Array<Record<string, unknown>>) {
    const phone = (c.businessPhoneId as string | undefined)?.trim();
    const byPhone = (c.lastCustomerMessageAtByPhone ?? {}) as Record<string, string | Date>;
    const fromMap = phone && byPhone[phone] ? new Date(byPhone[phone]) : null;
    const fromGlobal =
      c.lastCustomerMessageAt && c.businessPhoneId === phone
        ? new Date(c.lastCustomerMessageAt as string | Date)
        : null;
    const oldAnchor = fromMap ?? fromGlobal;
    const oldActive = oldAnchor && now - oldAnchor.getTime() < WINDOW_MS;

    const candidates: number[] = [];
    if (fromMap) candidates.push(fromMap.getTime());
    if (c.lastCustomerMessageAt) candidates.push(new Date(c.lastCustomerMessageAt as string | Date).getTime());
    const sessionExp = c.sessionExpiresAt ? new Date(c.sessionExpiresAt as string | Date) : null;
    if (sessionExp) candidates.push(sessionExp.getTime() - WINDOW_MS);
    const newAnchorMs = candidates.length ? Math.max(...candidates) : null;
    const newActive = newAnchorMs !== null && now - newAnchorMs < WINDOW_MS;

    if (!oldActive) oldUiBlocked += 1;
    if (!newActive) newUiBlocked += 1;
    if (!oldActive && newActive && samples.length < 10) {
      samples.push({
        id: String(c._id),
        name: c.participantName,
        businessPhoneId: phone,
        hasByPhoneEntry: Boolean(phone && byPhone[phone]),
        lastCustomerMessageAt: c.lastCustomerMessageAt,
        sessionExpiresAt: c.sessionExpiresAt,
      });
    }
  }

  // Multi-line conversations (customer messaged on >1 business phone)
  const multiLine = await WhatsAppMessage.aggregate<{ count: number }>([
    { $match: { direction: "incoming" } },
    { $group: { _id: "$conversationId", lines: { $addToSet: "$businessPhoneId" } } },
    { $project: { lines: { $size: "$lines" } } },
    { $match: { lines: { $gt: 1 } } },
    { $count: "count" },
  ]);

  console.log(
    JSON.stringify(
      {
        currentlyActiveWindows: active.length,
        oldUiWouldBlock: oldUiBlocked,
        newUiWouldBlock: newUiBlocked,
        fixedByNewLogicOnly: samples,
        conversationsWithInboundOnMultipleLines: multiLine[0]?.count ?? 0,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
