export type ExtractedPropertyRef = {
  propertyId?: string;
  vsid?: string;
  url: string;
};

const LISTING_URL_RE =
  /(?:https?:\/\/)?(?:www\.)?vacationsaga\.com\/listing-stay-detail\/([a-f0-9]{24})/gi;

const VSID_TEXT_RE = /\bVSID[:\s#-]*([A-Za-z0-9]{5,12})\b/gi;

/**
 * Extract property Mongo IDs and VSIDs from message text / URLs shared in chat.
 */
export function extractPropertyRefsFromText(text: string): ExtractedPropertyRef[] {
  const refs: ExtractedPropertyRef[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  const urlRe = new RegExp(LISTING_URL_RE.source, "gi");
  while ((match = urlRe.exec(text)) !== null) {
    const propertyId = match[1];
    const url = match[0];
    const key = `id:${propertyId}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ propertyId, url });
    }
  }

  const vsidRe = new RegExp(VSID_TEXT_RE.source, "gi");
  while ((match = vsidRe.exec(text)) !== null) {
    const vsid = match[1].toUpperCase();
    const key = `vsid:${vsid}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ vsid, url: text.slice(Math.max(0, match.index - 20), match.index + 40) });
    }
  }

  return refs;
}

export function mergePropertyRefs(
  ...lists: ExtractedPropertyRef[][]
): ExtractedPropertyRef[] {
  const map = new Map<string, ExtractedPropertyRef>();
  for (const list of lists) {
    for (const ref of list) {
      const key = ref.propertyId
        ? `id:${ref.propertyId}`
        : ref.vsid
          ? `vsid:${ref.vsid}`
          : ref.url;
      if (!map.has(key)) map.set(key, ref);
    }
  }
  return [...map.values()];
}
