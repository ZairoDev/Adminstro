import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import WhatsAppConversation from "@/models/whatsappConversation";

export const dynamic = "force-dynamic";

const WINDOW_MS = 24 * 60 * 60 * 1000;

async function requireSuperAdmin(
  req: NextRequest,
): Promise<NextResponse | null> {
  const token = (await getDataFromToken(req)) as { role?: string } | null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "SuperAdmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/** SuperAdmin: WhatsApp 24h session window field health check. */
export async function GET(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  await connectDb();

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - WINDOW_MS);

  const [inboundNoAnchor, anchorNoExpiry, recentBroken, activeWindows] =
    await Promise.all([
      WhatsAppConversation.countDocuments({
        source: { $ne: "internal" },
        $or: [
          { lastCustomerMessageAt: null },
          { lastCustomerMessageAt: { $exists: false } },
        ],
      }),
      WhatsAppConversation.countDocuments({
        source: { $ne: "internal" },
        lastCustomerMessageAt: { $exists: true, $ne: null },
        $or: [
          { sessionExpiresAt: null },
          { sessionExpiresAt: { $exists: false } },
        ],
      }),
      WhatsAppConversation.countDocuments({
        source: { $ne: "internal" },
        lastIncomingMessageTime: { $gte: oneDayAgo },
        $or: [
          { lastCustomerMessageAt: null },
          { sessionExpiresAt: null },
        ],
      }),
      WhatsAppConversation.countDocuments({
        source: { $ne: "internal" },
        sessionExpiresAt: { $gt: now },
      }),
    ]);

  const healthy = recentBroken === 0 && inboundNoAnchor === 0 && anchorNoExpiry === 0;

  return NextResponse.json({
    healthy,
    activeWindows,
    issues: {
      inboundNoAnchor,
      anchorNoExpiry,
      recentBroken,
    },
    checkedAt: now.toISOString(),
  });
}
