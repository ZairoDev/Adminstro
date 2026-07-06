/**
 * One-time backfill for the WhatsApp 24h messaging-window fields.
 *
 * Recomputes lastCustomerMessageAt, lastIncomingMessageTime,
 * lastCustomerMessageAtByPhone and sessionExpiresAt from the actual inbound
 * message history (WhatsAppMessage), instead of trusting the possibly-stale
 * conversation fields. Heals:
 *   - conversations created before sessionExpiresAt existed
 *   - conversations whose window update was skipped by the old
 *     lastMessageTime-ordering guard in the webhook
 *
 * All updates use $max, so re-running is safe (idempotent) and a live webhook
 * writing newer values concurrently can never be regressed.
 *
 * Run: npm run backfill:whatsapp-session
 */
import "dotenv/config";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import { MESSAGING_WINDOW_MS } from "@/lib/whatsapp/messagingWindow";

async function main() {
  await connectDb();

  // Newest inbound message per (conversation, business line)
  const perLine = await WhatsAppMessage.aggregate<{
    _id: { conversationId: unknown; businessPhoneId: string | null };
    newest: Date;
  }>([
    { $match: { direction: "incoming" } },
    {
      $group: {
        _id: { conversationId: "$conversationId", businessPhoneId: "$businessPhoneId" },
        newest: { $max: "$timestamp" },
      },
    },
  ]);

  type ConvAgg = { newest: Date; byPhone: Map<string, Date> };
  const byConversation = new Map<string, ConvAgg>();
  for (const row of perLine) {
    const convId = String(row._id.conversationId);
    const entry = byConversation.get(convId) ?? { newest: row.newest, byPhone: new Map() };
    if (row.newest > entry.newest) entry.newest = row.newest;
    const phone = row._id.businessPhoneId?.trim();
    if (phone) entry.byPhone.set(phone, row.newest);
    byConversation.set(convId, entry);
  }

  console.log(`Conversations with inbound history: ${byConversation.size}`);

  // Worst-case pass: inbound messages exist but lastCustomerMessageAt was never set
  // (first-message race / outbound-ahead race victims).
  const noAnchorConvs = await WhatsAppConversation.find({
    source: { $ne: "internal" },
    $or: [
      { lastCustomerMessageAt: null },
      { lastCustomerMessageAt: { $exists: false } },
    ],
  })
    .select("_id")
    .lean();

  let noAnchorHealed = 0;
  for (const conv of noAnchorConvs) {
    const latestInbound = (await WhatsAppMessage.findOne({
      conversationId: conv._id,
      direction: "incoming",
    })
      .sort({ timestamp: -1 })
      .select("timestamp businessPhoneId")
      .lean()) as { timestamp?: Date; businessPhoneId?: string } | null;

    if (!latestInbound?.timestamp) continue;

    const anchorTime = new Date(latestInbound.timestamp);
    const maxFields: Record<string, Date> = {
      lastCustomerMessageAt: anchorTime,
      lastIncomingMessageTime: anchorTime,
      sessionExpiresAt: new Date(anchorTime.getTime() + MESSAGING_WINDOW_MS),
    };
    const phone = latestInbound.businessPhoneId?.trim();
    if (phone) {
      maxFields[`lastCustomerMessageAtByPhone.${phone}`] = anchorTime;
    }

    const res = await WhatsAppConversation.updateOne(
      { _id: conv._id },
      { $max: maxFields },
    );
    if (res.modifiedCount > 0) noAnchorHealed += 1;
  }
  console.log(`No-anchor pass: ${noAnchorHealed} conversations healed from inbound history.`);

  let updated = 0;
  for (const [convId, { newest, byPhone }] of byConversation) {
    const maxFields: Record<string, Date> = {
      lastCustomerMessageAt: newest,
      lastIncomingMessageTime: newest,
      sessionExpiresAt: new Date(newest.getTime() + MESSAGING_WINDOW_MS),
    };
    for (const [phone, ts] of byPhone) {
      maxFields[`lastCustomerMessageAtByPhone.${phone}`] = ts;
    }

    const res = await WhatsAppConversation.updateOne(
      { _id: convId, source: { $ne: "internal" } },
      { $max: maxFields },
    );
    if (res.modifiedCount > 0) updated += 1;
  }

  console.log(`Done. ${updated} conversations updated from message history.`);

  // Second pass: legacy conversations that carry lastCustomerMessageAt but have
  // no inbound WhatsAppMessage docs — derive sessionExpiresAt from the field itself.
  const legacy = await WhatsAppConversation.updateMany(
    {
      source: { $ne: "internal" },
      lastCustomerMessageAt: { $exists: true, $ne: null },
      $or: [{ sessionExpiresAt: { $exists: false } }, { sessionExpiresAt: null }],
    },
    [
      {
        $set: {
          sessionExpiresAt: { $add: ["$lastCustomerMessageAt", MESSAGING_WINDOW_MS] },
          lastIncomingMessageTime: {
            $ifNull: ["$lastIncomingMessageTime", "$lastCustomerMessageAt"],
          },
        },
      },
    ],
  );
  console.log(`Legacy pass: ${legacy.modifiedCount} conversations backfilled from lastCustomerMessageAt.`);

  const stillNoAnchor = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    $or: [
      { lastCustomerMessageAt: null },
      { lastCustomerMessageAt: { $exists: false } },
    ],
  });

  // Post-migration verification (investigation query #7)
  const stillMissing = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $exists: true, $ne: null },
    $or: [{ sessionExpiresAt: { $exists: false } }, { sessionExpiresAt: null }],
  });
  console.log(`Conversations with lastCustomerMessageAt but no sessionExpiresAt: ${stillMissing}`);
  console.log(`Conversations with inbound history but no lastCustomerMessageAt: ${stillNoAnchor}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
