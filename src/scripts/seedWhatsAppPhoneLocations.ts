import "dotenv/config";

import { connectDb } from "@/util/db";
import {
  configureAllPhonesFromStaticConfig,
  getAllPhoneLocationConfigs,
} from "@/lib/whatsapp/phoneAreaConfigService";

/**
 * Seed WhatsAppPhoneAreaConfig from .env phone IDs + config.ts area mapping.
 *
 * Usage: npx tsx src/scripts/seedWhatsAppPhoneLocations.ts
 */
async function main(): Promise<void> {
  await connectDb();

  const result = await configureAllPhonesFromStaticConfig();
  const configs = await getAllPhoneLocationConfigs();

  // eslint-disable-next-line no-console
  console.log("WhatsApp phone locations configured:");
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ result, phones: configs }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
