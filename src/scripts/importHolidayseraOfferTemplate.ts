import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import EmailTemplates from "@/models/emailTemplate";
import { connectDb } from "@/util/db";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error(
      'Missing file path. Usage: tsx src/scripts/importHolidayseraOfferTemplate.ts "C:\\\\path\\\\HS Email.html"',
    );
  }

  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const html = await fs.readFile(absPath, "utf8");

  await connectDb();

  const organization = "Holidaysera" as const;
  const name = "Holidaysera Offer Template";

  // Deactivate all other Holidaysera templates to ensure a single active template.
  await EmailTemplates.updateMany({ organization }, { $set: { isActive: false } });

  const template = await EmailTemplates.findOneAndUpdate(
    { organization, name },
    { $set: { html, isActive: true } },
    { upsert: true, new: true },
  );

  // eslint-disable-next-line no-console
  console.log(`✅ Imported template: ${template?._id} (${organization} / ${name})`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ Import failed:", err);
  process.exit(1);
});

