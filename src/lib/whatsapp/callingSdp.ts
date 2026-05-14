/**
 * WhatsApp Cloud API Calling — SDP constraints for `POST /calls` `action: connect`.
 *
 * Meta's RFC 8866 SDP validator is strict. Chrome's `createOffer()` adds many
 * non-standard attributes (extmap, rtcp-fb, etc.) that Meta rejects with a generic
 * "SDP validation error" (error_code 138008) and empty `error_data.details`.
 *
 * Required per official docs:
 *   - OPUS only, 48 kHz media clock
 *   - 8 kHz DTMF clock (telephone-event)
 *   - ptime 20ms
 *   - Single SSRC
 *   - SHA-256 fingerprint only, uppercase "SHA-256"
 *   - a=setup:active (not actpass)
 *
 * @see https://stackoverflow.com/questions/79765999/how-to-setup-sdp-secure-connection-for-whatsapp-cloud-api-call
 * @see https://dualhook.com/docs/calling-business-initiated
 */

/**
 * Restrict audio m-line to Opus only so Chrome doesn't advertise G711, G722, etc.
 */
export function restrictPeerConnectionAudioToOpus(pc: RTCPeerConnection): void {
  if (typeof RTCRtpSender === "undefined" || typeof RTCRtpSender.getCapabilities !== "function") {
    return;
  }
  const caps = RTCRtpSender.getCapabilities("audio");
  if (!caps?.codecs?.length) return;
  // Keep Opus AND telephone-event/8000 (Meta requires 8 kHz DTMF clock)
  const allowed = caps.codecs.filter(
    (c) =>
      c.mimeType.toLowerCase() === "audio/opus" ||
      c.mimeType.toLowerCase() === "audio/telephone-event",
  );
  if (allowed.length === 0) return;

  for (const t of pc.getTransceivers()) {
    const tr = t as RTCRtpTransceiver & { stopped?: boolean };
    if (tr.stopped) continue;
    if (t.sender.track?.kind === "video" || t.receiver.track?.kind === "video") continue;
    try {
      t.setCodecPreferences(allowed);
    } catch {
      // Some browsers throw if the transceiver cannot take these prefs — safe to ignore.
    }
  }
}

/**
 * Strip Chrome-specific SDP attributes that Meta's strict RFC 8866 parser rejects, then
 * apply the WhatsApp-required field values.
 *
 * Removed:  a=extmap-allow-mixed, a=extmap:*, a=rtcp-fb:*, a=rtcp-rsize, sha-384/sha-512 fingerprints
 * Rewritten: a=fingerprint:sha-256 → SHA-256 (uppercase); a=setup:actpass → active
 * Added:    a=ptime:20 once per audio m-section
 *
 * Note: Chrome won't accept this as a local description (InvalidModificationError).
 * Use `buildCleanWhatsAppOffer` instead for the SDP sent to Meta.
 */
export function sanitizeWhatsAppCallingSdp(sdp: string): string {
  if (!sdp.trim()) return sdp;

  const out: string[] = [];
  let inAudioSection = false;
  let ptimeAdded = false;

  for (const rawLine of sdp.split(/\r?\n/)) {
    let line = rawLine.replace(/\s+$/, "");

    if (/^m=/.test(line)) {
      inAudioSection = /^m=audio\b/.test(line);
      ptimeAdded = false;
    }

    if (/^a=extmap-allow-mixed$/i.test(line)) continue;
    if (/^a=extmap:/i.test(line)) continue;
    if (/^a=rtcp-fb:/i.test(line)) continue;
    if (/^a=rtcp-rsize$/i.test(line)) continue;

    if (/^a=fingerprint:/i.test(line)) {
      const m = line.match(/^a=fingerprint:(\S+)\s+(.+)$/i);
      if (m) {
        const algo = m[1].toLowerCase().replace(/-/g, "");
        if (algo !== "sha256") continue;
        out.push(`a=fingerprint:SHA-256 ${m[2].trim()}`);
      }
      continue;
    }

    if (/^a=setup:actpass$/i.test(line)) line = "a=setup:active";

    out.push(line);

    if (inAudioSection && !ptimeAdded && /^a=rtcp-mux$/i.test(line)) {
      out.push("a=ptime:20");
      ptimeAdded = true;
    }
  }

  return out.join("\r\n");
}

