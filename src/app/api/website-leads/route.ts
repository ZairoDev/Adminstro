import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import WebsiteLeads from "@/models/websiteLeads";
import TravellerBookings from "@/models/travellerBooking";
import { Properties } from "@/models/property";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import type { NotesInterface } from "@/util/type";

type LeadSource = "all" | "web" | "mobile";

connectDb();
export const dynamic = "force-dynamic";

const addNoteSchema = z.object({
  action: z.literal("addNote"),
  leadId: z.string().min(1),
  note: z.string().min(1).max(8000),
});

const updateLeadSchema = z
  .object({
    action: z.literal("updateLead"),
    leadId: z.string().min(1),
    telephone: z.string().optional(),
    email: z.string().optional(),
  })
  .refine(
    (d) => typeof d.telephone === "string" || typeof d.email === "string",
    { message: "telephone or email required", path: ["telephone"] }
  );

const patchSchema = z.union([addNoteSchema, updateLeadSchema]);

function normalizeNotes(note: unknown): NotesInterface[] {
  if (Array.isArray(note)) {
    return note
      .filter(
        (n): n is NotesInterface =>
          typeof n === "object" &&
          n !== null &&
          "noteData" in n &&
          typeof (n as NotesInterface).noteData === "string"
      )
      .map((n) => ({
        noteData: n.noteData,
        createdBy: n.createdBy ?? "",
        createOn: n.createOn ?? "",
      }));
  }
  if (typeof note === "string" && note.trim()) {
    return [
      {
        noteData: note.trim(),
        createdBy: "Legacy",
        createOn: "",
      },
    ];
  }
  return [];
}

function serializeWebsiteLead(
  lead: Record<string, unknown>
): Record<string, unknown> {
  return { ...lead, note: normalizeNotes(lead.note) };
}

/** Public site listing URLs use MongoDB property id, not VSID — resolve VSID → _id. */
async function enrichLeadsWithPropertyMongoId(
  leads: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const vsids = [
    ...new Set(
      leads
        .map((l) => l.VSID)
        .filter((v): v is string => typeof v === "string" && v.length > 0)
    ),
  ];
  if (vsids.length === 0) {
    return leads.map((l) => ({ ...l, propertyMongoId: null }));
  }

  const props = await Properties.find({ VSID: { $in: vsids } })
    .select({ VSID: 1 })
    .lean();

  const vsidToMongo = new Map<string, string>();
  for (const p of props) {
    const doc = p as { VSID?: string; _id: mongoose.Types.ObjectId };
    if (doc.VSID) {
      vsidToMongo.set(doc.VSID, String(doc._id));
    }
  }

  return leads.map((l) => {
    const vsid = typeof l.VSID === "string" ? l.VSID : "";
    return {
      ...l,
      propertyMongoId: vsid && vsidToMongo.has(vsid) ? vsidToMongo.get(vsid)! : null,
    };
  });
}

let legacyStringNotesBatchMigrated = false;

/** Converts legacy `note: string` documents to the NotesInterface[] shape (runs once per process). */
async function migrateLegacyStringNotesBatch(): Promise<void> {
  if (legacyStringNotesBatchMigrated) return;
  legacyStringNotesBatchMigrated = true;
  try {
    const result = await WebsiteLeads.collection.updateMany(
      { note: { $type: "string" } },
      [
        {
          $set: {
            note: [
              {
                noteData: "$note",
                createdBy: "Legacy",
                createOn: "",
              },
            ],
          },
        },
      ]
    );
    if (result.modifiedCount > 0) {
      console.info(
        `[website-leads] Migrated ${result.modifiedCount} legacy string note(s) to array shape`
      );
    }
  } catch (err) {
    console.error("[website-leads] Legacy note batch migration failed:", err);
  }
}

