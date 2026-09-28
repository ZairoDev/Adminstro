/**
 * Index CRM Copilot playbooks into CrmAgentKnowledge with embeddings.
 *
 * Usage:
 *   npm run crm-agent:index
 * Requires GOOGLE_GENERATIVE_AI_API_KEY in .env
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { getGoogleApiKey } from "@/services/crm-agent/config";
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
};

async function main() {
  if (!getGoogleApiKey()) {
    console.error("GOOGLE_GENERATIVE_AI_API_KEY is required");
    process.exit(1);
  }

  await connectDb();

  const files = fs.readdirSync(PLAYBOOK_DIR).filter((f) => f.endsWith(".md"));

  let upserted = 0;
  let skipped = 0;

  for (const file of files) {
    const sourcePath = `docs/crm-agent/playbooks/${file}`;
    const domain = DOMAIN_BY_FILE[file] ?? file.replace(/\.md$/, "");
    const markdown = fs.readFileSync(path.join(PLAYBOOK_DIR, file), "utf8");
    const chunks = chunkMarkdown(sourcePath, domain, markdown);
    console.log(`${file}: ${chunks.length} chunk(s)`);

    const toEmbed: PlaybookChunk[] = [];
    for (const chunk of chunks) {
      const contentHash = hashContent(chunk.content);
      const existing = await CrmAgentKnowledge.findOne({
        sourcePath: chunk.sourcePath,
        heading: chunk.heading,
      }).select("contentHash");
      if (existing && existing.contentHash === contentHash) {
        skipped += 1;
        continue;
      }
      toEmbed.push(chunk);
    }

    if (toEmbed.length === 0) continue;

    const embeddings = await embedTexts(toEmbed.map((c) => c.content));
    for (let i = 0; i < toEmbed.length; i++) {
      const chunk = toEmbed[i]!;
      const embedding = embeddings[i]!;
      await CrmAgentKnowledge.findOneAndUpdate(
        { sourcePath: chunk.sourcePath, heading: chunk.heading },
        {
          $set: {
            domain: chunk.domain,
            content: chunk.content,
            embedding,
            contentHash: hashContent(chunk.content),
          },
        },
        { upsert: true, new: true },
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