/**
 * Build a minimal, RFC 8866-compliant SDP offer for Meta's Calling API.
 *
 * Chrome's `createOffer()` embeds non-RFC-8866 attributes (extmap, rtcp-fb, etc.) that
 * Meta's parser rejects with a generic "SDP Validation error".  Chrome also refuses to
 * accept a modified version via `setLocalDescription` (InvalidModificationError).
 *
 * Solution: keep Chrome's local description untouched, but extract only the ICE/DTLS
 * credentials and gathered candidates and build a brand-new minimal SDP to send Meta.
 * The DTLS fingerprint and ICE credentials are identical so the WebRTC handshake still
 * works when Meta sends back the SDP answer.
 *
 * Required by Meta (per official docs & https://dualhook.com/docs/calling-business-initiated):
 *   OPUS only · 48 kHz media clock · telephone-event/8000 · ptime 20 ms · single SSRC
 *   SHA-256 fingerprint (uppercase) · public IPv4 srflx/relay candidates only
 */

/** Diagnostic decision for a single `a=candidate:` line. */
export type CandidateDecision =
  | { keep: true }
  | {
      keep: false;
      reason: "malformed" | "mdns" | "ipv6" | "host" | "tcp" | "unsupported_type";
    };

/**
 * Parse foundation, component, transport, priority, address, port, typ from an ICE line.
 */