async function migrateLegacyNoteIfNeeded(leadId: string): Promise<void> {
  let oid: mongoose.Types.ObjectId;
  try {
    oid = new mongoose.Types.ObjectId(leadId);
  } catch {
    return;
  }
  const doc = await WebsiteLeads.collection.findOne({ _id: oid });
  if (!doc || typeof doc.note !== "string" || !String(doc.note).trim()) {
    return;
  }
  await WebsiteLeads.collection.updateOne(
    { _id: oid },
    {
      $set: {
        note: [
          {
            noteData: String(doc.note).trim(),
            createdBy: "Legacy",
            createOn: "",
          },
        ],
      },
    }
  );
}

function unclaimedWebMatch(): Record<string, unknown> {
  return {
    $or: [{ queryId: null }, { queryId: { $exists: false } }],
  };
}

function unclaimedMobileMatch(): Record<string, unknown> {
  return {
    $or: [
      { salesLeadQueryId: null },
      { salesLeadQueryId: { $exists: false } },
    ],
  };
}

function buildWebMatch(
  searchTerm: string,
  searchType: string
): Record<string, unknown> {
  if (!searchTerm) return {};
  const regex = new RegExp(searchTerm, "i");
  if (searchType === "name") {
    return { $or: [{ firstName: regex }, { lastName: regex }] };
  }
  if (searchType === "telephone" || searchType === "email" || searchType === "VSID") {
    return { [searchType]: regex };
  }
  return { $or: [{ firstName: regex }, { lastName: regex }] };
}

function mobileSearchMatch(
  searchTerm: string,
  searchType: string
): Record<string, unknown> | null {
  if (!searchTerm) return null;
  const regex = new RegExp(searchTerm, "i");
  if (searchType === "name") {
    return {
      $or: [
        { "travellers.name": regex },
        { "travellerDoc.name": regex },
        { primaryGuestName: regex },
      ],
    };
  }
  if (searchType === "telephone") {
    return { "travellerDoc.phone": regex };
  }
  if (searchType === "email") {
    return { "travellerDoc.email": regex };
  }
  if (searchType === "VSID") {
    return { "propertyDoc.VSID": regex };
  }
  return {
    $or: [
      { "travellers.name": regex },
      { "travellerDoc.name": regex },
      { primaryGuestName: regex },
    ],
  };
}

