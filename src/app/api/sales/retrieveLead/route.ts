import Query from "@/models/query";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json();

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

    // First get the lead to know the OLD disposition
    const existingLead = await Query.findById(leadId);
    if (!existingLead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    // Store old disposition before update
    const oldDisposition = existingLead.leadStatus || "rejected";
    const formattedOldDisposition = oldDisposition
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    // Update the lead to fresh
    const updatedLead = await Query.findByIdAndUpdate(
      { _id: new mongoose.Types.ObjectId(leadId) },
      { $set: { leadStatus: "fresh", reason: null } },
      { new: true } // Return updated document
    );

    // ✅ SOCKET.IO REAL-TIME EMIT
    const io = (global as any).io;
    if (io && updatedLead) {
      const location =
        updatedLead.location?.trim().toLowerCase().replace(/\s+/g, "-") || "all";
      
      const newDisposition = "fresh";
      
      // 🎯 NEW disposition rooms (where lead is going - fresh)
      const newEvent = `lead-${newDisposition}`;
      const newRoom = `area-${location}|disposition-${newDisposition}`;
      const newGlobalRoom = `area-all|disposition-${newDisposition}`;

      // 🔴 OLD disposition rooms (where lead is coming from - rejected/declined)
      const removeEvent = `lead-removed-${formattedOldDisposition}`;
      const oldRoom = `area-${location}|disposition-${formattedOldDisposition}`;
      const oldGlobalRoom = `area-all|disposition-${formattedOldDisposition}`;

      const payload = {
        _id: updatedLead._id,
        date: updatedLead.date,
        name: updatedLead.name,
        startDate: updatedLead.startDate,
        endDate: updatedLead.endDate,
        phoneNo: updatedLead.phoneNo,
        duration: updatedLead.duration,
        area: updatedLead.area,
        guest: updatedLead.guest,
        minBudget: updatedLead.minBudget,
        maxBudget: updatedLead.maxBudget,
        noOfBeds: updatedLead.noOfBeds,
        location: updatedLead.location,
        bookingTerm: updatedLead.bookingTerm,
        zone: updatedLead.zone,
        metroZone: updatedLead.metroZone,
        billStatus: updatedLead.billStatus,
        typeOfProperty: updatedLead.typeOfProperty,
        propertyType: updatedLead.propertyType,
        priority: updatedLead.priority,
        idName: updatedLead.idName,
        BoostID: updatedLead.BoostID,
        leadQualityByCreator: updatedLead.leadQualityByCreator,
        leadQualityByReviewer: updatedLead.leadQualityByReviewer,
        leadStatus: updatedLead.leadStatus,
        reason: updatedLead.reason,
      };

      // 🎯 Emit ADD event to fresh rooms
      io.to(newRoom).emit(newEvent, payload);
      io.to(newGlobalRoom).emit(newEvent, payload);
      console.log(`✅ Emitted ${newEvent} → ${newRoom}`);
      console.log(`🌍 Emitted ${newEvent} → ${newGlobalRoom}`);

      // 🔴 Emit REMOVE event to old disposition rooms
      if (formattedOldDisposition !== newDisposition) {
        const removePayload = {
          _id: updatedLead._id,
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
      { message: "Lead retrieved successfully", data: updatedLead },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ Error retrieving lead:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
