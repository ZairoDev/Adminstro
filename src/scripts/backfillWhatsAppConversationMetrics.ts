/**
 * Backfill WhatsApp conversation analytics fields from message history.
 * Run: npx tsx src/scripts/backfillWhatsAppConversationMetrics.ts
 */
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { syncConversationMetricsFromMessages } from "@/lib/whatsapp/conversationMetricsService";

const BATCH = 100;

async function main() {
  await connectDb();
  const filter = { source: { $ne: "internal" } };
  const total = await WhatsAppConversation.countDocuments(filter);
  console.log(`Backfilling metrics for ${total} conversations…`);

  let processed = 0;
  let cursor = WhatsAppConversation.find(filter).select("_id").cursor();

  for await (const doc of cursor) {
    await syncConversationMetricsFromMessages(doc._id);
    processed += 1;
    if (processed % BATCH === 0) {
      console.log(`  ${processed}/${total} (${Math.round((processed / total) * 100)}%)`);
    }
  }

  console.log(`Done. Processed ${processed} conversations.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
