/** Read-only: recent-activity gap analysis on production. */
import "dotenv/config";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";

const WINDOW_MS = 24 * 60 * 60 * 1000;

async function main() {
  await connectDb();
  const now = Date.now();
  const last7d = new Date(now - 7 * WINDOW_MS);
  const last30d = new Date(now - 30 * WINDOW_MS);

  const recentCustomerNoSession = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $gte: last7d },
    $or: [{ sessionExpiresAt: { $exists: false } }, { sessionExpiresAt: null }],
  });
  const recentCustomerTotal = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $gte: last7d },
  });

  const recentCustomerNoSession30d = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $gte: last30d },
    $or: [{ sessionExpiresAt: { $exists: false } }, { sessionExpiresAt: null }],
  });
  const recentCustomerTotal30d = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $gte: last30d },
  });

  const recentInboundConvIds = await WhatsAppMessage.distinct("conversationId", {
    direction: "incoming",
    timestamp: { $gte: last7d },
  });

  const recentInboundMissingAnchor = await WhatsAppConversation.countDocuments({
    _id: { $in: recentInboundConvIds },
    source: { $ne: "internal" },
    $or: [
      { lastCustomerMessageAt: { $exists: false } },
      { lastCustomerMessageAt: null },
      { sessionExpiresAt: { $exists: false } },
      { sessionExpiresAt: null },
    ],
  });

  const daily = await WhatsAppMessage.aggregate<{ _id: string; count: number }>([
    { $match: { direction: "incoming", timestamp: { $gte: last7d } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Old UI logic simulation (pre-fix): only lastCustomerMessageAtByPhone + lastCustomerMessageAt
  const activeConvIds = await WhatsAppConversation.find({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $gte: new Date(now - WINDOW_MS) },
  })
    .select("_id businessPhoneId lastCustomerMessageAt lastCustomerMessageAtByPhone")
    .lean();

  let oldUiWouldBlock = 0;
  for (const c of activeConvIds as Array<Record<string, unknown>>) {
    const phone = (c.businessPhoneId as string | undefined)?.trim();
    const byPhone = (c.lastCustomerMessageAtByPhone ?? {}) as Record<string, string | Date>;
    const fromMap = phone && byPhone[phone] ? new Date(byPhone[phone]) : null;
    const fromGlobal =
      c.lastCustomerMessageAt && c.businessPhoneId === phone
        ? new Date(c.lastCustomerMessageAt as string | Date)
        : null;
    const anchor = fromMap ?? fromGlobal;
    if (!anchor || now - anchor.getTime() >= WINDOW_MS) oldUiWouldBlock += 1;
  }

  console.log(
    JSON.stringify(
      {
        last7d: {
          customerConversations: recentCustomerTotal,
          missingSessionField: recentCustomerNoSession,
          pctMissing:
            recentCustomerTotal > 0
              ? `${((recentCustomerNoSession / recentCustomerTotal) * 100).toFixed(1)}%`
              : "0%",
        },
        last30d: {
          customerConversations: recentCustomerTotal30d,
          missingSessionField: recentCustomerNoSession30d,
        },
        recentInboundConversations7d: recentInboundConvIds.length,
        recentInboundWithMissingAnchorOrSession: recentInboundMissingAnchor,
        currentlyActiveWindows: activeConvIds.length,
        oldUiLogicWouldBlockDespiteRecentCustomerMsg: oldUiWouldBlock,
        dailyInboundLast7d: daily,
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