export function parseIceCandidateLine(
  candidateLine: string,
): { typ: string; priority: number; transport: string; address: string } | null {
  const m = candidateLine.match(
    /^a=candidate:(\S+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(\S+)\s+(\d+)\s+typ\s+(\S+)/i,
  );
  if (!m) return null;
  return {
    transport: m[3].toLowerCase(),
    priority: Number(m[4]),
    address: m[5],
    typ: m[7].toLowerCase(),
  };
}

/**
 * Decide if a single `a=candidate:` line should be kept for Meta.
 *
 * Format (RFC 5245 / RFC 8839):
 *   a=candidate:<foundation> <component> <transport> <priority>
 *               <address> <port> typ <type> [raddr <a>] [rport <p>] ...
 *
 * Meta accepts only public, routable IPv4 **server-reflexive (srflx)** or **relay**
 * candidates. Host, prflx, mDNS, IPv6, and non-UDP transports are dropped.
 */
export function classifyIceCandidate(candidateLine: string): CandidateDecision {
  const parsed = parseIceCandidateLine(candidateLine);
  if (!parsed) return { keep: false, reason: "malformed" };

  const { transport, address, typ: type } = parsed;

  if (transport !== "udp") return { keep: false, reason: "tcp" };
  if (/\.local$/i.test(address)) return { keep: false, reason: "mdns" };
  if (address.includes(":")) return { keep: false, reason: "ipv6" };
  if (type === "host") return { keep: false, reason: "host" };
  if (type !== "srflx" && type !== "relay") return { keep: false, reason: "unsupported_type" };

  return { keep: true };
}

/**
 * Order candidates for Meta: higher ICE priority first within each type; **srflx** lines
 * before **relay** (typical WhatsApp / SFU preference — get reflexive path first).
 */
export function sortIceCandidatesForMeta(candidateLines: string[]): string[] {
  const srflx: { line: string; priority: number }[] = [];
  const relay: { line: string; priority: number }[] = [];
  for (const line of candidateLines) {
    const p = parseIceCandidateLine(line);
    if (!p) continue;
    if (p.typ === "srflx") srflx.push({ line, priority: p.priority });
    else if (p.typ === "relay") relay.push({ line, priority: p.priority });
  }
  srflx.sort((a, b) => b.priority - a.priority);
  relay.sort((a, b) => b.priority - a.priority);
  return [...srflx.map((x) => x.line), ...relay.map((x) => x.line)];
}

/** Result of {@link buildCleanWhatsAppOfferDetailed}, with diagnostic info. */
export type BuildCleanOfferResult = {
  sdp: string;
  kept: string[];
  dropped: { line: string; reason: string }[];
};

export type BuildCleanWhatsAppSdpRole = "offer" | "answer";

export type BuildCleanWhatsAppOfferOptions = {
  /**
   * Meta callee SDP answers should advertise DTLS `setup:passive`.
   * Our outbound SDP offers to Meta should use `setup:active` (not actpass).
   * When omitted, `a=setup:` is taken from Chrome's generated SDP as-is.
   */
  role?: BuildCleanWhatsAppSdpRole;
};

/**
 * Build a clean SDP offer (or answer) for Meta and return diagnostic info about kept/dropped candidates.
 */
export function buildCleanWhatsAppOfferDetailed(
  localSdp: string,
  options?: BuildCleanWhatsAppOfferOptions,
): BuildCleanOfferResult {
  const lines = localSdp.split(/\r?\n/);

  let iceUfrag = "";
  let icePwd = "";
  let fingerprintHash = "";
  let mid = "0";
  let setup = "actpass";
  let ssrcCname = "";
  let inAudioSection = false;
  const rawCandidates: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");

    if (/^m=/.test(line)) {
      inAudioSection = /^m=audio\b/.test(line);
      continue;
    }

    if (!inAudioSection && /^a=fingerprint:sha-256\s/i.test(line)) {
      if (!fingerprintHash) {
        fingerprintHash = line.replace(/^a=fingerprint:\S+\s+/i, "").trim();
      }
      continue;
    }

    if (!inAudioSection) continue;

    if (/^a=ice-ufrag:/i.test(line)) {
      iceUfrag = line.slice("a=ice-ufrag:".length).trim();
    } else if (/^a=ice-pwd:/i.test(line)) {
      icePwd = line.slice("a=ice-pwd:".length).trim();
    } else if (/^a=fingerprint:sha-256\s/i.test(line)) {
      fingerprintHash = line.replace(/^a=fingerprint:\S+\s+/i, "").trim();
    } else if (/^a=mid:/i.test(line)) {
      mid = line.slice("a=mid:".length).trim();
    } else if (/^a=setup:/i.test(line)) {
      const v = line.slice("a=setup:".length).trim().toLowerCase();
      if (v === "active" || v === "passive" || v === "actpass") setup = v;
    } else if (/^a=candidate:/i.test(line)) {
      rawCandidates.push(line);
    } else if (/^a=ssrc:\d+\s+cname:/i.test(line) && !ssrcCname) {
      ssrcCname = line;
    }
  }

  const keptRaw: string[] = [];
  const dropped: { line: string; reason: string }[] = [];
  for (const c of rawCandidates) {
    const decision = classifyIceCandidate(c);
    if (decision.keep) keptRaw.push(c);
    else dropped.push({ line: c, reason: decision.reason });
  }
  const kept = sortIceCandidatesForMeta(keptRaw);

  // If credentials couldn't be extracted (shouldn't happen for a real Chrome offer),
  // fall back to the sanitize-only approach so we at least try with something.
  if (!iceUfrag || !icePwd || !fingerprintHash) {
    return { sdp: sanitizeWhatsAppCallingSdp(localSdp), kept, dropped };
  }

  if (options?.role === "answer") {
    setup = "passive";
  } else if (options?.role === "offer") {
    if (setup === "actpass" || setup === "passive") setup = "active";
  }

  const sessionId = String(Date.now()).slice(-10);

  const out: string[] = [
    "v=0",
    `o=- ${sessionId} 2 IN IP4 0.0.0.0`,
    "s=-",
    "t=0 0",
    `a=group:BUNDLE ${mid}`,
    "m=audio 9 UDP/TLS/RTP/SAVPF 111 126",
    "c=IN IP4 0.0.0.0",
    "a=rtcp:9 IN IP4 0.0.0.0",
    `a=ice-ufrag:${iceUfrag}`,
    `a=ice-pwd:${icePwd}`,
    `a=fingerprint:SHA-256 ${fingerprintHash}`,
    `a=setup:${setup}`,
    `a=mid:${mid}`,
    "a=sendrecv",
    "a=rtcp-mux",
    "a=rtpmap:111 opus/48000/2",
    "a=fmtp:111 minptime=10;useinbandfec=1",
    "a=ptime:20",
    "a=rtpmap:126 telephone-event/8000",
    "a=fmtp:126 0-15",
    ...kept,
    "a=end-of-candidates",
  ];
  if (ssrcCname) out.push(ssrcCname);
  out.push(""); // ensures trailing CRLF

  return { sdp: out.join("\r\n"), kept, dropped };
}

