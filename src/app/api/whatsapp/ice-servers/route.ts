import { NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest } from "next/server";
import { buildIceServersFromEnv } from "@/lib/whatsapp/calling/iceServers";

/**
 * GET /api/whatsapp/ice-servers
 *
 * Returns STUN + Metered TURN for the browser. Credentials come from env only:
 *
 *   TURN_USERNAME / TURN_CREDENTIAL
 *   or NEXT_PUBLIC_TURN_USERNAME / NEXT_PUBLIC_TURN_PASSWORD
 *
 * Optional: TURN_URLS (comma-separated) to override default Metered turn URLs.
 */
export async function GET(request: NextRequest) {
  try {
    await getDataFromToken(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { servers, relayConfigured } = buildIceServersFromEnv();

  return NextResponse.json({ servers, relayConfigured });
}
