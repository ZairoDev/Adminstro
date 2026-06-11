import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import { Properties } from "@/models/property";
import Users from "@/models/user";
import { isWhatsAppAccessRole } from "@/lib/whatsapp/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const token = await getDataFromToken(req) as { role?: string };
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isWhatsAppAccessRole(token.role || "") && token.role !== "Advert") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const vsid = req.nextUrl.searchParams.get("vsid")?.trim();
    if (!vsid) {
      return NextResponse.json({ error: "vsid is required" }, { status: 400 });
    }

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

    const property = (await Properties.findOne({
      VSID: new RegExp(`^${vsid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    }).lean()) as PropertyLean | null;

    if (!property) {
      return NextResponse.json({ success: true, properties: [] });
    }

    let owner: { name?: string; email?: string; phone?: string } | null = null;
    if (property.userId) {
      owner = (await Users.findById(property.userId)
        .select("name email phone")
        .lean()) as { name?: string; email?: string; phone?: string } | null;
    }

    return NextResponse.json({
      success: true,
      properties: [
        {
          propertyId: String(property._id),
          vsid: property.VSID,
          title: property.propertyTitle || property.street || property.VSID,
          image:
            property.propertyCoverFileUrl ||
            (Array.isArray(property.propertyImages)
              ? property.propertyImages[0]
              : undefined),
          city: property.city,
          basePrice: property.basePrice,
          status: property.status,
          owner: owner
            ? { name: owner.name, email: owner.email, phone: owner.phone }
            : null,
        },
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
