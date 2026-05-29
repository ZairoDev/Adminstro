import { Area } from "@/models/area";
import { MonthlyTarget } from "@/models/monthlytarget";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

type AreaUpdatePayload = {
  oldName?: string;
  name?: string;
  metrolane?: string;
  zone?: string;
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ targetId: string }> },
) {
  await connectDb();
  try {
    const { targetId } = await params;
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json({ error: "Invalid target id" }, { status: 400 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const target = await MonthlyTarget.findById(targetId);
    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    const nestedArea = body.area as AreaUpdatePayload | undefined;
    if (nestedArea?.oldName) {
      const update: Record<string, unknown> = {};
      if (typeof nestedArea.name === "string" && nestedArea.name.trim()) {
        update.name = nestedArea.name.trim();
      }
      if (nestedArea.metrolane !== undefined) {
        update.metroZone = nestedArea.metrolane;
      }
      if (nestedArea.zone !== undefined) {
        update.zone = nestedArea.zone;
      }

      const areaDoc = await Area.findOneAndUpdate(
        { name: nestedArea.oldName, city: target.city },
        { $set: update },
        { new: true, runValidators: true },
      );

      if (!areaDoc) {
        return NextResponse.json({ error: "Area not found" }, { status: 404 });
      }

      return NextResponse.json(
        { message: "Area updated successfully", data: areaDoc },
        { status: 200 },
      );
    }

    const areaName = typeof body.name === "string" ? body.name.trim() : "";
    if (areaName) {
      const cityName =
        typeof body.city === "string" && body.city.trim()
          ? body.city.trim()
          : target.city;

      const {
        area: _area,
        country: _country,
        state: _state,
        sales: _sales,
        visits: _visits,
        leads: _leads,
        name: _name,
        city: _city,
        ...areaFields
      } = body;

      const area = await Area.create({
        ...areaFields,
        city: cityName,
        name: areaName,
      });

      await MonthlyTarget.findByIdAndUpdate(targetId, {
        $addToSet: { area: area._id },
      });

      return NextResponse.json(
        { message: "Area added successfully", data: area },
        { status: 200 },
      );
    }

    if (body.country !== undefined) target.country = String(body.country);
    if (body.city !== undefined) target.city = String(body.city);
    if (body.state !== undefined) target.state = String(body.state);
    if (body.sales !== undefined) target.sales = Number(body.sales);
    if (body.visits !== undefined) target.visits = Number(body.visits);
    if (body.leads !== undefined) target.leads = Number(body.leads);
    if (body.isActive !== undefined) target.isActive = Boolean(body.isActive);

    await target.save();

    return NextResponse.json(
      { message: "Target updated successfully", data: target },
      { status: 200 },
    );
  } catch (err) {
    console.error("Update Target Error:", err);
    return NextResponse.json(
      { error: "Unable to update target" },
      { status: 500 },
    );
  }
}
