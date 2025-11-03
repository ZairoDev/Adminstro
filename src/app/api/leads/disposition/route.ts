import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";

export async function POST(req: NextRequest) {
  try {
    const { id, disposition, dispositionReason } = await req.json();

    if (!id || !disposition) {
      return NextResponse.json(
        { success: false, message: "ID and disposition are required" },
        { status: 400 }
      );
    }

    const existingQuery = await Query.findById(id);
    if (!existingQuery) {
      return NextResponse.json(
        { success: false, message: "Query not found" },
        { status: 404 }
      );
    }

    // 🟢 Update the lead status and reason
    existingQuery.leadStatus = disposition;
    existingQuery.reason = dispositionReason || "";
    await existingQuery.save();

    // 🧩 Normalize keys
    const location =
      existingQuery.location?.trim().toLowerCase().replace(/\s+/g, "-") ||
      "all";

    const formattedDisposition = disposition
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    // ✅ Get socket instance
    const io = (global as any).io;

    if (io) {
      const event = `lead-${formattedDisposition}`;
      const room = `area-${location}|disposition-${formattedDisposition}`;
      const globalRoom = `area-all|disposition-${formattedDisposition}`;

      const payload = {
        _id: existingQuery._id,
        date: existingQuery.date,
        name: existingQuery.name,
        startDate: existingQuery.startDate,
        endDate: existingQuery.endDate,
        phoneNo: existingQuery.phoneNo,
        duration: existingQuery.duration,
        area: existingQuery.area,
        guest: existingQuery.guest,
        minBudget: existingQuery.minBudget,
        maxBudget: existingQuery.maxBudget,
        noOfBeds: existingQuery.noOfBeds,
        location: existingQuery.location,
        bookingTerm: existingQuery.bookingTerm,
        zone: existingQuery.zone,
        metroZone: existingQuery.metroZone,
        billStatus: existingQuery.billStatus,
        typeOfProperty: existingQuery.typeOfProperty,
        propertyType: existingQuery.propertyType,
        priority: existingQuery.priority,
        idName: existingQuery.idName,
        BoostID: existingQuery.BoostID,
        leadQualityByCreator: existingQuery.leadQualityByCreator,
        leadStatus: existingQuery.leadStatus,
        reason: existingQuery.reason,
      };

      // 🎯 Emit to both the specific area room and global fallback
      io.to(room).emit(event, payload);
      io.to(globalRoom).emit(event, payload);

      console.log(`✅ Emitted ${event} → ${room}`);
      console.log(`🌍 Emitted ${event} → ${globalRoom}`);
    } else {
      console.warn("⚠️ Socket.IO instance not found in global context");
    }

    return NextResponse.json(
      { success: true, data: existingQuery },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error updating disposition:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
