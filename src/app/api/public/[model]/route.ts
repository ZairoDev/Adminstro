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
  request: NextRequest,
  { params }: { params: Promise<{ model: string }> },
) {
  await connectDb();

  try {
    const { model } = await params;
    const resolved = getModel(model);
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: "Unsupported model" },
        { status: 400 },
      );
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const skipParam = request.nextUrl.searchParams.get("skip");

    const limit =
      limitParam === null ? null : Math.max(0, Number.parseInt(limitParam, 10));
    const skip = skipParam === null ? 0 : Math.max(0, Number.parseInt(skipParam, 10));

    const baseQuery =
      resolved.key === "employee"
        ? resolved.mongooseModel.find({}).select(employeeProjection()).lean()
        : resolved.mongooseModel.find({}).lean();

    const query = limit === null ? baseQuery : baseQuery.skip(skip).limit(limit);
    const data = await query;

    return NextResponse.json({
      success: true,
      model: resolved.key,
      count: Array.isArray(data) ? data.length : 0,
      data,
    });
  } catch (error) {
    console.error("[public model] GET list error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}

