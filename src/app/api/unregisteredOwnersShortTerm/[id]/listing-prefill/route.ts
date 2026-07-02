import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { unregisteredOwnerShortTerm } from "@/models/unregisteredOwnerShortTerm";
import Users from "@/models/user";

connectDb();

type OwnerSheetRow = {
  _id: unknown;
  email?: string;
  ownerUserId?: string;
  imageUrls?: unknown;
  price?: string;
  phoneNumber?: string;
  name?: string;
  propertyType?: string;
  location?: string;
  area?: string;
  address?: string;
  propertyFloor?: string;
  advertListingStatus?: string;
  propertyMongoId?: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await getDataFromToken(req);
    const owner = (await unregisteredOwnerShortTerm
      .findById(params.id)
      .lean()) as OwnerSheetRow | null;
    if (!owner) {
      return NextResponse.json({ error: "Owner sheet row not found" }, { status: 404 });
    }

    let ownerEmail = String(owner.email ?? "").trim();
    let ownerUserId = String(owner.ownerUserId ?? "");

    if (ownerUserId) {
      const user = await Users.findById(ownerUserId).select("email name phone").lean();
      if (user) {
        ownerEmail = ownerEmail || String((user as { email?: string }).email ?? "");
      }
    }

    const rawImageUrls = owner.imageUrls;
    const imageUrls = Array.isArray(rawImageUrls)
      ? rawImageUrls.filter((u): u is string => typeof u === "string")
      : [];
    const cover = imageUrls[0] ?? "";
    const gallery = imageUrls.slice(1);

    const priceNum = Number.parseFloat(String(owner.price ?? "0"));
    const basePrice = Number.isFinite(priceNum) && priceNum > 0 ? priceNum : 50;

    return NextResponse.json({
      ownerSheetId: String(owner._id),
      ownerUserId,
      email: ownerEmail,
      phone: owner.phoneNumber ?? "",
      ownerName: owner.name ?? "",
      placeName: owner.name ?? "Short-term property",
      propertyType: owner.propertyType ?? "Hotel",
      rentalType: "Short Term",
      rentalForm: "Entire place",
      numberOfPortions: 1,
      origin: "vacationsaga",
      city: owner.location ?? "",
      area: owner.area ?? "",
      address: owner.address ?? "",
      propertyFloor: owner.propertyFloor ?? "",
      basePrice,
      propertyCoverFileUrl: cover,
      propertyPictureUrls: gallery,
      advertListingStatus: owner.advertListingStatus,
      propertyMongoId: owner.propertyMongoId
        ? String(owner.propertyMongoId)
        : "",
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    return NextResponse.json(
      { error: err?.message ?? "Failed to load prefill data" },
      { status: err?.status ?? 500 },
    );
  }
}
