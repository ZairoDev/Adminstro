import { format } from "date-fns";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import WebsiteLeads from "@/models/websiteLeads";
import TravellerBookings from "@/models/travellerBooking";
import Query from "@/models/query";
import { Properties } from "@/models/property";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { parseAssignedAreasFromToken } from "@/util/guestLeadLocationScope";
import type { NotesInterface } from "@/util/type";

connectDb();
export const dynamic = "force-dynamic";

const TAKE_ROLES = new Set(["Sales", "Sales-TeamLead", "SuperAdmin"]);
const LOCATION_EXEMPT_ROLES = new Set(["SuperAdmin", "Sales-TeamLead"]);

const takeSchema = z.object({
  source: z.enum(["web", "mobile"]),
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().optional().default("-"),
  phoneNo: z.string().min(5),
  duration: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  area: z.string().optional().default(""),
  guest: z.coerce.number().min(1),
  minBudget: z.coerce.number().min(0),
  maxBudget: z.coerce.number().min(0),
  noOfBeds: z.coerce.number().min(0),
  location: z.string().min(1),
  bookingTerm: z.enum(["Short Term", "Long Term", "Mid Term"]),
  zone: z.string().optional().default(""),
  metroZone: z.string().optional().default(""),
  billStatus: z.enum(["With Bill", "Without Bill"]),
  typeOfProperty: z.string().min(1),
  propertyType: z.enum(["Furnished", "Unfurnished", "Semi-furnished"]),
  priority: z.enum(["ASAP", "High", "Medium", "Low"]),
  BoostID: z.string().optional().default(""),
  leadQualityByCreator: z
    .enum(["Good", "Very Good", "Average", "Below Average"])
    .optional(),
  message: z.string().optional().default(""),
});

function digitsOnlyPhone(phone: string): string {
  return String(phone || "").replace(/\D/g, "");
}

function locationAllowed(
  role: string,
  assignedArea: unknown,
  location: string
): boolean {
  if (LOCATION_EXEMPT_ROLES.has(role)) return true;
  const areas = parseAssignedAreasFromToken(assignedArea).map((a) =>
    a.toLowerCase()
  );
  if (areas.length === 0) return false;
  return areas.includes(location.toLowerCase().trim());
}

function formatQueryDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid start/end date");
  }
  return format(d, "MM/dd/yyyy");
}

