import { createHash } from "crypto";
import {
  getEmbedModel,
  requireGoogleApiKey,
} from "@/services/crm-agent/config";

type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function embedTexts(
  texts: string[],
  taskType: EmbedTaskType = "RETRIEVAL_DOCUMENT",
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const [{ embedMany }, { createGoogleGenerativeAI }] = await Promise.all([
    import("ai"),
    import("@ai-sdk/google"),
  ]);
  const google = createGoogleGenerativeAI({ apiKey: requireGoogleApiKey() });
  const { embeddings } = await embedMany({
    model: google.embeddingModel(getEmbedModel()),
    values: texts,
    providerOptions: {
      google: { taskType },
    },
  });
  return embeddings;
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
      content: `# ${heading}\n\n${content}`,
    });
    buf = [];
  };

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      flush();
      heading = m[1].trim();
      continue;
    }
    if (line.match(/^#\s+/) && !line.match(/^##/)) {
      continue;
    }
    buf.push(line);
  }
  flush();
  return chunks;
}
