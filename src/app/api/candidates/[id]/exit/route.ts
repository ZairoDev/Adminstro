import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";
import Employees from "@/models/employee";
import { getDataFromToken } from "@/util/getDataFromToken";
import type { CandidateExitReason } from "@/lib/candidate/markCandidateExited";
import { sendSeparationEmail, sendCustomEmail } from "@/lib/email";
import { DEFAULT_COMPANY_NAME } from "@/lib/email/transporter";

export const dynamic = "force-dynamic";

const EXIT_REASONS: CandidateExitReason[] = [
  "resigned",
  "terminated",
  "suspended",
  "abscond",
];

/**
 * POST /api/candidates/[id]/exit
 * Mark an employed candidate as exited (default: resigned) and deactivate
 * the linked employee so they appear under the Exited tab.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getDataFromToken(request);
    await connectDb();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid candidate id" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const exitReasonRaw = String(body.exitReason || "resigned").trim();
    const exitReason = EXIT_REASONS.includes(exitReasonRaw as CandidateExitReason)
      ? (exitReasonRaw as CandidateExitReason)
      : null;

    if (!exitReason) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid exit reason. Must be one of: ${EXIT_REASONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const exitNotes =
      typeof body.exitNotes === "string" ? body.exitNotes.trim() : "";
    const effectiveDateRaw =
      typeof body.effectiveDate === "string" ? body.effectiveDate.trim() : "";
    const exitedAt = effectiveDateRaw ? new Date(effectiveDateRaw) : new Date();
    if (Number.isNaN(exitedAt.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid effective date" },
        { status: 400 },
      );
    }

    const sendEmail = body.sendEmail === true;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 },
      );
    }

    if (!candidate.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: "Candidate is not linked to an employee record",
        },
        { status: 400 },
      );
    }

    if (candidate.exitedAt) {
      return NextResponse.json(
        { success: false, error: "Candidate is already marked as exited" },
        { status: 400 },
      );
    }

    const employeeId = String(candidate.employeeId);
    const employee = await Employees.findById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Linked employee not found" },
        { status: 404 },
      );
    }

    await Employees.findByIdAndUpdate(employeeId, {
      isActive: false,
      inactiveReason: exitReason,
      inactiveDate: exitedAt,
    });

    candidate.exitedAt = exitedAt;
    candidate.exitReason = exitReason;
    candidate.exitNotes = exitNotes || null;
    await candidate.save();

    let emailSent = false;
    if (sendEmail && employee.email) {
      const formattedDate = exitedAt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      if (body.customEmailSubject && body.customEmailHtml) {
        const emailResult = await sendCustomEmail(
          employee.email,
          {
            subject: String(body.customEmailSubject),
            html: String(body.customEmailHtml),
          },
          DEFAULT_COMPANY_NAME,
        );
        emailSent = emailResult.success;
      } else {
        const emailResult = await sendSeparationEmail({
          to: employee.email,
          employeeName: employee.name,
          separationType: exitReason,
          effectiveDate: formattedDate,
          reason: exitNotes,
        });
        emailSent = emailResult.success;
      }
    }

    return NextResponse.json({
      success: true,
      data: candidate,
      emailSent,
      message: emailSent
        ? `Marked as exited (${exitReason}) and email sent`
        : `Marked as exited (${exitReason})`,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { success: false, code: err.code || "AUTH_FAILED", error: "Unauthorized" },
        { status: err.status || 401 },
      );
    }
    console.error("[candidates/exit] failed:", error);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to mark candidate as exited" },
      { status: 500 },
    );
  }
}
