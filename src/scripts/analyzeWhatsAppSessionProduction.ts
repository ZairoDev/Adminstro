/**
 * Read-only production analysis: WhatsApp 24h messaging window health.
 * Run: npx tsx src/scripts/analyzeWhatsAppSessionProduction.ts
 */
import "dotenv/config";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";

const WINDOW_MS = 24 * 60 * 60 * 1000;

function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

async function main() {
  await connectDb();
  const now = Date.now();
  const nowDate = new Date(now);
  const last24h = new Date(now - WINDOW_MS);
  const last7d = new Date(now - 7 * WINDOW_MS);

  console.log("=== WhatsApp Session Window — Production Analysis ===");
  console.log(`As of: ${nowDate.toISOString()}\n`);

  // --- Conversation inventory ---
  const totalAll = await WhatsAppConversation.countDocuments({});
  const totalExternal = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
  });
  const totalInternal = await WhatsAppConversation.countDocuments({
    $or: [{ source: "internal" }, { isInternal: true }],
  });

  console.log("--- Conversation inventory ---");
  console.log(JSON.stringify({ totalAll, totalExternal, totalInternal }, null, 2));

  // --- sessionExpiresAt coverage (investigation #7) ---
  const missingSession = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $exists: true, $ne: null },
    sessionExpiresAt: { $exists: false },
  });
  const nullSession = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $exists: true, $ne: null },
    sessionExpiresAt: null,
  });
  const neverCustomerMsg = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    $or: [
      { lastCustomerMessageAt: { $exists: false } },
      { lastCustomerMessageAt: null },
    ],
  });

  console.log("\n--- sessionExpiresAt coverage (external) ---");
  console.log(
    JSON.stringify(
      {
        hasLastCustomerMessageAtButMissingSessionField: missingSession,
        hasLastCustomerMessageAtButNullSession: nullSession,
        neverHadCustomerMessage: neverCustomerMsg,
      },
      null,
      2,
    ),
  );

  // --- Active window buckets ---
  const activeBySessionField = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    sessionExpiresAt: { $gt: nowDate },
  });
  const activeByCustomerMsg24h = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $gte: last24h },
  });
  const staleSessionButFreshCustomer = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $gte: last24h },
    sessionExpiresAt: { $lte: nowDate },
  });
  const freshSessionButStaleCustomer = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $lt: last24h },
    sessionExpiresAt: { $gt: nowDate },
  });

  console.log("\n--- Active 24h window buckets ---");
  console.log(
    JSON.stringify(
      {
        sessionExpiresAtInFuture: activeBySessionField,
        lastCustomerMessageAtWithin24h: activeByCustomerMsg24h,
        mismatch_freshCustomerButExpiredSessionField: staleSessionButFreshCustomer,
        mismatch_expiredCustomerButFutureSessionField: freshSessionButStaleCustomer,
      },
      null,
      2,
    ),
  );

  // --- Message truth vs stored anchors ---
  const newestIncoming = await WhatsAppMessage.aggregate<{
    _id: unknown;
    newest: Date;
    count: number;
  }>([
    { $match: { direction: "incoming" } },
    {
      $group: {
        _id: "$conversationId",
        newest: { $max: "$timestamp" },
        count: { $sum: 1 },
      },
    },
  ]);

  const truthMap = new Map(
    newestIncoming.map((r) => [
      String(r._id),
      { newest: new Date(r.newest), count: r.count },
    ]),
  );

  const convs = await WhatsAppConversation.find({ source: { $ne: "internal" } })
    .select(
      "_id businessPhoneId lastCustomerMessageAt sessionExpiresAt lastCustomerMessageAtByPhone lastMessageTime lastMessageDirection participantName participantPhone status",
    )
    .lean();

  let storedMissingButHasInbound = 0;
  let storedOlderThanTruth1m = 0;
  let storedOlderThanTruth1h = 0;
  let uiWouldBlockDespiteActiveWindow = 0;
  let uiWouldAllowDespiteExpiredWindow = 0;
  const driftSamples: unknown[] = [];
  const blockSamples: unknown[] = [];

  for (const c of convs as Array<Record<string, unknown>>) {
    const id = String(c._id);
    const truth = truthMap.get(id);
    if (!truth) continue;

    const stored = c.lastCustomerMessageAt
      ? new Date(c.lastCustomerMessageAt as string | Date)
      : null;
    const sessionExp = c.sessionExpiresAt
      ? new Date(c.sessionExpiresAt as string | Date)
      : null;

    if (!stored) {
      storedMissingButHasInbound += 1;
      if (driftSamples.length < 8) {
        driftSamples.push({
          kind: "missing_stored_anchor",
          id,
          truth: truth.newest,
          inboundCount: truth.count,
          sessionExpiresAt: sessionExp,
        });
      }
      continue;
    }

    const driftMs = truth.newest.getTime() - stored.getTime();
    if (driftMs > 60_000) storedOlderThanTruth1m += 1;
    if (driftMs > 3_600_000) storedOlderThanTruth1h += 1;
    if (driftMs > 60_000 && driftSamples.length < 8) {
      driftSamples.push({
        kind: "stored_older_than_truth",
        id,
        driftHours: (driftMs / 3_600_000).toFixed(1),
        stored,
        truth: truth.newest,
        sessionExpiresAt: sessionExp,
      });
    }

    // Mirror resolveSessionAnchorMs (post-fix logic)
    const phone = (c.businessPhoneId as string | undefined)?.trim();
    const byPhone = (c.lastCustomerMessageAtByPhone ?? {}) as Record<
      string,
      string | Date
    >;
    const candidates: number[] = [];
    if (phone && byPhone[phone]) {
      candidates.push(new Date(byPhone[phone]).getTime());
    }
    if (stored) candidates.push(stored.getTime());
    if (sessionExp) candidates.push(sessionExp.getTime() - WINDOW_MS);
    const anchorMs = candidates.length > 0 ? Math.max(...candidates) : null;

    const truthActive = now - truth.newest.getTime() < WINDOW_MS;
    const uiActive = anchorMs !== null && now - anchorMs < WINDOW_MS;

    if (truthActive && !uiActive) {
      uiWouldBlockDespiteActiveWindow += 1;
      if (blockSamples.length < 8) {
        blockSamples.push({
          id,
          participant: c.participantName || c.participantPhone,
          truthNewest: truth.newest,
          stored,
          sessionExpiresAt: sessionExp,
          businessPhoneId: phone,
          byPhoneForLine: phone ? byPhone[phone] ?? null : null,
          byPhoneKeys: Object.keys(byPhone),
        });
      }
    }
    if (!truthActive && uiActive) {
      uiWouldAllowDespiteExpiredWindow += 1;
    }
  }

  console.log("\n--- Stored anchor vs inbound message truth ---");
  console.log(
    JSON.stringify(
      {
        conversationsWithInboundMessages: truthMap.size,
        storedMissingButHasInbound,
        storedOlderThanTruthByOver1Minute: storedOlderThanTruth1m,
        storedOlderThanTruthByOver1Hour: storedOlderThanTruth1h,
        driftSamples,
      },
      null,
      2,
    ),
  );

  console.log("\n--- UI window simulation (post-fix resolveSessionAnchorMs) ---");
  console.log(
    JSON.stringify(
      {
        wouldIncorrectlyShowTemplateOnly: uiWouldBlockDespiteActiveWindow,
        wouldIncorrectlyAllowFreeForm: uiWouldAllowDespiteExpiredWindow,
        blockSamples,
      },
      null,
      2,
    ),
  );

  // --- Per-line map coverage ---
  const perLine = await WhatsAppMessage.aggregate<{
    _id: { conversationId: unknown; businessPhoneId: string | null };
    newest: Date;
  }>([
    { $match: { direction: "incoming" } },
    {
      $group: {
        _id: {
          conversationId: "$conversationId",
          businessPhoneId: "$businessPhoneId",
        },
        newest: { $max: "$timestamp" },
      },
    },
  ]);

  let missingByPhoneEntry = 0;
  let byPhoneStale = 0;
  for (const row of perLine) {
    const convId = String(row._id.conversationId);
    const phone = row._id.businessPhoneId?.trim();
    if (!phone) continue;
    const conv = convs.find((c) => String(c._id) === convId) as
      | Record<string, unknown>
      | undefined;
    if (!conv) continue;
    const byPhone = (conv.lastCustomerMessageAtByPhone ?? {}) as Record<
      string,
      string | Date
    >;
    const entry = byPhone[phone];
    if (!entry) {
      missingByPhoneEntry += 1;
      continue;
    }
    if (new Date(entry).getTime() < row.newest.getTime() - 60_000) {
      byPhoneStale += 1;
    }
  }

  console.log("\n--- lastCustomerMessageAtByPhone per-line map ---");
  console.log(
    JSON.stringify(
      {
        inboundConversationLinePairs: perLine.length,
        missingMapEntryForLine: missingByPhoneEntry,
        staleMapEntryOver1Minute: byPhoneStale,
      },
      null,
      2,
    ),
  );

  // --- Recent activity (last 7 days) ---
  const recentInboundMsgs = await WhatsAppMessage.countDocuments({
    direction: "incoming",
    timestamp: { $gte: last7d },
  });
  const recentConvsTouched = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    lastMessageTime: { $gte: last7d },
  });
  const recentCustomerActive = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    lastCustomerMessageAt: { $gte: last7d },
  });

  console.log("\n--- Recent activity (7d) ---");
  console.log(
    JSON.stringify(
      {
        inboundMessagesLast7d: recentInboundMsgs,
        conversationsWithAnyMessageLast7d: recentConvsTouched,
        conversationsWithCustomerMsgLast7d: recentCustomerActive,
      },
      null,
      2,
    ),
  );

  // --- Outbound-only threads (never inbound) ---
  const outboundOnly = totalExternal - truthMap.size;
  console.log("\n--- Outbound-only threads ---");
  console.log(
    JSON.stringify(
      {
        externalConversationsNeverReceivedInbound: outboundOnly,
        pctOfExternal: pct(outboundOnly, totalExternal),
        note: "These should legitimately show Template only until customer replies",
      },
      null,
      2,
    ),
  );

  // --- lastMessageTime ordering risk (inbound saved but preview newer) ---
  let inboundNewerThanPreview = 0;
  const orderingSamples: unknown[] = [];
  for (const c of convs as Array<Record<string, unknown>>) {
    const id = String(c._id);
    const truth = truthMap.get(id);
    if (!truth || !c.lastMessageTime) continue;
    const preview = new Date(c.lastMessageTime as string | Date);
    if (truth.newest.getTime() > preview.getTime() + 60_000) {
      inboundNewerThanPreview += 1;
      if (orderingSamples.length < 5) {
        orderingSamples.push({
          id,
          lastMessageTime: preview,
          newestInbound: truth.newest,
          lastMessageDirection: c.lastMessageDirection,
          gapHours: (
            (truth.newest.getTime() - preview.getTime()) /
            3_600_000
          ).toFixed(1),
        });
      }
    }
  }

  console.log("\n--- lastMessageTime vs newest inbound (webhook guard risk) ---");
  console.log(
    JSON.stringify(
      {
        conversationsWhereInboundNewerThanPreviewBy1m: inboundNewerThanPreview,
        samples: orderingSamples,
        note: "Pre-fix webhook could skip window update when lastMessageTime was already newer",
      },
      null,
      2,
    ),
  );

  // --- Currently actionable for agents ---
  const agentsCanFreeFormNow = await WhatsAppConversation.countDocuments({
    source: { $ne: "internal" },
    $or: [
      { sessionExpiresAt: { $gt: nowDate } },
      { lastCustomerMessageAt: { $gte: last24h } },
    ],
  });

  console.log("\n--- Agent impact snapshot ---");
  console.log(
    JSON.stringify(
      {
        conversationsWithOpenWindowNow_unionOfFields: agentsCanFreeFormNow,
        incorrectlyBlockedRightNow_simulation: uiWouldBlockDespiteActiveWindow,
      },
      null,
      2,
    ),
  );

  console.log("\n=== Analysis complete ===");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
