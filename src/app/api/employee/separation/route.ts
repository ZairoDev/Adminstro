import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { sendSeparationEmail, getSeparationEmailTemplate, sendCustomEmail } from "@/lib/email";
import { SeparationType } from "@/lib/email/templates/separation";
import { getActiveHREmployee } from "@/lib/email/getHREmployee";
import { DEFAULT_COMPANY_NAME } from "@/lib/email/transporter";

// Force dynamic rendering - disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Update employee status and optionally send separation email
export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const {
      employeeId,
      separationType,
      reason,
      effectiveDate,
      sendEmail = true,
      customEmailSubject,
      customEmailHtml,
    } = await request.json();

    // Validate required fields
    if (!employeeId || !separationType) {
      return NextResponse.json(
        { error: "Employee ID and separation type are required" },
        { status: 400 }
      );
    }

    if (!["terminated", "suspended", "abscond"].includes(separationType)) {
      return NextResponse.json(
        { error: "Invalid separation type. Must be 'terminated', 'suspended', or 'abscond'" },
        { status: 400 }
      );
    }

    // Get employee details
    const employee = await Employees.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Update employee status
    const updateData = {
      isActive: false,
      inactiveReason: separationType,
      inactiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
    };

    await Employees.findByIdAndUpdate(employeeId, updateData, { new: true });

    // Send email if requested
    let emailSent = false;
    if (sendEmail && employee.email) {
      const formattedDate = effectiveDate || new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      // If custom email content is provided, use it; otherwise generate from template
      if (customEmailSubject && customEmailHtml) {
        const emailResult = await sendCustomEmail(
          employee.email,
          { subject: customEmailSubject, html: customEmailHtml },
          DEFAULT_COMPANY_NAME
        );
        emailSent = emailResult.success;
      } else {
        const emailResult = await sendSeparationEmail({
          to: employee.email,
          employeeName: employee.name,
          separationType: separationType as SeparationType,
          effectiveDate: formattedDate,
          reason: reason || "",
        });
        emailSent = emailResult.success;
      }
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `Employee ${separationType} and email sent successfully`
        : `Employee ${separationType} (email not sent)`,
      emailSent,
    });
  } catch (error: any) {
    console.error("Separation API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process separation" },
      { status: 500 }
    );
  }
}

// Generate separation email template for preview
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const separationType = searchParams.get("separationType") as SeparationType;
    const reason = searchParams.get("reason") || "";
    const effectiveDate = searchParams.get("effectiveDate") || new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    if (!employeeId || !separationType) {
      return NextResponse.json(
        { error: "Employee ID and separation type are required" },
        { status: 400 }
      );
    }

    await connectDb();
    const employee = await Employees.findById(employeeId).select("name email");
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const hrEmployee = await getActiveHREmployee();
    const template = getSeparationEmailTemplate(
      {
        to: employee.email,
        employeeName: employee.name,
        separationType,
        effectiveDate,
        reason,
      },
      hrEmployee
    );

    const response = NextResponse.json({
      success: true,
      template,
      employeeEmail: employee.email,
    });

    // Set cache control headers
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate template" },
      { status: 500 }
    );
  }
}

