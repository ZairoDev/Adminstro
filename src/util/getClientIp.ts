export function getClientIpFromHeaders(headers: Headers): string | null {
  const headerCandidates = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "true-client-ip",
    "x-client-ip",
    "x-forwarded",
    "forwarded-for",
    "forwarded",
  ];

  for (const name of headerCandidates) {
    const val = headers.get(name);
    if (!val) continue;
    // x-forwarded-for may contain comma-separated list
    const parts = val.split(",").map((p) => p.trim()).filter(Boolean);
    // prefer first non-local address; otherwise return first
    for (const p of parts) {
      if (!isLocalOrPrivateIp(p)) return p;
    }
    if (parts.length > 0) return parts[0];
  }

  return null;
}

function isLocalOrPrivateIp(ip: string): boolean {
  if (!ip) return true;
  ip = ip.toLowerCase();
  // IPv6 loopback
  if (ip === "::1") return true;
  // IPv4 loopback
  if (ip === "127.0.0.1") return true;
  // Private IPv4 ranges
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  // IPv6 Unique local addresses (fc00::/7)
  if (/^fc|^fd/.test(ip)) return true;
  return false;
}