function mobileBookingsPipeline(
  searchTerm: string,
  searchType: string,
  includeTaken: boolean
): mongoose.PipelineStage[] {
  const pipeline: mongoose.PipelineStage[] = [];

  if (!includeTaken) {
    pipeline.push({ $match: unclaimedMobileMatch() });
  }

  pipeline.push(
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
      $addFields: {
        travellerDoc: { $arrayElemAt: ["$travellerDoc", 0] },
        propertyDoc: { $arrayElemAt: ["$propertyDoc", 0] },
        primaryGuestName: {
          $ifNull: [
            { $arrayElemAt: ["$travellers.name", 0] },
            { $ifNull: ["$travellerDoc.name", "Guest"] },
          ],
        },
      },
    },
  );

  const searchMatch = mobileSearchMatch(searchTerm, searchType);
  if (searchMatch) {
    pipeline.push({ $match: searchMatch });
  }

  pipeline.push({
    $project: {
      _id: 1,
      source: { $literal: "mobile" },
      firstName: {
        $let: {
          vars: {
            parts: { $split: [{ $ifNull: ["$primaryGuestName", "Guest"] }, " "] },
          },
          in: { $arrayElemAt: ["$$parts", 0] },
        },
      },
      lastName: {
        $let: {
          vars: {
            parts: { $split: [{ $ifNull: ["$primaryGuestName", "Guest"] }, " "] },
          },
          in: {
            $cond: [
              { $gt: [{ $size: "$$parts" }, 1] },
              {
                $reduce: {
                  input: { $slice: ["$$parts", 1, { $size: "$$parts" }] },
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      { $cond: [{ $eq: ["$$value", ""] }, "", " "] },
                      "$$this",
                    ],
                  },
                },
              },
              "",
            ],
          },
        },
      },
      telephone: { $ifNull: ["$travellerDoc.phone", ""] },
      email: { $ifNull: ["$travellerDoc.email", ""] },
      VSID: { $ifNull: ["$propertyDoc.VSID", ""] },
      propertyMongoId: {
        $cond: [
          { $ifNull: ["$propertyId", false] },
          { $toString: "$propertyId" },
          null,
        ],
      },
      message: {
        $concat: [
          "Mobile booking · ",
          { $ifNull: ["$bookingStatus", "pending"] },
          " · pay ",
          { $ifNull: ["$paymentStatus", "pending"] },
        ],
      },
      note: { $literal: [] },
      bookingStatus: 1,
      paymentStatus: 1,
      price: 1,
      startDate: 1,
      endDate: 1,
      totalNights: 1,
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
      propertyCity: { $ifNull: ["$propertyDoc.city", ""] },
      propertyCountry: { $ifNull: ["$propertyDoc.country", ""] },
      claimedBy: { $ifNull: ["$salesLeadClaimedBy", null] },
      claimedAt: { $ifNull: ["$salesLeadClaimedAt", null] },
      queryId: {
        $cond: [
          { $ifNull: ["$salesLeadQueryId", false] },
          { $toString: "$salesLeadQueryId" },
          null,
        ],
      },
      createdAt: 1,
      updatedAt: 1,
    },
  });

  return pipeline;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await migrateLegacyStringNotesBatch();

    const url = request.nextUrl;
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "name";
    const sourceParam = (url.searchParams.get("source") || "all").toLowerCase();
    const source: LeadSource =
      sourceParam === "web" || sourceParam === "mobile" ? sourceParam : "all";
    const includeTaken =
      url.searchParams.get("includeTaken") === "1" ||
      url.searchParams.get("includeTaken") === "true";

    const searchMatch = buildWebMatch(searchTerm, searchType);
    const webMatch: Record<string, unknown> = includeTaken
      ? { ...searchMatch }
      : Object.keys(searchMatch).length > 0
        ? { $and: [searchMatch, unclaimedWebMatch()] }
        : unclaimedWebMatch();

    // Web-only: keep the original simple path (notes + property enrich).
    if (source === "web") {
      const leadsRaw = await WebsiteLeads.find(webMatch)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const serialized = leadsRaw.map((l) => ({
        ...serializeWebsiteLead(l as Record<string, unknown>),
        source: "web" as const,
        queryId: l.queryId ? String(l.queryId) : null,
        claimedBy: (l as { claimedBy?: string }).claimedBy ?? null,
        claimedAt: (l as { claimedAt?: Date }).claimedAt ?? null,
      }));
      const leads = await enrichLeadsWithPropertyMongoId(serialized);
      const totalLeads = await WebsiteLeads.countDocuments(webMatch);
      const totalPages = Math.ceil(totalLeads / limit) || 1;

      return NextResponse.json({
        data: leads,
        page,
        totalPages,
        totalLeads,
        includeTaken,
        counts: { web: totalLeads, mobile: 0, all: totalLeads },
      });
    }

    // Mobile-only
    if (source === "mobile") {
      const pipeline = [
        ...mobileBookingsPipeline(searchTerm, searchType, includeTaken),
        {
          $facet: {
            data: [
              { $sort: { createdAt: -1 as const } },
              { $skip: skip },
              { $limit: limit },
            ],
            total: [{ $count: "count" }],
          },
        },
      ];
      const [facet] = await TravellerBookings.aggregate(pipeline).exec();
      const leads = facet?.data ?? [];
      const totalLeads = facet?.total?.[0]?.count ?? 0;
      const totalPages = Math.ceil(totalLeads / limit) || 1;

      return NextResponse.json({
        data: leads,
        page,
        totalPages,
        totalLeads,
        includeTaken,
        counts: { web: 0, mobile: totalLeads, all: totalLeads },
      });
    }

    // All: union website leads + mobile bookings, sort by createdAt.
    const pipeline: mongoose.PipelineStage[] = [
      { $match: webMatch },
      {
        $addFields: {
          source: "web",
          propertyMongoId: null,
        },
      },
      {
        $project: {
          _id: 1,
          source: 1,
          firstName: 1,
          lastName: 1,
          telephone: 1,
          email: 1,
          VSID: 1,
          message: 1,
          note: 1,
          propertyMongoId: 1,
          claimedBy: 1,
          claimedAt: 1,
          queryId: {
            $cond: [
              { $ifNull: ["$queryId", false] },
              { $toString: "$queryId" },
              null,
            ],
          },
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $unionWith: {
          coll: "travellerBookings",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pipeline: mobileBookingsPipeline(
            searchTerm,
            searchType,
            includeTaken
          ) as any,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: "count" }],
          webCount: [
            { $match: { source: "web" } },
            { $count: "count" },
          ],
          mobileCount: [
            { $match: { source: "mobile" } },
            { $count: "count" },
          ],
        },
      },
    ];

    const [facet] = await WebsiteLeads.aggregate(pipeline).exec();
    const rawData = (facet?.data ?? []) as Record<string, unknown>[];
    const serialized = rawData.map((l) =>
      l.source === "web"
        ? { ...serializeWebsiteLead(l), source: "web" }
        : { ...l, note: normalizeNotes(l.note) }
    );
    const leads = await enrichLeadsWithPropertyMongoId(serialized);

    const totalLeads = facet?.total?.[0]?.count ?? 0;
    const webCount = facet?.webCount?.[0]?.count ?? 0;
    const mobileCount = facet?.mobileCount?.[0]?.count ?? 0;
    const totalPages = Math.ceil(totalLeads / limit) || 1;

    return NextResponse.json({
      data: leads,
      page,
      totalPages,
      totalLeads,
      includeTaken,
      counts: { web: webCount, mobile: mobileCount, all: totalLeads },
    });
  } catch (error: unknown) {
    console.error("Error fetching website leads:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        message: "Failed to fetch website leads",
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody: unknown = await request.json();
    const parsed = patchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;

    if (body.action === "addNote") {
      const token = await getDataFromToken(request);
      const authorEmail =
        token && typeof token.email === "string" ? token.email : null;
      if (!authorEmail?.trim()) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      await migrateLegacyNoteIfNeeded(body.leadId);

      const noteObject: NotesInterface = {
        noteData: body.note.trim(),
        createdBy: authorEmail,
        createOn: new Date().toLocaleString("en-GB", {
          timeZone: "Asia/Kolkata",
        }),
      };

      const updated = await WebsiteLeads.findByIdAndUpdate(
        body.leadId,
        { $push: { note: noteObject } },
        { new: true }
      ).lean();

      if (!updated) {
        return NextResponse.json({ message: "Lead not found" }, { status: 404 });
      }

      const serialized = serializeWebsiteLead(updated as Record<string, unknown>);
      const [enriched] = await enrichLeadsWithPropertyMongoId([serialized]);
      return NextResponse.json({
        message: "Note added",
        data: enriched,
      });
    }

    const token = await getDataFromToken(request);
    if (!token || token.role !== "SuperAdmin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const updates: Record<string, string> = {};
    if (typeof body.telephone === "string") {
      updates.telephone = body.telephone.trim();
    }
    if (typeof body.email === "string") {
      updates.email = body.email.trim();
    }

    const updated = await WebsiteLeads.findByIdAndUpdate(
      body.leadId,
      { $set: updates },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: "Lead not found" }, { status: 404 });
    }

    const serialized = serializeWebsiteLead(updated as Record<string, unknown>);
    const [enriched] = await enrichLeadsWithPropertyMongoId([serialized]);
    return NextResponse.json({
      message: "Lead updated",
      data: enriched,
    });
  } catch (error: unknown) {
    console.error("Error updating website leads:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        message: "Failed to update website leads",
        error: message,
      },
      { status: 500 }
    );
  }
}
