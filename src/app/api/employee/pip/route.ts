import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { sendPIPEmail, getPIPLevelDescription } from "@/lib/email";
import { PIPLevel } from "@/lib/email/types";
import { EmployeeInterface } from "@/util/type";

// Send PIP email and store in database
export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const {
      employeeId,
      pipLevel,
      startDate,
      endDate,
      concerns,
      issuedBy,
      notes,
      sendEmail = true,
    } = await request.json();

    // Validate required fields
    if (!employeeId || !pipLevel || !startDate || !endDate || !issuedBy) {
      return NextResponse.json(
        {
          error:
            "Employee ID, PIP level, start date, end date, and issued by are required",
        },
        { status: 400 }
      );
    }

    // Validate concerns array
    if (!concerns || concerns.length === 0) {
      return NextResponse.json(
        { error: "At least one concern/issue is required" },
        { status: 400 }
      );
    }

    // Get employee details
    const employee = await Employees.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Send email if requested
    let emailSent = false;
    if (sendEmail && employee.email) {
      const emailResult = await sendPIPEmail({
        to: employee.email,
        employeeName: employee.name,
        pipLevel: pipLevel as PIPLevel,
        startDate,
        endDate,
        concerns: pipLevel === "level1" ? concerns : undefined,
        issues: pipLevel === "level2" ? concerns : undefined,
        criticalIssues: pipLevel === "level3" ? concerns : undefined,
      });
      emailSent = emailResult.success;
    }

    // Add PIP to employee record
    const pipRecord = {
      pipLevel,
      startDate,
      endDate,
      concerns,
      issuedBy,
      issuedAt: new Date(),
      emailSent,
      status: "active",
      notes: notes || "",
    };

    const updatedEmployee = await Employees.findByIdAndUpdate(
      employeeId,
      { $push: { pips: pipRecord } },
      { new: true, runValidators: true }
    ).lean() as EmployeeInterface | null;

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "PIP sent and recorded successfully"
        : "PIP recorded (email not sent)",
      emailSent,
      pips: updatedEmployee?.pips || [],
    });
  } catch (error: any) {
    console.error("PIP API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send PIP" },
      { status: 500 }
    );
  }
}

// Get all PIPs for an employee
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

    const employee = await Employees.findById(employeeId).select("pips").lean() as EmployeeInterface | null;
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      pips: employee.pips || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch PIPs" },
      { status: 500 }
    );
  }
}

// Update PIP status
export async function PUT(request: NextRequest) {
  try {
    await connectDb();
    const { employeeId, pipId, status } = await request.json();

    if (!employeeId || !pipId || !status) {
      return NextResponse.json(
        { error: "Employee ID, PIP ID, and status are required" },
        { status: 400 }
      );
    }

    if (!["active", "completed", "failed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be active, completed, or failed" },
        { status: 400 }
      );
    }

    const employee = await Employees.findOneAndUpdate(
      { _id: employeeId, "pips._id": pipId },
      { $set: { "pips.$.status": status } },
      { new: true }
    ).lean() as EmployeeInterface | null;

    if (!employee) {
      return NextResponse.json(
        { error: "Employee or PIP not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "PIP status updated successfully",
      pips: employee?.pips || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update PIP" },
      { status: 500 }
    );
  }
}

// Delete a PIP
export async function DELETE(request: NextRequest) {
  try {
    await connectDb();
    const { employeeId, pipId } = await request.json();

    if (!employeeId || !pipId) {
      return NextResponse.json(
        { error: "Employee ID and PIP ID are required" },
        { status: 400 }
      );
    }

    const employee = await Employees.findByIdAndUpdate(
      employeeId,
      { $pull: { pips: { _id: pipId } } },
      { new: true }
    ).lean() as EmployeeInterface | null;

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "PIP deleted successfully",
      pips: employee?.pips || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete PIP" },
      { status: 500 }
    );
  }
}


