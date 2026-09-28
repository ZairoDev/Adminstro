import CrmAgentKnowledge from "@/models/crmAgentKnowledge";
import { connectDb } from "@/util/db";
import { RAG_TOP_K } from "@/services/crm-agent/config";
import {
  cosineSimilarity,
  embedQuery,
} from "@/services/crm-agent/rag/embeddings";
import type { RetrievedChunk } from "@/services/crm-agent/types";

/**
 * In-process cosine retrieval over CrmAgentKnowledge embeddings.
 * Fine for small playbook corpora; upgrade to Atlas Vector Search later.
 */
export async function retrieveChunks(
  query: string,
  topK: number = RAG_TOP_K,
): Promise<RetrievedChunk[]> {
  await connectDb();
  const queryVec = await embedQuery(query);

  // Cap scan for safety; playbooks should stay well under this.
  const docs = await CrmAgentKnowledge.find({})
    .select("sourcePath domain heading content embedding")
    .limit(2000)
    .lean();

  const scored = docs
    .map((doc) => {
      const embedding = Array.isArray(doc.embedding) ? doc.embedding : [];
      const score = cosineSimilarity(queryVec, embedding as number[]);
      return {
        id: String(doc._id),
        sourcePath: doc.sourcePath,
        domain: doc.domain,
        heading: doc.heading,
        content: doc.content,
        score,
      };
    })
    .filter((c) => c.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No knowledge excerpts retrieved.";
  }
  return chunks
    .map(
      (c, i) =>
        `--- Excerpt ${i + 1} [source: ${c.sourcePath}#${c.heading}] (score ${c.score.toFixed(3)}) ---\n${c.content}`,
    )
    .join("\n\n");
}
