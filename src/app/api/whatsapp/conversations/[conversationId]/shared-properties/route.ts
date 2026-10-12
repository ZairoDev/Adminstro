import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import { Properties } from "@/models/property";
import Users from "@/models/user";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";
import { normalizeWhatsAppToken, type WhatsAppToken } from "@/lib/whatsapp/apiContext";
import {
  extractPropertyRefsFromText,
  mergePropertyRefs,
} from "@/lib/whatsapp/propertyLinkExtractor";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  try {
    await connectDb();
    const token = (await getDataFromToken(_req)) as WhatsAppToken | null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conv = (await WhatsAppConversation.findById(params.conversationId).lean()) as {
      referenceLink?: string;
    } | null;
    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const allowed = await canAccessConversationAsync(
      normalizeWhatsAppToken(token),
      conv as Record<string, unknown>,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await WhatsAppMessage.find({
      conversationId: params.conversationId,
      direction: "outgoing",
    })
      .select("content mediaUrl type")
      .sort({ timestamp: -1 })
      .limit(200)
      .lean();

    const refLists = messages.map((msg) => {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : msg.content?.text || msg.content?.caption || "";
      const combined = [text, msg.mediaUrl || ""].filter(Boolean).join("\n");
      return extractPropertyRefsFromText(combined);
    });

    if (conv.referenceLink) {
      refLists.push(extractPropertyRefsFromText(conv.referenceLink));
    }

    const refs = mergePropertyRefs(...refLists);

    const properties = await Promise.all(
      refs.map(async (ref) => {
        type PropertyLean = {
          _id: unknown;
          VSID?: string;
          street?: string;
          propertyTitle?: string;
          propertyCoverFileUrl?: string;
          propertyImages?: string[];
          city?: string;
          basePrice?: number;
          status?: string;
          userId?: unknown;
        };

        let property: PropertyLean | null = null;
        if (ref.propertyId) {
          property = (await Properties.findById(ref.propertyId).lean()) as PropertyLean | null;
        } else if (ref.vsid) {
          property = (await Properties.findOne({ VSID: ref.vsid }).lean()) as PropertyLean | null;
        }
        if (!property) return null;

        let owner: { name?: string; email?: string; phone?: string } | null = null;
        if (property.userId) {
          owner = (await Users.findById(property.userId)
            .select("name email phone")
            .lean()) as { name?: string; email?: string; phone?: string } | null;
        }

        return {
          propertyId: String(property._id),
          vsid: property.VSID,
          title: property.propertyTitle || property.street || property.VSID,
          street: property.street,
          image:
            property.propertyCoverFileUrl ||
            (Array.isArray(property.propertyImages)
              ? property.propertyImages[0]
              : undefined),
          city: property.city,
          basePrice: property.basePrice,
          status: property.status,
          url: ref.url,
          owner: owner
            ? {
                name: owner.name,
                email: owner.email,
                phone: owner.phone,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      properties: properties.filter(Boolean),
      refs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
