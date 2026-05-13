import { NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest } from "next/server";

/**
 * GET /api/whatsapp/ice-servers
 *
 * Returns the WebRTC ICE server list (STUN + optional TURN) to the client.
 * TURN credentials are read from **server-side** environment variables so
 * they are never shipped in the client bundle.
 *
 * Environment variables (all optional — calls still work on open networks):
 *
 *   TURN_URLS        Comma-separated list of TURN URL(s), e.g.
 *                    "turn:your-turn.example.com:3478,turns:your-turn.example.com:5349"
 *   TURN_USERNAME    Long-term credential username
 *   TURN_CREDENTIAL  Long-term credential password
 *
 * Recommended free TURN services:
 *   - Cloudflare Calls TURN  https://developers.cloudflare.com/calls/turn/
 *   - Metered TURN           https://www.metered.ca/tools/openrelay/
 *   - Open Relay (coturn)    https://openrelay.metered.ca
 *
 * Open Relay quick-start (no sign-up, rate-limited):
 *   TURN_URLS=turn:openrelay.metered.ca:80,turn:openrelay.metered.ca:443,turns:openrelay.metered.ca:443
 *   TURN_USERNAME=openrelayproject
 *   TURN_CREDENTIAL=openrelayproject
 */
type IceServerEntry = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export async function GET(request: NextRequest) {
  try {
    await getDataFromToken(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const servers: IceServerEntry[] = [
    // Primary + secondary Google STUN — UDP 19302, works on most networks.
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrls = process.env.TURN_URLS?.trim();
  const turnUsername = process.env.TURN_USERNAME?.trim();
  const turnCredential = process.env.TURN_CREDENTIAL?.trim();

  if (turnUrls && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrls.split(",").map((u) => u.trim()).filter(Boolean),
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return NextResponse.json({ servers });
}
