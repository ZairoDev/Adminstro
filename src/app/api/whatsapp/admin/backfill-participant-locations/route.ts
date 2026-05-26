import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { locationKeyFromDisplay, resolveLocationFromLeadPhone } from "@/lib/whatsapp/locationAccess";
import { isLocationAllowedForPhone } from "@/lib/whatsapp/phoneAreaConfigService";

export const dynamic = "force-dynamic";

connectDb();

type BackfillConversationLean = {
  _id: unknown;
  participantPhone?: string;
  participantLocation?: string;
  participantLocationKey?: string;
  businessPhoneId?: string;
};

/**
 * POST /api/whatsapp/admin/backfill-participant-locations
 *
 * SuperAdmin only. For every conversation where participantLocationKey is
 * empty, attempt to:
 *   1. Derive key from existing participantLocation display string
 *   2. If location is also empty, look up the CRM Query by participantPhone
 *
 * Returns counts: { total, updatedFromDisplay, updatedFromCRM, stillEmpty }
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (token.role !== "SuperAdmin") {
      return NextResponse.json({ error: "SuperAdmin only" }, { status: 403 });
    }

    // Find all conversations missing the location key
    const missing = await WhatsAppConversation.find({
      $or: [
        { participantLocationKey: { $exists: false } },
        { participantLocationKey: "" },
        { participantLocationKey: null },
      ],
      source: { $ne: "internal" },
    })
      .select("_id participantPhone participantLocation participantLocationKey businessPhoneId")
      .lean<BackfillConversationLean[]>();

    let updatedFromDisplay = 0;
    let updatedFromCRM = 0;
    let stillEmpty = 0;

    for (const conv of missing) {
      const participantPhone = conv.participantPhone?.trim() ?? "";
      if (!participantPhone) {
        stillEmpty++;
        continue;
      }

      let locationDisplay = conv.participantLocation?.trim() || "";
      let locationKey = locationDisplay ? locationKeyFromDisplay(locationDisplay) : "";

      if (!locationKey) {
        // Try CRM lookup
        const crmLocation = await resolveLocationFromLeadPhone(participantPhone);
        if (crmLocation) {
          locationDisplay = crmLocation;
          locationKey = locationKeyFromDisplay(crmLocation);
        }
      }

      if (locationKey && conv.businessPhoneId) {
        const allowed = await isLocationAllowedForPhone(
          conv.businessPhoneId,
          locationDisplay
        );
        if (!allowed) {
          stillEmpty++;
          continue;
        }
      }

      if (locationKey) {
        await WhatsAppConversation.findByIdAndUpdate(conv._id, {
          participantLocation: locationDisplay,
          participantLocationKey: locationKey,
        });

        if (conv.participantLocation?.trim()) {
          updatedFromDisplay++;
        } else {
          updatedFromCRM++;
        }
      } else {
        stillEmpty++;
      }
    }

    return NextResponse.json({
      success: true,
      total: missing.length,
      updatedFromDisplay,
      updatedFromCRM,
      stillEmpty,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Backfill participant locations error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
