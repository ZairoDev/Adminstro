/** Read-only: verify first-message / lastMessageTime race hypothesis. */
import "dotenv/config";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";

async function main() {
  await connectDb();

  const noAnchor = await WhatsAppConversation.find({
    source: { $ne: "internal" },
    $or: [
      { lastCustomerMessageAt: { $exists: false } },
      { lastCustomerMessageAt: null },
    ],
  })
    .select("_id createdAt lastMessageTime firstMessageTime")
    .lean();

  let hasInbound = 0;
  let firstMsgRacePattern = 0;
  const samples: unknown[] = [];

  for (const c of noAnchor as Array<Record<string, unknown>>) {
    const firstInbound = await WhatsAppMessage.findOne({
      conversationId: c._id,
      direction: "incoming",
    })
      .sort({ timestamp: 1 })
      .select("timestamp")
      .lean() as { timestamp?: Date } | null;

    if (!firstInbound?.timestamp) continue;
    hasInbound += 1;

    const created = c.createdAt ? new Date(c.createdAt as string | Date).getTime() : 0;
    const inbound = new Date(firstInbound.timestamp).getTime();
    const lastMsg = c.lastMessageTime
      ? new Date(c.lastMessageTime as string | Date).getTime()
      : 0;

    // Creation lastMessageTime set to server now, ahead of Meta inbound timestamp
    const creationAheadOfInbound = lastMsg > inbound && Math.abs(created - lastMsg) < 5000;
    if (creationAheadOfInbound) firstMsgRacePattern += 1;

    if (samples.length < 8 && creationAheadOfInbound) {
      samples.push({
        id: String(c._id),
        createdAt: c.createdAt,
        firstInbound: firstInbound.timestamp,
        lastMessageTime: c.lastMessageTime,
        gapCreationToInboundMs: created - inbound,
        gapLastMsgToInboundMs: lastMsg - inbound,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        conversationsWithNoLastCustomerMessageAt: noAnchor.length,
        ofThose_haveInboundMessages: hasInbound,
        matchFirstMessageRacePattern: firstMsgRacePattern,
        pctOfInboundWithoutAnchor: hasInbound
          ? `${((firstMsgRacePattern / hasInbound) * 100).toFixed(1)}%`
          : "0%",
        samples,
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
