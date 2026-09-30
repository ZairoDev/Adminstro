import { createHash } from "crypto";
import { LOCAL_EMBED_DIMS } from "@/services/crm-agent/config";

type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Local hashed bag-of-tokens embedding (no external API).
 * Groq has no embedding models — this keeps playbook RAG working with GROQ_API_KEY alone.
 * Re-run `npm run crm-agent:index` after switching from Gemini embeddings.
 */
function localEmbed(text: string, dims: number = LOCAL_EMBED_DIMS): number[] {
  const vec = new Array<number>(dims).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9/#.\-\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

  for (const token of tokens) {
    const h = createHash("sha256").update(token).digest();
    // Use first 8 bytes as two uint32 indices / signs
    const i1 = h.readUInt32BE(0) % dims;
    const i2 = h.readUInt32BE(4) % dims;
    const s1 = (h[8]! & 1) === 0 ? 1 : -1;
    const s2 = (h[9]! & 1) === 0 ? 1 : -1;
    vec[i1] = (vec[i1] ?? 0) + s1;
    vec[i2] = (vec[i2] ?? 0) + s2 * 0.5;
  }

  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

export async function embedTexts(
  texts: string[],
  _taskType: EmbedTaskType = "RETRIEVAL_DOCUMENT",
): Promise<number[][]> {
  if (texts.length === 0) return [];
  return texts.map((t) => localEmbed(t));
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text], "RETRIEVAL_QUERY");
  if (!vec) throw new Error("Failed to embed query");
  return vec;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface PlaybookChunk {
  sourcePath: string;
  domain: string;
  heading: string;
  content: string;
}

/** Split markdown by ## headings into retrieval chunks. */
export function chunkMarkdown(
  sourcePath: string,
  domain: string,
  markdown: string,
): PlaybookChunk[] {
  const lines = markdown.split(/\r?\n/);
  const chunks: PlaybookChunk[] = [];
  let heading = "Overview";
  let buf: string[] = [];

  const flush = () => {
    const content = buf.join("\n").trim();
    if (content.length < 40) {
      buf = [];
      return;
    }
    chunks.push({
      sourcePath,
      domain,
      heading,
      content,
    });
    buf = [];
  };

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      flush();
      heading = m[1]!.trim();
      continue;
    }
    if (line.match(/^#\s+/)) continue;
    buf.push(line);
  }
  flush();
  return chunks;
}
