import { type NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import TravellerBookings from "@/models/travellerBooking";

/**
 * GET /api/traveller-bookings/latest
 * Polling endpoint for mobile-created bookings (shared Mongo collection).
 */
export async function GET(req: NextRequest) {
  try {
    await getDataFromToken(req);
    await connectDb();

    const { searchParams } = new URL(req.url);
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 100)
      : 50;
    const since = searchParams.get("since"); // optional ISO date — only newer rows

    const match: Record<string, unknown> = {};
    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        match.createdAt = { $gt: sinceDate };
      }
    }

    const pipeline: mongoose.PipelineStage[] = [];
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "travellers",
          localField: "travellerId",
          foreignField: "_id",
          as: "travellerDoc",
        },
      },
      {
        $lookup: {
          from: "properties",
          localField: "propertyId",
          foreignField: "_id",
          as: "propertyDoc",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "ownerDoc",
        },
      },
      {
        $addFields: {
          travellerDoc: { $arrayElemAt: ["$travellerDoc", 0] },
          propertyDoc: { $arrayElemAt: ["$propertyDoc", 0] },
          ownerDoc: { $arrayElemAt: ["$ownerDoc", 0] },
          primaryGuestName: {
            $ifNull: [
              { $arrayElemAt: ["$travellers.name", 0] },
              { $ifNull: ["$travellerDoc.name", "Guest"] },
            ],
          },
          propertyLabel: {
            $ifNull: [
              "$propertyDoc.placeName",
              {
                $ifNull: [
                  "$propertyDoc.propertyName",
                  { $ifNull: ["$propertyDoc.VSID", "Property"] },
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          startDate: 1,
          endDate: 1,
          totalNights: 1,
          price: 1,
          paymentStatus: 1,
          bookingStatus: 1,
          guests: 1,
          travellers: 1,
          notes: 1,
          createdAt: 1,
          updatedAt: 1,
          primaryGuestName: 1,
          propertyLabel: 1,
          traveller: {
            _id: "$travellerDoc._id",
            name: "$travellerDoc.name",
            email: "$travellerDoc.email",
            phone: "$travellerDoc.phone",
          },
          property: {
            _id: "$propertyDoc._id",
            placeName: "$propertyDoc.placeName",
            propertyName: "$propertyDoc.propertyName",
            city: "$propertyDoc.city",
            country: "$propertyDoc.country",
            VSID: "$propertyDoc.VSID",
            propertyCoverFileUrl: "$propertyDoc.propertyCoverFileUrl",
          },
          owner: {
            _id: "$ownerDoc._id",
            name: "$ownerDoc.name",
            email: "$ownerDoc.email",
            phone: "$ownerDoc.phone",
          },
        },
      },
    );

    const [bookings, totalCount] = await Promise.all([
      TravellerBookings.aggregate(pipeline).allowDiskUse(true).exec(),
      TravellerBookings.countDocuments(match),
    ]);

    const latestId = bookings[0]?._id ? String(bookings[0]._id) : null;
    const latestCreatedAt = bookings[0]?.createdAt ?? null;

    return NextResponse.json(
      {
        bookings,
        totalCount,
        latestId,
        latestCreatedAt,
        polledAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 },
      );
    }
    console.error("[traveller-bookings/latest]", error);
    return NextResponse.json(
      { error: "Unable to fetch traveller bookings" },
      { status: 500 },
    );
  }
}
