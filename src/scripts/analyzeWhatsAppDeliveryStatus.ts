/**
 * Read-only: analyze outgoing messages stuck at `sent` where later messages
 * in the same conversation reached delivered/read.
 *
 * Run: npx tsx src/scripts/analyzeWhatsAppDeliveryStatus.ts
 * Options:
 *   --days=7        lookback window (default 7)
 *   --limit=30      max messages to report (default 30)
 *   --phone=306...  optional customer filter
 */
import "dotenv/config";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WebhookInspectorEvent from "@/models/webhookInspectorEvent";
import { buildMessageDeliveryReport } from "@/lib/whatsapp/webhookInspector/report";

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
}

async function main() {
  await connectDb();

  const days = parseInt(arg("days", "7"), 10) || 7;
  const limit = parseInt(arg("limit", "30"), 10) || 30;
  const phone = arg("phone", "") || undefined;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  console.log("=== WhatsApp Delivery Status Audit ===");
  console.log(`Since: ${since.toISOString()}`);
  if (phone) console.log(`Phone filter: ${phone}`);
  console.log("");

  const match: Record<string, unknown> = {
    direction: "outgoing",
    status: { $in: ["sent", "sending"] },
    timestamp: { $gte: since },
  };
  if (phone) match.to = phone;

  const stuck = await WhatsAppMessage.find(match)
    .sort({ timestamp: -1 })
    .limit(limit * 5)
    .select("messageId conversationId to status timestamp businessPhoneId statusEvents")
    .lean();

  console.log(`Candidate stuck messages (sent/sending): ${stuck.length}`);

  const conclusions: Record<string, number> = {};
  let reported = 0;

  for (const msg of stuck) {
    const laterDelivered = await WhatsAppMessage.countDocuments({
      conversationId: msg.conversationId,
      direction: "outgoing",
      timestamp: { $gt: msg.timestamp },
      status: { $in: ["delivered", "read"] },
    });
    if (laterDelivered === 0) continue;

    reported++;
    const report = await buildMessageDeliveryReport(msg.messageId);
    const conclusion = report?.conclusion ?? "inconclusive";
    conclusions[conclusion] = (conclusions[conclusion] ?? 0) + 1;

    const inspectorCount = await WebhookInspectorEvent.countDocuments({
      messageId: msg.messageId,
    });

    console.log("---");
    console.log(`Customer: ${msg.to}`);
    console.log(`Message:  ${msg.messageId}`);
    console.log(`Sent at:  ${new Date(msg.timestamp).toISOString()}`);
    console.log(`Mongo status: ${msg.status}`);
    console.log(
      `statusEvents: ${(msg.statusEvents ?? []).map((e: { status: string }) => e.status).join(" → ") || "(none)"}`,
    );
    console.log(`Later delivered msgs in conv: ${laterDelivered}`);
    console.log(`Inspector events stored: ${inspectorCount}`);

    if (report) {
      if (report.gaps.length) {
        console.log("Gaps:");
        for (const g of report.gaps) console.log(`  - ${g}`);
      }
      console.log(`Conclusion: ${report.conclusion}`);
      if (report.timeline.length) {
        console.log("Timeline (abbreviated):");
        for (const t of report.timeline.slice(-8)) {
          console.log(`  ${t.timestamp} | ${t.stage} | ${t.detail}`);
        }
      }
    } else {
      console.log("Conclusion: message missing from report builder");
    }

    if (reported >= limit) break;
  }

  console.log("\n=== Summary ===");
  console.log(`Reported symptomatic messages: ${reported}`);
  console.log("Conclusion breakdown:", conclusions);
  console.log(
    "\nNote: Run with WEBHOOK_INSPECTOR_ENABLED=true and a phone filter",
  );
  console.log(
    "for live capture. Historical gaps without inspector data → meta_never_delivered or inconclusive.",
  );

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
