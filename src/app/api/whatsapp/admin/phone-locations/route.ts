import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import {
  getAllPhoneLocationConfigs,
  parseLocationEntriesFromInput,
  seedPhoneLocationsFromStaticConfig,
  upsertPhoneLocations,
  bulkConfigurePhoneLocations,
  configureAllPhonesFromStaticConfig,
} from "@/lib/whatsapp/phoneAreaConfigService";
import { WHATSAPP_PHONE_CONFIGS } from "@/lib/whatsapp/config";
import {
  getMonthlyTargetCities,
  resolveLocationsAgainstMonthlyTargets,
} from "@/lib/monthly-target-locations";

export const dynamic = "force-dynamic";

connectDb();

const putSchema = z.object({
  phoneNumberId: z.string().min(1),
  locations: z.array(
    z.union([
      z.string().min(1),
      z.object({
        displayName: z.string().min(1),
        locationKey: z.string().optional(),
      }),
    ])
  ),
});

const postSchema = z.object({
  /** When true, upsert every phone from env + config.ts areas (overwrite existing). */
  configureFromEnv: z.boolean().optional(),
  /** When true, overwrite existing DB rows for phones in the payload. */
  force: z.boolean().optional(),
  phones: z
    .array(
      z.object({
        phoneNumberId: z.string().min(1),
        locations: z.array(
          z.union([
            z.string().min(1),
            z.object({
              displayName: z.string().min(1),
              locationKey: z.string().optional(),
            }),
          ])
        ).min(1),
      })
    )
    .optional(),
});

function phoneMeta(phoneNumberId: string) {
  const config = WHATSAPP_PHONE_CONFIGS.find((c) => c.phoneNumberId === phoneNumberId);
  return {
    phoneNumberId,
    displayName: config?.displayName ?? phoneNumberId,
    displayNumber: config?.displayNumber ?? "",
  };
}

/** SuperAdmin: list phone → location mappings (seeds from config if empty) */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token || (token as { role?: string }).role !== "SuperAdmin") {
      return NextResponse.json({ error: "SuperAdmin only" }, { status: 403 });
    }

    const seed = req.nextUrl.searchParams.get("seed") === "true";
    let seedResult: { seeded: number; skipped: number } | undefined;
    if (seed) {
      seedResult = await seedPhoneLocationsFromStaticConfig();
    }

    const configs = await getAllPhoneLocationConfigs();
    const availableCities = await getMonthlyTargetCities();
    const phones = configs.map((row) => ({
      ...phoneMeta(row.phoneNumberId),
      locations: row.locations,
    }));

    return NextResponse.json({ success: true, phones, availableCities, seedResult });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** SuperAdmin: save locations assigned to a WhatsApp phone line */
export async function PUT(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token || (token as { role?: string }).role !== "SuperAdmin") {
      return NextResponse.json({ error: "SuperAdmin only" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { phoneNumberId } = parsed.data;
    const knownPhone = WHATSAPP_PHONE_CONFIGS.some(
      (c) => c.phoneNumberId === phoneNumberId && !c.isInternal
    );
    if (!knownPhone) {
      return NextResponse.json({ error: "Unknown phone number id" }, { status: 400 });
    }

    const locations = parseLocationEntriesFromInput(parsed.data.locations);
    if (locations.length === 0) {
      return NextResponse.json(
        { error: "At least one location is required" },
        { status: 400 }
      );
    }

    const { resolved, invalid } = await resolveLocationsAgainstMonthlyTargets(
      locations.map((l) => l.displayName)
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: "Locations must exist in Monthly Targets",
          invalidLocations: invalid,
        },
        { status: 400 }
      );
    }

    const saved = await upsertPhoneLocations(phoneNumberId, resolved);

    return NextResponse.json({
      success: true,
      phone: { ...phoneMeta(phoneNumberId), locations: saved },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/admin/phone-locations
 *
 * Bulk configure phone → locations in DB (SuperAdmin).
 *
 * Option A — seed from env + config.ts (recommended first run):
 *   { "configureFromEnv": true }
 *
 * Option B — explicit phones:
 *   {
 *     "force": true,
 *     "phones": [
 *       { "phoneNumberId": "936359052904831", "locations": ["Athens", "Piraeus", "Glyfada"] },
 *       { "phoneNumberId": "1060145943838455", "locations": ["Thessaloniki", "Halkidiki"] }
 *     ]
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token || (token as { role?: string }).role !== "SuperAdmin") {
      return NextResponse.json({ error: "SuperAdmin only" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.configureFromEnv) {
      const result = await configureAllPhonesFromStaticConfig();
      const configs = await getAllPhoneLocationConfigs();
      return NextResponse.json({
        success: true,
        mode: "configureFromEnv",
        ...result,
        phones: configs.map((row) => ({
          ...phoneMeta(row.phoneNumberId),
          locations: row.locations,
        })),
      });
    }

    if (!parsed.data.phones?.length) {
      return NextResponse.json(
        { error: "Provide configureFromEnv: true or a phones array" },
        { status: 400 }
      );
    }

    const validatedPhones: Array<{ phoneNumberId: string; locations: string[] }> = [];
    const allInvalid: string[] = [];

    for (const phone of parsed.data.phones) {
      const labels = phone.locations.map((loc) =>
        typeof loc === "string" ? loc : loc.displayName
      );
      const { resolved, invalid } = await resolveLocationsAgainstMonthlyTargets(labels);
      if (invalid.length > 0) {
        allInvalid.push(...invalid);
        continue;
      }
      validatedPhones.push({
        phoneNumberId: phone.phoneNumberId,
        locations: resolved.map((l) => l.displayName),
      });
    }

    if (allInvalid.length > 0) {
      return NextResponse.json(
        {
          error: "Locations must exist in Monthly Targets",
          invalidLocations: [...new Set(allInvalid)],
        },
        { status: 400 }
      );
    }

    const result = await bulkConfigurePhoneLocations(validatedPhones, {
      force: parsed.data.force ?? false,
    });

    const configs = await getAllPhoneLocationConfigs();
    return NextResponse.json({
      success: true,
      mode: "phones",
      ...result,
      phones: configs.map((row) => ({
        ...phoneMeta(row.phoneNumberId),
        locations: row.locations,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
