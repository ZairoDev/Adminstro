import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";
// Register OfficeAddress so populate("officeAddressId") works on every request.
import "@/models/officeAddress";
import Employees from "@/models/employee";
import { getDataFromToken } from "@/util/getDataFromToken";
import { getLifecyclePhase } from "@/lib/people/lifecycle";

export const dynamic = "force-dynamic";

/**
 * GET /api/people/[candidateId]
 * Returns { candidate, employee, lifecyclePhase }
 * Auth: HR / SuperAdmin only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const token = await getDataFromToken(request);
    const userRole = token.role as string;
    if (!["HR", "SuperAdmin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Only HR and SuperAdmin can view person profiles." },
        { status: 403 }
      );
    }

    await connectDb();

    const { candidateId } = await params;
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return NextResponse.json(
        { success: false, error: "Invalid candidate id" },
        { status: 400 }
      );
    }

    const candidate = await Candidate.findById(candidateId)
      .populate("officeAddressId")
      .lean();

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    let employee = null;
    if (candidate.employeeId) {
      employee = await Employees.findById(candidate.employeeId)
        .select("-password -passwordExpiresAt")
        .lean();
    }

    const lifecyclePhase = getLifecyclePhase({
      status: String(candidate.status ?? ""),
      employeeId: candidate.employeeId ? String(candidate.employeeId) : null,
      exitedAt: candidate.exitedAt ?? null,
    });

    return NextResponse.json({
      success: true,
      candidate,
      employee: employee ?? null,
      lifecyclePhase,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { success: false, code: err.code || "AUTH_FAILED", error: "Unauthorized" },
        { status: err.status || 401 }
      );
    }
    console.error("[people] failed to load person profile:", error);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load person profile" },
      { status: 500 }
    );
  }
}
