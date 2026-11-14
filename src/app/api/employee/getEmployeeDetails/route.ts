import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import "@/models/officeAddress";
import { EmployeeInterface } from "@/util/type";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import mongoose from "mongoose";

connectDb();

interface RequestBody {
  userId: string;
}

type LinkedEmployee = {
  _id: unknown;
  name?: string;
  email?: string;
  role?: string;
  jobTitle?: string;
  employeeCode?: string | null;
};

async function loadLinkedEmployee(
  id: unknown,
): Promise<LinkedEmployee | null> {
  if (id == null) return null;
  const raw = String(id);
  if (!mongoose.Types.ObjectId.isValid(raw)) return null;
  const row = await Employees.findById(raw)
    .select("name email role jobTitle employeeCode")
    .lean<LinkedEmployee | null>();
  return row;
}

export async function POST(request: NextRequest) {
  try {
    await getDataFromToken(request);
    const reqBody: RequestBody = await request.json();
    const { userId } = reqBody;
    const user = (await Employees.findOne({ _id: userId })
      .select("-password -passwordExpiresAt")
      .populate("officeDetails.officeAddressId", "name")
      .lean()) as
      | (EmployeeInterface & {
          reportingManagerId?: unknown;
          trainerId?: unknown;
        })
      | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const reportingManager = await loadLinkedEmployee(user.reportingManagerId);
    const trainer = await loadLinkedEmployee(user.trainerId);

    return NextResponse.json({
      status: 200,
      message: "User found",
      data: {
        ...user,
        reportingManagerId: reportingManager
          ? String(reportingManager._id)
          : user.reportingManagerId
            ? String(user.reportingManagerId)
            : null,
        reportingManager,
        trainerId: trainer
          ? String(trainer._id)
          : user.trainerId
            ? String(user.trainerId)
            : null,
        trainer,
        warnings: user.warnings || [],
        pips: user.pips || [],
        appreciations: user.appreciations || [],
      },
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 },
      );
    }
    throw error;
  }
}
