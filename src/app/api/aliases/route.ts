import { NextRequest, NextResponse } from "next/server";

import Aliases from "@/models/alias";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function GET(req: NextRequest) {
  try {
    const payload = await getDataFromToken(req);
    const employeeId = (payload as any).id as string;
    if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDb();

    const employee = await Employees.findById(employeeId).lean();
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    const organization = (employee as any).organization;
    if (!organization) {
      return NextResponse.json({ error: "Employee organization missing" }, { status: 400 });
    }

    const alias = await Aliases.findOne({
      assignedTo: employeeId,
      organization,
      status: "Active",
    })
      .select("aliasName aliasEmail status organization assignedTo")
      .lean();

    // Legacy fallback (old assignedTo=email strings) without leaking passwords
    if (!alias) {
      const legacy = await Aliases.collection.findOne({
        assignedTo: String((employee as any).email ?? ""),
        organization,
        status: "Active",
      });
      if (!legacy) return NextResponse.json({ alias: null }, { status: 200 });
      return NextResponse.json(
        {
          alias: {
            _id: legacy._id,
            aliasName: String((legacy as any).aliasName ?? ""),
            aliasEmail: String((legacy as any).aliasEmail ?? ""),
            status: String((legacy as any).status ?? ""),
            organization: String((legacy as any).organization ?? ""),
            assignedTo: (legacy as any).assignedTo,
          },
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ alias }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json({ code: error.code || "AUTH_FAILED" }, { status: error.status });
    }
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

