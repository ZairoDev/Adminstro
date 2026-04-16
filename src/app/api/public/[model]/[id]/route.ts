import { type NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import Candidate from "@/models/candidate";

export const dynamic = "force-dynamic";

type ModelKey = "employee" | "candidate";

function getModel(model: string) {
  const key = model.toLowerCase() as ModelKey;
  if (key === "employee") return { key, mongooseModel: Employees };
  if (key === "candidate") return { key, mongooseModel: Candidate };
  return null;
}

function employeeProjection() {
  // Never expose auth/session secrets on public endpoints.
  return [
    "-password",
    "-passwordExpiresAt",
    "-forgotPasswordToken",
    "-forgotPasswordTokenExpiry",
    "-verifyToken",
    "-verifyTokenExpiry",
    "-otpToken",
    "-otpTokenExpiry",
    "-sessionId",
  ].join(" ");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ model: string; id: string }> },
) {
  await connectDb();

  try {
    const { model, id } = await params;
    const resolved = getModel(model);
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: "Unsupported model" },
        { status: 400 },
      );
    }

    const query =
      resolved.key === "employee"
        ? resolved.mongooseModel.findById(id).select(employeeProjection()).lean()
        : resolved.mongooseModel.findById(id).lean();

    const doc = await query;
    if (!doc) {
      return NextResponse.json(
        { success: false, error: `${resolved.key} not found` },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, model: resolved.key, data: doc });
  } catch (error) {
    console.error("[public model] GET by id error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}

