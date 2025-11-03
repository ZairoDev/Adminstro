import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function POST(req: NextRequest) {
  const token = await getDataFromToken(req);
  try {
    const {
      date,
      name,
      email,
      phoneNo,
      duration,
      startDate,
      endDate,
      area,
      guest,
      minBudget,
      maxBudget,
      noOfBeds,
      location,
      bookingTerm,
      zone,
      metroZone,
      billStatus,
      typeOfProperty,
      propertyType,
      priority,
      BoostID,
      idName,
      leadQualityByCreator,
    } = await req.json();

    // ✅ Check for duplicates (within same area, less than 30 days old)
    const existingQuery = await Query.findOne({ phoneNo });
    if (existingQuery) {
      const today = new Date();
      const daysSinceCreation = Math.floor(
        (today.getTime() - existingQuery.createdAt.getTime()) /
          (24 * 60 * 60 * 1000)
      );

      if (daysSinceCreation < 30 && existingQuery.area === area) {
        return NextResponse.json(
          { error: "Phone number already exists in this area" },
          { status: 400 }
        );
      }
    }

    // ✅ Create new lead
    const newQuery = await Query.create({
      name,
      email,
      date,
      startDate: format(startDate, "MM/dd/yyyy"),
      endDate: format(endDate, "MM/dd/yyyy"),
      phoneNo,
      duration,
      area,
      guest,
      minBudget,
      maxBudget,
      noOfBeds,
      location: location.toLowerCase(),
      bookingTerm,
      zone,
      metroZone,
      billStatus,
      typeOfProperty,
      propertyType,
      priority,
      BoostID,
      leadQualityByCreator,
      idName,
      createdBy: token.email,
      leadStatus: "fresh",
    });

    // ✅ SOCKET.IO REAL-TIME EMIT
    const io = (global as any).io;
    if (io) {
      const areaSlug =
        newQuery.location?.trim().toLowerCase().replace(/\s+/g, "-") || "all";
      const disposition =
        newQuery.leadStatus?.trim().toLowerCase().replace(/\s+/g, "-") ||
        "fresh";

      const areaRoom = `area-${areaSlug}|disposition-${disposition}`;
      const globalRoom = `area-all|disposition-${disposition}`;
      const event = `lead-${disposition}`;

      // 🎯 Emit to both area-specific and global listeners
      io.to(areaRoom).emit(event, newQuery);
      io.to(globalRoom).emit(event, newQuery);

      console.log(`✅ Emitted ${event} → ${areaRoom} & ${globalRoom}`);
    } else {
      console.warn("⚠️ Socket.IO instance not found!");
    }

    // ✅ Return success
    return NextResponse.json(
      { success: true, data: newQuery },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ Error creating lead:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
