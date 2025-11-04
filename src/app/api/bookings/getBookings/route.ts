import { type NextRequest, NextResponse } from "next/server";
import Bookings from "@/models/booking";
import { connectDb } from "@/util/db";
import "@/models/visit";
import "@/models/query"; // make sure this is correct for your lead collection

export async function POST(req: NextRequest) {
  await connectDb();

  try {
    const body = await req.json();
    const page = body.page ? Number.parseInt(body.page) : 1;
    const paymentStatus = body.travellerPaymentStatus || "pending"; // "pending" or "paid"
    const filters = body.filters || {};

    const limit = 50;
    const skip = (page - 1) * limit;

    // Base match before lookup (filters that do not depend on visit/lead)
    const match: any = {};

    if (filters.bookingId) {
      match.bookingId = { $regex: filters.bookingId, $options: "i" };
    }

    if (filters.propertyName) {
      match.propertyName = { $regex: filters.propertyName, $options: "i" };
    }

    if (filters.travellerPaymentStatus) {
      match["travellerPayment.status"] = filters.travellerPaymentStatus;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      match["checkIn.date"] = {};
      if (filters.startDate)
        match["checkIn.date"].$gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        match["checkIn.date"].$lte = end;
      }
    }

    // Aggregation pipeline
    const pipeline: any[] = [];

    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    // Compute total received from travellerPayment
    pipeline.push({
      $addFields: {
        sumOfPaidHistory: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: { $ifNull: ["$travellerPayment.history", []] },
                  as: "h",
                  cond: { $eq: ["$$h.status", "paid"] },
                },
              },
              as: "hp",
              in: { $ifNull: ["$$hp.amount", 0] },
            },
          },
        },
      },
    });

    pipeline.push({
      $addFields: {
        computedAmountReceived: {
          $ifNull: ["$travellerPayment.amountReceived", "$sumOfPaidHistory"],
        },
      },
    });

    // Payment status match
    if (paymentStatus === "pending") {
      pipeline.push({
        $match: {
          $or: [
            {
              "travellerPayment.status": {
                $in: ["pending", "partial", "split"],
              },
            },
            { "travellerPayment.status": { $exists: false } },
            { "travellerPayment.status": null },
          ],
        },
      });
    } else if (paymentStatus === "paid") {
      pipeline.push({
        $match: {
          "travellerPayment.status": "paid",
        },
      });
    }

    // --- Populate Visit ---
    pipeline.push({
      $lookup: {
        from: "visits",
        localField: "visit",
        foreignField: "_id",
        as: "visit",
      },
    });
    pipeline.push({
      $unwind: { path: "$visit", preserveNullAndEmptyArrays: true },
    });

    // --- Populate Lead ---
    pipeline.push({
      $lookup: {
        from: "queries", // change if your lead collection has another name
        localField: "lead",
        foreignField: "_id",
        as: "lead",
      },
    });
    pipeline.push({
      $unwind: { path: "$lead", preserveNullAndEmptyArrays: true },
    });

    // --- Filters after lookup (visit and lead fields) ---
    const postLookupMatch: any = {};

    if (filters.searchTerm) {
      const termRegex = { $regex: filters.searchTerm, $options: "i" };
      postLookupMatch.$or = [
        { bookingId: termRegex },
        { propertyName: termRegex },
        { "travellerPayment.guests.name": termRegex },
        { "travellerPayment.guests.email": termRegex },
        { note: termRegex },
        { address: termRegex },
        { "visit.ownerName": termRegex },
        { "visit.ownerPhone": termRegex },
        { "visit.ownerEmail": termRegex },
        { "lead.name": termRegex },
        { "lead.email": termRegex },
        { "lead.phoneNo": termRegex },
      ];
    }

    if (filters.guestPhone) {
      postLookupMatch.$or = postLookupMatch.$or || [];
      postLookupMatch.$or.push({
        "travellerPayment.guests.phone": {
          $regex: filters.guestPhone,
          $options: "i",
        },
      });
    }

    if (Object.keys(postLookupMatch).length > 0) {
      pipeline.push({ $match: postLookupMatch });
    }

    // Sorting + Facet for pagination
    pipeline.push({ $sort: { createdAt: -1 } });

    pipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              sumOfPaidHistory: 0,
              "visit.__v": 0,
              "lead.__v": 0,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    const aggResult = await Bookings.aggregate(pipeline)
      .allowDiskUse(true)
      .exec();

    const data = aggResult[0]?.data || [];
    const totalCount = aggResult[0]?.totalCount?.[0]?.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return NextResponse.json(
      { data, totalBookings: totalCount, totalPages },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in getting bookings:", err);
    return NextResponse.json(
      { error: "Unable to get bookings" },
      { status: 500 }
    );
  }
}
