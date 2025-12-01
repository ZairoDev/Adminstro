import { NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: Request) {
  try {
    const { id, rejectionReason } = await req.json();

    if (!id || !rejectionReason) {
      return NextResponse.json(
        { success: false, message: "ID and leadQuality are required" },
        { status: 400 }
      );
    }
    
    const validLeadQualities = [
      "Not on whatsapp",
      "Not Replying",
      "Low Budget",
      "Blocked on whatsapp",
      "Late Response",
      "Delayed the Traveling",
      "Off Location",
      "Number of people exceeded",
      "Already got it",
      "Different Area",
      "Agency Fees",
      "Didn't like the option",
      "Low Duration",
    ];
    
    if (!validLeadQualities.includes(rejectionReason)) {
      return NextResponse.json(
        { success: false, message: "Invalid leadQuality value" },
        { status: 400 }
      );
    }

    // First get the lead to know the OLD disposition
    const existingQuery = await Query.findById(id);
    if (!existingQuery) {
      return NextResponse.json(
        { success: false, message: "Query not found" },
        { status: 404 }
      );
    }

    // Store old disposition before update
    const oldDisposition = existingQuery.leadStatus || "fresh";
    const formattedOldDisposition = oldDisposition
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    // Update the lead
    const updatedQuery = await Query.findByIdAndUpdate(
      id,
      { $set: { leadStatus: "rejected", reason: rejectionReason } },
      { new: true }
    );

    // ✅ SOCKET.IO REAL-TIME EMIT
    const io = (global as any).io;
    if (io && updatedQuery) {
      const location =
        updatedQuery.location?.trim().toLowerCase().replace(/\s+/g, "-") || "all";
      
      const newDisposition = "rejected";
      
      // 🎯 NEW disposition rooms (where lead is going - rejected)
      const newEvent = `lead-${newDisposition}`;
      const newRoom = `area-${location}|disposition-${newDisposition}`;
      const newGlobalRoom = `area-all|disposition-${newDisposition}`;

      // 🔴 OLD disposition rooms (where lead is coming from)
      const removeEvent = `lead-removed-${formattedOldDisposition}`;
      const oldRoom = `area-${location}|disposition-${formattedOldDisposition}`;
      const oldGlobalRoom = `area-all|disposition-${formattedOldDisposition}`;

      const payload = {
        _id: updatedQuery._id,
        date: updatedQuery.date,
        name: updatedQuery.name,
        startDate: updatedQuery.startDate,
        endDate: updatedQuery.endDate,
        phoneNo: updatedQuery.phoneNo,
        duration: updatedQuery.duration,
        area: updatedQuery.area,
        guest: updatedQuery.guest,
        minBudget: updatedQuery.minBudget,
        maxBudget: updatedQuery.maxBudget,
        noOfBeds: updatedQuery.noOfBeds,
        location: updatedQuery.location,
        bookingTerm: updatedQuery.bookingTerm,
        zone: updatedQuery.zone,
        metroZone: updatedQuery.metroZone,
        billStatus: updatedQuery.billStatus,
        typeOfProperty: updatedQuery.typeOfProperty,
        propertyType: updatedQuery.propertyType,
        priority: updatedQuery.priority,
        idName: updatedQuery.idName,
        BoostID: updatedQuery.BoostID,
        leadQualityByCreator: updatedQuery.leadQualityByCreator,
        leadQualityByReviewer: updatedQuery.leadQualityByReviewer,
        leadStatus: updatedQuery.leadStatus,
        reason: updatedQuery.reason,
      };

      // 🎯 Emit ADD event to rejected rooms
      io.to(newRoom).emit(newEvent, payload);
      io.to(newGlobalRoom).emit(newEvent, payload);
      console.log(`✅ Emitted ${newEvent} → ${newRoom}`);
      console.log(`🌍 Emitted ${newEvent} → ${newGlobalRoom}`);

      // 🔴 Emit REMOVE event to old disposition rooms
      if (formattedOldDisposition !== newDisposition) {
        const removePayload = {
          _id: updatedQuery._id,
          newDisposition: newDisposition,
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
      { success: true, data: updatedQuery },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error updating rejection reason:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