/** Convenience wrapper that returns only the SDP string. */
export function buildCleanWhatsAppOffer(localSdp: string, options?: BuildCleanWhatsAppOfferOptions): string {
  return buildCleanWhatsAppOfferDetailed(localSdp, options).sdp;
}

/**
 * Lightweight RFC 8866 sanity check on the generated SDP. Returns an array of problems
 * (empty if the SDP looks well-formed). Use only for diagnostic logging — never block
 * sending based on these results, since Meta may accept things we flag.
 */
export function validateWhatsAppCallingSdp(sdp: string): string[] {
  const problems: string[] = [];
  if (!/\r\n/.test(sdp)) problems.push("missing CRLF line endings");
  if (!/^v=0/.test(sdp)) problems.push("missing v=0");
  if (!/^m=audio\s/m.test(sdp)) problems.push("missing m=audio section");

  const audioCount = (sdp.match(/^m=audio\s/gm) ?? []).length;
  if (audioCount > 1) problems.push(`multiple m=audio sections (${audioCount})`);

  if (!/^a=fingerprint:SHA-256\s/m.test(sdp)) problems.push("missing SHA-256 fingerprint");
  if (!/^a=ice-ufrag:/m.test(sdp)) problems.push("missing a=ice-ufrag");
  if (!/^a=ice-pwd:/m.test(sdp)) problems.push("missing a=ice-pwd");
  if (!/^a=rtpmap:111 opus\/48000\/2/m.test(sdp)) problems.push("missing Opus rtpmap (111)");
  if (!/^a=rtpmap:126 telephone-event\/8000/m.test(sdp)) {
    problems.push("missing telephone-event rtpmap (126)");
  }
  if (!/^a=rtcp-mux/m.test(sdp)) problems.push("missing a=rtcp-mux");

  for (const line of sdp.split(/\r?\n/)) {
    if (!/^a=candidate:/i.test(line)) continue;
    const d = classifyIceCandidate(line);
    if (!d.keep) problems.push(`invalid candidate (${d.reason}): ${line}`);
  }

  return problems;
}

/**
 * Normalize Meta's SDP **answer** before `setRemoteDescription` in Chrome.
 * Mirrors the fingerprint rules used for outbound offers: keep only SHA-256, uppercase
 * `SHA-256`, drop sha-384 / sha-512 lines (Chrome may choke or mis-parse otherwise).
 */
export function sanitizeMetaAnswerSdpForBrowser(sdp: string): string {
  if (!sdp.trim()) return sdp;

  const out: string[] = [];
  for (const raw of sdp.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (/^a=fingerprint:/i.test(line)) {
      const m = line.match(/^a=fingerprint:(\S+)\s+(.*)$/i);
      if (m) {
        const algo = m[1].toLowerCase().replace(/-/g, "");
        if (algo !== "sha256") continue;
        out.push(`a=fingerprint:SHA-256 ${m[2].trim()}`);
      }
      continue;
    }
    out.push(line);
  }
  return out.join("\r\n");
}

/** Meta → browser `setRemoteDescription` for an inbound **offer** (same fingerprint rules as answers). */
export function sanitizeMetaOfferSdpForBrowser(sdp: string): string {
  return sanitizeMetaAnswerSdpForBrowser(sdp);
}
