import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";
import { createTransporterHR } from "@/lib/email/transporter";
import { getActiveHREmployee } from "@/lib/email/getHREmployee";
import { getSalaryAnnexureEmailTemplate } from "@/lib/email/templates/salaryAnnexure";
import { getDataFromToken } from "@/util/getDataFromToken";

const bodySchema = z.object({
  customEmailSubject: z.string().trim().optional(),
  customEmailHtml: z.string().trim().optional(),
});

function canReceiveSalaryAnnexure(candidate: {
  status?: string | null;
  employeeId?: unknown;
}): boolean {
  return (
    candidate.status === "selected" ||
    candidate.status === "onboarding" ||
    Boolean(candidate.employeeId)
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getDataFromToken(request);
    const { id } = await params;
    await connectDb();

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid email request" }, { status: 400 });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }
    if (!canReceiveSalaryAnnexure(candidate)) {
      return NextResponse.json(
        { success: false, error: "The salary annexure can be sent to selected, onboarding, or employee records" },
        { status: 400 },
      );
    }
    if (candidate.selectionDetails?.signedSalaryAnnexurePdfUrl) {
      return NextResponse.json(
        { success: false, error: "The salary annexure is already signed" },
        { status: 409 },
      );
    }
    const recipient = typeof candidate.email === "string" ? candidate.email.trim() : "";
    if (!recipient) {
      return NextResponse.json({ success: false, error: "Candidate email is required" }, { status: 400 });
    }

    const signingLink = `${process.env.APP_URL || "http://localhost:3000"}/dashboard/candidatePortal/${id}/salary-annexure`;
    const hrEmployee = await getActiveHREmployee();
    const template = getSalaryAnnexureEmailTemplate(
      {
        candidateName: candidate.name,
        role: candidate.selectionDetails?.role || candidate.position,
        signingLink,
        companyName: process.env.COMPANY_NAME || "Zairo International",
      },
      hrEmployee,
    );
    const customSubject = parsed.data.customEmailSubject;
    const customHtml = parsed.data.customEmailHtml;
    const useCustom = Boolean(customSubject && customHtml);

    const transporter = await createTransporterHR();
    await transporter.sendMail({
      from: `"Zairo International HR" <${transporter.fromEmail}>`,
      to: recipient,
      subject: useCustom ? customSubject : template.subject,
      html: useCustom ? customHtml : template.html,
    });

    await Candidate.findByIdAndUpdate(id, {
      $set: {
        "selectionDetails.salaryAnnexureSent": true,
        "selectionDetails.salaryAnnexureSentAt": new Date(),
        "selectionDetails.salaryAnnexureSigningLink": signingLink,
      },
    });

    return NextResponse.json({ success: true, message: "Salary annexure sent" });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status) {
      return NextResponse.json({ code: err.code || "AUTH_FAILED" }, { status: err.status });
    }
    console.error("Error sending salary annexure:", error);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to send the salary annexure" },
      { status: 500 },
    );
  }
}
