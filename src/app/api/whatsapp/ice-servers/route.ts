import { NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest } from "next/server";
import { CLIENT_FALLBACK_ICE_SERVERS } from "@/lib/whatsapp/calling/iceServers";

/** Google STUN appended alongside Metered servers for better srflx coverage. */
const GOOGLE_STUN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

/**
 * GET /api/whatsapp/ice-servers
 *
 * Fetches short-lived ICE credentials from the Metered dynamic API:
 *   https://adminstro.metered.live/api/v1/turn/credentials?apiKey=<METERED_API_KEY>
 *
 * Returns `{ servers: RTCIceServer[], relayConfigured: boolean, iceConfig: {...} }`.
 * Google STUN fallback servers are always appended for better reflexive candidate coverage.
 */
export async function GET(request: NextRequest) {
  try {
    await getDataFromToken(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.METERED_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[ice-servers] METERED_API_KEY not set — returning STUN fallback only");
    return NextResponse.json({
      servers: CLIENT_FALLBACK_ICE_SERVERS,
      relayConfigured: false,
      iceConfig: { source: "google-stun-fallback", reason: "METERED_API_KEY missing" },
    });
  }

  try {
    const url = `https://adminstro.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`;
    console.log("[ice-servers] fetching Metered credentials from", url.replace(apiKey, "***"));

    const meteredRes = await fetch(url, {
      cache: "no-store", // credentials are short-lived; never cache
    });

    if (!meteredRes.ok) {
      throw new Error(`Metered API ${meteredRes.status}: ${await meteredRes.text()}`);
    }

    const meteredServers = (await meteredRes.json()) as RTCIceServer[];

    if (!Array.isArray(meteredServers) || meteredServers.length === 0) {
      throw new Error("Metered API returned empty credential list");
    }

    // Summarise what Metered sent for server-side diagnostics
    const turnEntries = meteredServers.filter((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.some((u) => typeof u === "string" && (u.startsWith("turn:") || u.startsWith("turns:")));
    });
    const stunEntries = meteredServers.filter((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.some((u) => typeof u === "string" && u.startsWith("stun:"));
    });
    console.log("[ice-servers] Metered returned", {
      total: meteredServers.length,
      turnCount: turnEntries.length,
      stunCount: stunEntries.length,
      turnUrls: turnEntries.flatMap((s) => (Array.isArray(s.urls) ? s.urls : [s.urls])),
      hasCreds: turnEntries.some((s) => Boolean(s.username)),
    });

    // Merge Metered servers + Google STUN (deduplicate by URL string)
    const existingUrls = new Set(
      meteredServers.flatMap((s) => (Array.isArray(s.urls) ? s.urls : [s.urls])).map(String),
    );
    const extraStun = GOOGLE_STUN.filter(
      (s) => !existingUrls.has(String(Array.isArray(s.urls) ? s.urls[0] : s.urls)),
    );
    const servers: RTCIceServer[] = [...meteredServers, ...extraStun];

    const hasTurn = turnEntries.length > 0 && turnEntries.some((s) => Boolean(s.username));

    return NextResponse.json({
      servers,
      relayConfigured: hasTurn,
      iceConfig: {
        source: "metered-dynamic",
        totalServers: servers.length,
        meteredCount: meteredServers.length,
        turnCount: turnEntries.length,
        hasTurn,
        hasCreds: hasTurn,
      },
    });
  } catch (err) {
    console.error("[ice-servers] Failed to fetch Metered credentials:", err);
    return NextResponse.json({
      servers: CLIENT_FALLBACK_ICE_SERVERS,
      relayConfigured: false,
      iceConfig: {
        source: "google-stun-fallback",
        reason: err instanceof Error ? err.message : String(err),
      },
    });
  }
}