async function findDuplicateQuery(phoneNo: string, area: string) {
  const existingQuery = await Query.findOne({ phoneNo }).sort({ createdAt: -1 });
  if (!existingQuery) return null;

  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(existingQuery.createdAt).getTime()) /
      (24 * 60 * 60 * 1000)
  );

  if (daysSinceCreation < 30 && existingQuery.area === area) {
    return existingQuery;
  }
  return null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = await getDataFromToken(request);
    const role = String(token.role || "");
    if (!TAKE_ROLES.has(role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const source = request.nextUrl.searchParams.get("source");
    const id = request.nextUrl.searchParams.get("id");
    if (source !== "web" && source !== "mobile") {
      return NextResponse.json({ message: "Invalid source" }, { status: 400 });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

    if (source === "web") {
      const leadDoc = await WebsiteLeads.findById(id);
      if (!leadDoc) {
        return NextResponse.json({ message: "Lead not found" }, { status: 404 });
      }
      const lead = leadDoc.toObject() as Record<string, unknown>;
      if (lead.queryId) {
        return NextResponse.json(
          {
            code: "ALREADY_CLAIMED",
            message: "This lead was already taken",
            queryId: String(lead.queryId),
          },
          { status: 409 }
        );
      }

      const vsid = String(lead.VSID || "");
      const propDoc = vsid
        ? await Properties.findOne({ VSID: vsid }).select(
            "city area subarea bedrooms placeName propertyName"
          )
        : null;
      const prop = (propDoc ? propDoc.toObject() : null) as Record<
        string,
        unknown
      > | null;

      return NextResponse.json({
        data: {
          source: "web",
          id: String(lead._id),
          name: `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
          email: (lead.email as string) || "-",
          phoneNo: digitsOnlyPhone(String(lead.telephone || "")),
          location: String(prop?.city || "").trim().toLowerCase(),
          area: String(prop?.area || prop?.subarea || "").trim(),
          guest: 1,
          minBudget: 0,
          maxBudget: 0,
          noOfBeds: Number(prop?.bedrooms || 0),
          duration: "",
          startDate: "",
          endDate: "",
          bookingTerm: "Short Term",
          zone: "",
          metroZone: "",
          billStatus: "Without Bill",
          typeOfProperty: "Apartment",
          propertyType: "Furnished",
          priority: "Medium",
          BoostID: vsid,
          message: (lead.message as string) || "",
          VSID: vsid,
          propertyLabel: String(prop?.placeName || prop?.propertyName || ""),
        },
      });
    }

    const bookingDoc = await TravellerBookings.findById(id);
    if (!bookingDoc) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }
    const booking = bookingDoc.toObject() as Record<string, unknown>;
    if (booking.salesLeadQueryId) {
      return NextResponse.json(
        {
          code: "ALREADY_CLAIMED",
          message: "This lead was already taken",
          queryId: String(booking.salesLeadQueryId),
        },
        { status: 409 }
      );
    }

    const travellerId = booking.travellerId as mongoose.Types.ObjectId;
    const propertyId = booking.propertyId as mongoose.Types.ObjectId;
    const [traveller, propDoc] = await Promise.all([
      TravellerBookings.db.collection("travellers").findOne({ _id: travellerId }),
      Properties.findById(propertyId).select(
        "VSID city area subarea bedrooms placeName propertyName"
      ),
    ]);
    const prop = (propDoc ? propDoc.toObject() : null) as Record<
      string,
      unknown
    > | null;

    const guestName =
      (booking.travellers as Array<{ name?: string }> | undefined)?.[0]?.name ||
      (traveller as { name?: string } | null)?.name ||
      "Guest";
    const guests = booking.guests as
      | { adults?: number; children?: number; infants?: number }
      | undefined;
    const guestCount =
      Number(guests?.adults || 0) +
      Number(guests?.children || 0) +
      Number(guests?.infants || 0);
    const nights = Number(booking.totalNights || 0);
    const price = Number(booking.price || 0);
    const start = booking.startDate as Date | undefined;
    const end = booking.endDate as Date | undefined;
    const vsid = String(prop?.VSID || "");

    return NextResponse.json({
      data: {
        source: "mobile",
        id: String(booking._id),
        name: guestName,
        email: (traveller as { email?: string } | null)?.email || "-",
        phoneNo: digitsOnlyPhone(
          String((traveller as { phone?: string } | null)?.phone || "")
        ),
        location: String(prop?.city || "").trim().toLowerCase(),
        area: String(prop?.area || prop?.subarea || "").trim(),
        guest: guestCount || 1,
        minBudget: price,
        maxBudget: price,
        noOfBeds: Number(prop?.bedrooms || 0),
        duration: nights ? `${nights} nights` : "",
        startDate: start ? new Date(start).toISOString() : "",
        endDate: end ? new Date(end).toISOString() : "",
        bookingTerm:
          nights >= 90 ? "Long Term" : nights >= 30 ? "Mid Term" : "Short Term",
        zone: "",
        metroZone: "",
        billStatus: "Without Bill",
        typeOfProperty: "Apartment",
        propertyType: "Furnished",
        priority: "Medium",
        BoostID: vsid,
        message: `Mobile booking · ${booking.bookingStatus || "pending"} · pay ${booking.paymentStatus || "pending"}`,
        VSID: vsid,
        propertyLabel: String(prop?.placeName || prop?.propertyName || ""),
        totalNights: nights,
        price,
      },
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.error("[website-leads/take GET]", error);
    return NextResponse.json(
      { message: "Failed to load take-lead prefill" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = await getDataFromToken(request);
    const role = String(token.role || "");
    const email = typeof token.email === "string" ? token.email : "";
    if (!TAKE_ROLES.has(role) || !email) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const parsed = takeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const phoneNo = digitsOnlyPhone(body.phoneNo);
    if (phoneNo.length < 5) {
      return NextResponse.json(
        { message: "Valid phone number is required" },
        { status: 400 }
      );
    }

    if (
      !body.area?.trim() &&
      !body.zone?.trim() &&
      !body.metroZone?.trim()
    ) {
      return NextResponse.json(
        { message: "Please fill at least one of: Area, Zone, or Metro Zone" },
        { status: 400 }
      );
    }

    const location = body.location.toLowerCase().trim();
    if (!locationAllowed(role, token.allotedArea, location)) {
      return NextResponse.json(
        {
          code: "LOCATION_BLOCKED",
          message: `You cannot take leads outside your allotted cities (${parseAssignedAreasFromToken(token.allotedArea).join(", ") || "none"}). Selected: ${location}`,
        },
        { status: 403 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(body.id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

    // Load + claim lock on source
    if (body.source === "web") {
      const lead = await WebsiteLeads.findById(body.id);
      if (!lead) {
        return NextResponse.json({ message: "Lead not found" }, { status: 404 });
      }
      if (lead.queryId) {
        return NextResponse.json(
          {
            code: "ALREADY_CLAIMED",
            message: "This lead was already taken",
            queryId: String(lead.queryId),
          },
          { status: 409 }
        );
      }
    } else {
      const booking = await TravellerBookings.findById(body.id);
      if (!booking) {
        return NextResponse.json({ message: "Booking not found" }, { status: 404 });
      }
      if (booking.salesLeadQueryId) {
        return NextResponse.json(
          {
            code: "ALREADY_CLAIMED",
            message: "This lead was already taken",
            queryId: String(booking.salesLeadQueryId),
          },
          { status: 409 }
        );
      }
    }

    const duplicate = await findDuplicateQuery(phoneNo, body.area || "");
    if (duplicate) {
      return NextResponse.json(
        {
          code: "DUPLICATE_PHONE",
          message: "A lead with this phone already exists in this area (last 30 days).",
          queryId: String(duplicate._id),
          existingLead: {
            _id: String(duplicate._id),
            name: duplicate.name,
            phoneNo: duplicate.phoneNo,
            location: duplicate.location,
            leadStatus: duplicate.leadStatus,
            area: duplicate.area,
          },
        },
        { status: 409 }
      );
    }

    let startDate: string;
    let endDate: string;
    try {
      startDate = formatQueryDate(body.startDate);
      endDate = formatQueryDate(body.endDate);
    } catch {
      return NextResponse.json(
        { message: "Invalid start or end date" },
        { status: 400 }
      );
    }

    const noteParts: NotesInterface[] = [
      {
        noteData: `Taken from ${body.source === "web" ? "website" : "mobile"} lead. VSID: ${body.BoostID || "—"}.`,
        createdBy: email,
        createOn: new Date().toLocaleString("en-GB", {
          timeZone: "Asia/Kolkata",
        }),
      },
    ];
    if (body.message?.trim()) {
      noteParts.push({
        noteData: body.message.trim(),
        createdBy: email,
        createOn: new Date().toLocaleString("en-GB", {
          timeZone: "Asia/Kolkata",
        }),
      });
    }

    const newQuery = await Query.create({
      name: body.name.trim(),
      email: (body.email || "-").trim() || "-",
      phoneNo,
      duration: body.duration,
      startDate,
      endDate,
      area: body.area || "",
      guest: body.guest,
      minBudget: body.minBudget,
      maxBudget: body.maxBudget,
      noOfBeds: body.noOfBeds,
      location,
      bookingTerm: body.bookingTerm,
      zone: body.zone || "",
      metroZone: body.metroZone || "",
      billStatus: body.billStatus,
      typeOfProperty: body.typeOfProperty,
      propertyType: body.propertyType,
      priority: body.priority,
      BoostID: body.BoostID || "",
      leadQualityByCreator: body.leadQualityByCreator,
      leadQualityByTeamLead: "Approved",
      createdBy: email,
      leadStatus: "fresh",
      messageStatus: "None",
      salesPriority: "None",
      inboundSource: body.source === "web" ? "website" : "mobile",
      inboundSourceId: body.id,
      note: noteParts,
    });

    if (body.source === "web") {
      const updated = await WebsiteLeads.findOneAndUpdate(
        { _id: body.id, $or: [{ queryId: null }, { queryId: { $exists: false } }] },
        {
          $set: {
            claimedBy: email,
            claimedAt: new Date(),
            queryId: newQuery._id,
          },
        },
        { new: true }
      );
      if (!updated) {
        return NextResponse.json(
          {
            code: "ALREADY_CLAIMED",
            message: "This lead was claimed by someone else just now",
            queryId: String(newQuery._id),
          },
          { status: 409 }
        );
      }
    } else {
      const updated = await TravellerBookings.findOneAndUpdate(
        {
          _id: body.id,
          $or: [
            { salesLeadQueryId: null },
            { salesLeadQueryId: { $exists: false } },
          ],
        },
        {
          $set: {
            salesLeadClaimedBy: email,
            salesLeadClaimedAt: new Date(),
            salesLeadQueryId: newQuery._id,
          },
        },
        { new: true }
      );
      if (!updated) {
        return NextResponse.json(
          {
            code: "ALREADY_CLAIMED",
            message: "This lead was claimed by someone else just now",
            queryId: String(newQuery._id),
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          queryId: String(newQuery._id),
          leadStatus: newQuery.leadStatus,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as {
      status?: number;
      code?: string | number;
      message?: string;
    };
    const AUTH_CODES = new Set([
      "NO_TOKEN",
      "INVALID_TOKEN",
      "USER_NOT_FOUND",
      "SESSION_INVALID",
      "AUTH_EXPIRED",
      "AUTH_FAILED",
    ]);
    if (
      err?.status === 401 ||
      (typeof err?.code === "string" && AUTH_CODES.has(err.code))
    ) {
      return NextResponse.json(
        { code: typeof err.code === "string" ? err.code : "AUTH_FAILED" },
        { status: 401 }
      );
    }
    if (err?.code === 11000) {
      return NextResponse.json(
        { message: "Duplicate record conflict" },
        { status: 400 }
      );
    }
    console.error("[website-leads/take POST]", error);
    return NextResponse.json(
      { message: err?.message || "Failed to take lead" },
      { status: 500 }
    );
  }
}
