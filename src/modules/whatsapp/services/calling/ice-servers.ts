/**
 * ICE server utilities for WhatsApp Calling.
 *
 * Dynamic TURN credentials are fetched server-side via /api/whatsapp/ice-servers
 * which calls the Metered dynamic credentials API. No static credentials are
 * stored here.
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

/** Used by the frontend as a last-resort fallback if the ICE API request fails. */
export const CLIENT_FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];
