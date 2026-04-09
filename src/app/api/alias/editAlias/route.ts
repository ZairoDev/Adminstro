import { NextRequest, NextResponse } from "next/server";

import Aliases from "@/models/alias";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";

export async function PATCH(req: NextRequest) {
  try {
    await getDataFromToken(req);
    await connectDb();
    const { aliasEmail, body } = await req.json();

    // If assignedTo is provided as email/id, resolve to ObjectId.
    if (body?.assignedTo && typeof body.assignedTo === "string") {
      const s = body.assignedTo as string;
      const isEmail = s.includes("@");
      const employee = isEmail
        ? await Employees.findOne({ email: s }).select("_id organization").lean()
        : await Employees.findById(s).select("_id organization").lean();
      if (!employee) {
        return NextResponse.json({ error: "Assigned employee not found" }, { status: 400 });
      }
      body.assignedTo = (employee as any)._id;
      body.organization = body.organization ?? (employee as any).organization;
    }

    const alias = await Aliases.findOneAndUpdate({ aliasEmail: aliasEmail }, body);

    return NextResponse.json({ alias }, { status: 201 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.log("error in editing alias: ", err);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
