import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Offer } from "@/models/offer";
import { getDataFromToken } from "@/util/getDataFromToken";
import { computePlatformAvailability } from "@/util/salesOfferLookup";

const BodySchema = z
  .object({
    phoneNumber: z.string().trim().optional(),
    email: z.string().email().optional(),
  })
  .refine((v) => Boolean(v.phoneNumber || v.email), {
    message: "Either phoneNumber or email is required",
  });

type MatchPayload = {
  _id: string;
  phoneNumber: string;
  email: string;
  name: string;
  propertyName: string;
  relation: string;
  propertyUrl: string;
  country: string;
  state?: string;
  city?: string;
  leadStatus: string;
  offerStatus?: string;
  leadStage?: string;
  platform?: string;
  organization?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const query: Record<string, string> = {};
    if (parsed.data.phoneNumber) {
      query.phoneNumber = parsed.data.phoneNumber;
    }
    if (parsed.data.email) {
      query.email = parsed.data.email;
    }

    const matches = await Offer.find(query)
      .sort({ createdAt: -1 })
      .select(
        "_id phoneNumber email name propertyName relation propertyUrl country state city leadStatus offerStatus leadStage platform organization createdAt updatedAt",
      )
      .lean();

    const availability = computePlatformAvailability(
      matches.map((offer) => ({
        platform: typeof offer.platform === "string" ? offer.platform : undefined,
      })),
    );
    const matchedOffer = ((matches[0] ?? null) as unknown) as MatchPayload | null;

    return NextResponse.json(
      {
        ...availability,
        matchedOffer,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.log("error in finding number: ", err);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
