import { NextRequest, NextResponse } from "next/server";
import { Properties, IProperty } from "@/models/property";
import { quicklisting } from "@/models/quicklisting";
import Users, { IOwner } from "@/models/user";

export async function POST(req: NextRequest) {
  const { userMobile } = await req.json();

  try {
    const user = await Users.findOne({ phone: userMobile });
    if (!user) {
      return NextResponse.json({ error: "User does not exist" }, { status: 400 });
    }

    const userId = user._id.toString();
    let totalPropertiesRaw: unknown[] = [];

    if (userId) {
      const siteListings = await Properties.find({ userId: userId }).lean();
      if (siteListings && siteListings.length) totalPropertiesRaw = [...siteListings];
    }

    const quickListings = await quicklisting.find({ ownerMobile: userMobile }).lean();
    if (quickListings && quickListings.length) totalPropertiesRaw = [...totalPropertiesRaw, ...quickListings];

    // normalize into IProperty shape (no any)
    const totalProperties: IProperty[] = totalPropertiesRaw.map((p: unknown) => {
      const pp = p as Record<string, unknown>;
      const propImages = (pp.propertyImages as unknown) || (pp.propertyPictureUrls as unknown) || [];
      return {
        _id: String(pp._id ?? pp.propertyId ?? pp.VSID ?? ""),
        VSID: String(pp.VSID ?? ""),
        userId: String(pp.userId ?? ""),
        email: (pp.email as string) ?? undefined,
        phone: (pp.phone as string) ?? undefined,
        hostedBy: (pp.hostedFrom as string) || (pp.hostedBy as string) || undefined,
        street: (pp.street as string) ?? undefined,
        city: (pp.city as string) ?? undefined,
        state: (pp.state as string) ?? undefined,
        country: (pp.country as string) ?? undefined,
        propertyImages: Array.isArray(propImages) ? (propImages as string[]) : [],
        propertyCoverFileUrl:
          (pp.propertyCoverFileUrl as string) || (Array.isArray(propImages) && (propImages as string[])[0]) || (pp.propertyPictureUrls && (pp.propertyPictureUrls as string[])[0]) || undefined,
      } as IProperty;
    });

    // Attach owner object (source of truth = Users collection)
    const owner: IOwner = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
    };

    const enriched = totalProperties.map((p) => {
      return {
        ...p,
        owner,
      };
    });

    return NextResponse.json(enriched, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Unable to fetch properties" }, { status: 400 });
  }
}
