/** Read-only: list recent inbound conversations with missing window fields. */
import "dotenv/config";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";

const WINDOW_MS = 24 * 60 * 60 * 1000;

async function main() {
  await connectDb();
  const last7d = new Date(Date.now() - 7 * WINDOW_MS);

  const recentInboundConvIds = await WhatsAppMessage.distinct("conversationId", {
    direction: "incoming",
    timestamp: { $gte: last7d },
  });

  const broken = await WhatsAppConversation.find({
    _id: { $in: recentInboundConvIds },
    source: { $ne: "internal" },
    $or: [
      { lastCustomerMessageAt: { $exists: false } },
      { lastCustomerMessageAt: null },
      { sessionExpiresAt: { $exists: false } },
      { sessionExpiresAt: null },
    ],
  })
    .select(
      "_id participantName participantPhone businessPhoneId lastCustomerMessageAt sessionExpiresAt lastMessageTime lastMessageDirection createdAt",
    )
    .lean();

  const details = [];
  for (const c of broken as Array<Record<string, unknown>>) {
    const newest = await WhatsAppMessage.findOne({
      conversationId: c._id,
      direction: "incoming",
    })
      .sort({ timestamp: -1 })
      .select("timestamp businessPhoneId messageId")
      .lean();
    details.push({
      id: String(c._id),
      name: c.participantName,
      phone: c.participantPhone,
      businessPhoneId: c.businessPhoneId,
      lastCustomerMessageAt: c.lastCustomerMessageAt ?? null,
      sessionExpiresAt: c.sessionExpiresAt ?? null,
      lastMessageTime: c.lastMessageTime,
      lastMessageDirection: c.lastMessageDirection,
      newestInbound: newest,
      createdAt: c.createdAt,
    });
  }

  console.log(JSON.stringify({ count: details.length, conversations: details }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
