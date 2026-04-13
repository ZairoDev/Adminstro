import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import EmailTemplates from "@/models/emailTemplate";
import { connectDb } from "@/util/db";
import { ORGANIZATIONS, OrganizationZod, type Organization } from "@/util/organizationConstants";

function parseArgs(argv: string[]): { filePath: string; organization: Organization; name: string } {
  let filePath: string | undefined;
  let organizationRaw: string | undefined;
  let name: string | undefined;

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--org") {
      organizationRaw = argv[++i];
      continue;
    }
    if (a === "--name") {
      name = argv[++i];
      continue;
    }
    if (!a.startsWith("-")) {
      filePath = a;
    }
  }

  if (!filePath) {
    throw new Error(
      [
        "Missing file path.",
        "Usage: tsx src/scripts/importOfferTemplate.ts --org <Organization> [--name \"Template name\"] <path-to.html>",
        `Organizations: ${ORGANIZATIONS.join(", ")}`,
        'Example: tsx src/scripts/importOfferTemplate.ts --org Holidaysera --name "Holidaysera Offer Template" src/templates/sales-offer/holidaysera-offer.html',
      ].join("\n"),
    );
  }

  const orgParsed = OrganizationZod.safeParse(organizationRaw ?? "Holidaysera");
  if (!orgParsed.success) {
    throw new Error(`Invalid --org "${organizationRaw ?? ""}". Must be one of: ${ORGANIZATIONS.join(", ")}`);
  }

  const organization = orgParsed.data;
  const resolvedName = name?.trim() ? name.trim() : `${organization} Offer Template`;

  return { filePath, organization, name: resolvedName };
}

async function main() {
  const { filePath, organization, name } = parseArgs(process.argv);

  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const html = await fs.readFile(absPath, "utf8");

  await connectDb();

  await EmailTemplates.updateMany({ organization }, { $set: { isActive: false } });

  const template = await EmailTemplates.findOneAndUpdate(
    { organization, name },
    { $set: { html, isActive: true } },
    { upsert: true, new: true },
  );

  // eslint-disable-next-line no-console
  console.log(`✅ Imported template: ${String(template?._id)} (${organization} / ${name})`);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("❌ Import failed:", err);
  process.exit(1);
});
