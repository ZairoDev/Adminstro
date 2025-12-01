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

    // 🟡 Store the OLD disposition before updating
    const oldDisposition = existingQuery.leadStatus || "fresh";
    const formattedOldDisposition = oldDisposition
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    // 🟢 Update the lead status and reason
    existingQuery.leadStatus = disposition;
    existingQuery.reason = dispositionReason || "";
    console.log("Updating disposition from:", oldDisposition, "to:", disposition);
    console.log("Disposition reason:", dispositionReason);
    await existingQuery.save({ validateBeforeSave: false });
    console.log("Disposition updated successfully");

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
      // 🎯 NEW disposition rooms (where lead is going)
      const newEvent = `lead-${formattedDisposition}`;
      const newRoom = `area-${location}|disposition-${formattedDisposition}`;
      const newGlobalRoom = `area-all|disposition-${formattedDisposition}`;

      // 🔴 OLD disposition rooms (where lead is coming from)
      const removeEvent = `lead-removed-${formattedOldDisposition}`;
      const oldRoom = `area-${location}|disposition-${formattedOldDisposition}`;
      const oldGlobalRoom = `area-all|disposition-${formattedOldDisposition}`;

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

      // 🎯 Emit ADD event to NEW disposition rooms
      io.to(newRoom).emit(newEvent, payload);
      io.to(newGlobalRoom).emit(newEvent, payload);
      console.log(`✅ Emitted ${newEvent} → ${newRoom}`);
      console.log(`🌍 Emitted ${newEvent} → ${newGlobalRoom}`);

      // 🔴 Emit REMOVE event to OLD disposition rooms (only if disposition changed)
      if (formattedOldDisposition !== formattedDisposition) {
        const removePayload = {
          _id: existingQuery._id,
          newDisposition: formattedDisposition,
        };
        io.to(oldRoom).emit(removeEvent, removePayload);
        io.to(oldGlobalRoom).emit(removeEvent, removePayload);
        console.log(`🗑️ Emitted ${removeEvent} → ${oldRoom}`);
        console.log(`🌍 Emitted ${removeEvent} → ${oldGlobalRoom}`);
      }
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
