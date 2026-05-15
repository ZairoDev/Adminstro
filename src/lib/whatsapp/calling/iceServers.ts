/**
 * ICE server list for WhatsApp Calling (STUN + Metered TURN).
 * Credentials are read from environment variables only — never hardcoded.
 *
 * Server (recommended):
 *   TURN_USERNAME, TURN_CREDENTIAL
 *
 * Also supported (e.g. Hostinger / Next.js panel):
 *   NEXT_PUBLIC_TURN_USERNAME, NEXT_PUBLIC_TURN_PASSWORD
 *
 * Optional override:
 *   TURN_URLS — comma-separated turn/turns URLs (uses same username/credential)
 */

export type IceServerEntry = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type BuiltIceServers = {
  servers: IceServerEntry[];
  relayConfigured: boolean;
};

/** Metered relay hostnames (URLs are not secret). */
const METERED_STUN_URL = "stun:stun.relay.metered.ca:80";

const METERED_TURN_URLS = [
  "turn:standard.relay.metered.ca:80",
  "turn:standard.relay.metered.ca:80?transport=tcp",
  "turn:standard.relay.metered.ca:443",
  "turns:standard.relay.metered.ca:443?transport=tcp",
] as const;

const GOOGLE_STUN_FALLBACK: IceServerEntry[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export function readTurnCredentialsFromEnv(): {
  username: string;
  credential: string;
} | null {
  const username =
    process.env.TURN_USERNAME?.trim() ||
    process.env.NEXT_PUBLIC_TURN_USERNAME?.trim() ||
    "";
  const credential =
    process.env.TURN_CREDENTIAL?.trim() ||
    process.env.NEXT_PUBLIC_TURN_PASSWORD?.trim() ||
    "";
  if (!username || !credential) return null;
  return { username, credential };
}

/**
 * Build ICE servers for `/api/whatsapp/ice-servers` and server-side use.
 */
export function buildIceServersFromEnv(): BuiltIceServers {
  const creds = readTurnCredentialsFromEnv();
  if (!creds) {
    return { servers: [...GOOGLE_STUN_FALLBACK], relayConfigured: false };
  }

  const customUrls = process.env.TURN_URLS?.trim();
  const turnUrlList = customUrls
    ? customUrls.split(",").map((u) => u.trim()).filter(Boolean)
    : [...METERED_TURN_URLS];

  const servers: IceServerEntry[] = [{ urls: METERED_STUN_URL }];

  for (const url of turnUrlList) {
    servers.push({
      urls: url,
      username: creds.username,
      credential: creds.credential,
    });
  }

  return { servers, relayConfigured: true };
}

/** Client fallback when the ICE API request fails (STUN only). */
export const CLIENT_FALLBACK_ICE_SERVERS: RTCIceServer[] = GOOGLE_STUN_FALLBACK.map((s) => ({
  urls: s.urls,
}));
