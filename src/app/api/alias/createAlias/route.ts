import { NextRequest, NextResponse } from "next/server";

import Aliases from "@/models/alias";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // console.log("alias body: ", body);

  try {
    await getDataFromToken(req);
    await connectDb();

    const assignedToRaw: unknown = body?.assignedTo;
    const assignedToStr = typeof assignedToRaw === "string" ? assignedToRaw : "";
    const isEmail = assignedToStr.includes("@");

    const employee = isEmail
      ? await Employees.findOne({ email: assignedToStr }).select("_id organization").lean()
      : await Employees.findById(assignedToStr).select("_id organization").lean();

    if (!employee) {
      return NextResponse.json({ error: "Assigned employee not found" }, { status: 400 });
    }

    const alias = await Aliases.create({
      ...body,
      assignedTo: (employee as any)._id,
      organization: body.organization ?? (employee as any).organization,
    });
    // console.log("alias created: ", alias);

    return NextResponse.json({ alias }, { status: 201 });
  } catch (err: any) {
   // console.log("error in creating alias: ", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
