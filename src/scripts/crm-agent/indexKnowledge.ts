/**
 * Index CRM Copilot playbooks into CrmAgentKnowledge with embeddings.
 *
 * Usage:
 *   npm run crm-agent:index
 * Uses local playbook embeddings (no cloud embed API). Chat uses GROQ_API_KEY.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { getEmbedModel } from "@/services/crm-agent/config";
import { connectDb } from "@/util/db";
import CrmAgentKnowledge from "@/models/crmAgentKnowledge";
import {
  chunkMarkdown,
  embedTexts,
  hashContent,
  type PlaybookChunk,
} from "@/services/crm-agent/rag/embeddings";

const PLAYBOOK_DIR = path.join(process.cwd(), "docs/crm-agent/playbooks");

const DOMAIN_BY_FILE: Record<string, string> = {
  "leads.md": "leads",
  "properties-owners.md": "properties",
  "visits-bookings.md": "visits",
  "sales-offer.md": "sales-offer",
  "whatsapp.md": "whatsapp",
  "finance.md": "finance",
  "hr-people.md": "hr",
  "roles-access.md": "roles",
  "glossary.md": "glossary",
  "people-lookup.md": "people",
  "reminders.md": "reminders",
};

async function main() {
  await connectDb();

  const embedModel = getEmbedModel();
  const files = fs.readdirSync(PLAYBOOK_DIR).filter((f) => f.endsWith(".md"));

  let upserted = 0;
  let skipped = 0;

  for (const file of files) {
    const domain = DOMAIN_BY_FILE[file];
    if (!domain) {
      console.warn(`Skip unmapped playbook: ${file}`);
      continue;
    }
    const sourcePath = `docs/crm-agent/playbooks/${file}`;
    const markdown = fs.readFileSync(path.join(PLAYBOOK_DIR, file), "utf8");
    const chunks: PlaybookChunk[] = chunkMarkdown(sourcePath, domain, markdown);
    console.log(`${file}: ${chunks.length} chunk(s)`);

    const embeddings = await embedTexts(chunks.map((c) => c.content));

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const contentHash = hashContent(`${embedModel}::${chunk.content}`);
      const existing = await CrmAgentKnowledge.findOne({
        sourcePath: chunk.sourcePath,
        heading: chunk.heading,
      })
        .select("contentHash")
        .lean();

      if (
        existing
        && (existing as { contentHash?: string }).contentHash === contentHash
      ) {
        skipped += 1;
        continue;
      }

      await CrmAgentKnowledge.findOneAndUpdate(
        { sourcePath: chunk.sourcePath, heading: chunk.heading },
        {
          $set: {
            domain: chunk.domain,
            content: chunk.content,
            contentHash,
            embedding: embeddings[i],
          },
        },
        { upsert: true },
      );
      upserted += 1;
    }
  }

  console.log(`Done. Upserted ${upserted}, skipped unchanged ${skipped}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
