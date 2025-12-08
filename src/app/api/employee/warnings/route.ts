import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { sendWarningEmail, getWarningReasonText, sendCustomEmail } from "@/lib/email";
import { WarningType } from "@/lib/email/types";
import { EmployeeInterface } from "@/util/type";
import { DEFAULT_COMPANY_NAME } from "@/lib/email/transporter";

// Send warning email and store in database
export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const {
      employeeId,
      warningType,
      department,
      reportingManager,
      date,
      issuedBy,
      notes,
      sendEmail = true,
      customEmailSubject,
      customEmailHtml,
    } = await request.json();

    // Validate required fields
    if (!employeeId || !warningType || !department || !reportingManager || !date || !issuedBy) {
      return NextResponse.json(
        {
          error:
            "Employee ID, warning type, department, reporting manager, date, and issued by are required",
        },
        { status: 400 }
      );
    }

    // Get employee details
    const employee = await Employees.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Get warning reason text
    const reason = getWarningReasonText(warningType as WarningType);

    // Send email if requested
    let emailSent = false;
    if (sendEmail && employee.email) {
      // If custom email content is provided, use it; otherwise generate from template
      if (customEmailSubject && customEmailHtml) {
        const emailResult = await sendCustomEmail(
          employee.email,
          { subject: customEmailSubject, html: customEmailHtml },
          DEFAULT_COMPANY_NAME
        );
        emailSent = emailResult.success;
      } else {
        const emailResult = await sendWarningEmail({
          to: employee.email,
          employeeName: employee.name,
          warningType: warningType as WarningType,
          department,
          reportingManager,
          date,
          dateTime: date, // For combined warning
        });
        emailSent = emailResult.success;
      }
    }

    // Add warning to employee record
    const warningRecord = {
      warningType,
      reason,
      department,
      reportingManager,
      issuedBy,
      issuedAt: new Date(),
      emailSent,
      notes: notes || "",
    };

    const updatedEmployee = await Employees.findByIdAndUpdate(
      employeeId,
      { $push: { warnings: warningRecord } },
      { new: true, runValidators: true }
    ).lean() as EmployeeInterface | null;

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Warning sent and recorded successfully"
        : "Warning recorded (email not sent)",
      emailSent,
      warnings: updatedEmployee?.warnings || [],
    });
  } catch (error: any) {
    console.error("Warning API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send warning" },
      { status: 500 }
    );
  }
}

// Get all warnings for an employee
export async function GET(request: NextRequest) {
  try {
    await connectDb();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const employee = await Employees.findById(employeeId).select("warnings");
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      warnings: employee.warnings || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch warnings" },
      { status: 500 }
    );
  }
}

// Delete a warning
export async function DELETE(request: NextRequest) {
  try {
    await connectDb();
    const { employeeId, warningId } = await request.json();

    if (!employeeId || !warningId) {
      return NextResponse.json(
        { error: "Employee ID and warning ID are required" },
        { status: 400 }
      );
    }

    const employee = await Employees.findByIdAndUpdate(
      employeeId,
      { $pull: { warnings: { _id: warningId } } },
      { new: true }
    );

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Warning deleted successfully",
      warnings: employee?.warnings || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete warning" },
      { status: 500 }
    );
  }
}

