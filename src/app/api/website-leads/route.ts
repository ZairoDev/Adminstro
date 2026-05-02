import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import WebsiteLeads from "@/models/websiteLeads";
import { Properties } from "@/models/property";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import type { NotesInterface } from "@/util/type";

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await migrateLegacyStringNotesBatch();

    const url = request.nextUrl;
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "firstName";

    let query: Record<string, unknown> = {};

    if (searchTerm) {
      const regex = new RegExp(searchTerm, "i");
      if (searchType === "name") {
        query.$or = [{ firstName: regex }, { lastName: regex }];
      } else {
        query[searchType] = regex;
      }
    }

    const leadsRaw = await WebsiteLeads.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const serialized = leadsRaw.map((l) =>
      serializeWebsiteLead(l as Record<string, unknown>)
    );
    const leads = await enrichLeadsWithPropertyMongoId(serialized);

    const totalLeads = await WebsiteLeads.countDocuments(query);
    const totalPages = Math.ceil(totalLeads / limit);

    return NextResponse.json({
      data: leads,
      page,
      totalPages,
      totalLeads,
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
