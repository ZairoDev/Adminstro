import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { sendAppreciationEmail, getAppreciationReasonText } from "@/lib/email";
import { AppreciationType } from "@/lib/email/types";
import { EmployeeInterface } from "@/util/type";

// Send appreciation email and store in database
export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const {
      employeeId,
      appreciationType,
      issuedBy,
      notes,
      sendEmail = true,
    } = await request.json();

    // Validate required fields
    if (!employeeId || !appreciationType || !issuedBy) {
      return NextResponse.json(
        {
          error:
            "Employee ID, appreciation type, and issued by are required",
        },
        { status: 400 }
      );
    }

    // Get employee details
    const employee = await Employees.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Get appreciation reason text
    const reason = getAppreciationReasonText(appreciationType as AppreciationType);

    // Send email if requested
    let emailSent = false;
    if (sendEmail && employee.email) {
      const emailResult = await sendAppreciationEmail({
        to: employee.email,
        employeeName: employee.name,
        appreciationType: appreciationType as AppreciationType,
      });
      emailSent = emailResult.success;
    }

    // Add appreciation to employee record
    const appreciationRecord = {
      appreciationType,
      reason,
      issuedBy,
      issuedAt: new Date(),
      emailSent,
      notes: notes || "",
    };

    const updatedEmployee = await Employees.findByIdAndUpdate(
      employeeId,
      { $push: { appreciations: appreciationRecord } },
      { new: true, runValidators: true }
    )
      .select("appreciations")
      .lean() as EmployeeInterface | null;

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Appreciation sent and recorded successfully"
        : "Appreciation recorded (email not sent)",
      emailSent,
      appreciations: (updatedEmployee)?.appreciations || [],
    });
  } catch (error: any) {
    console.error("Appreciation API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send appreciation" },
      { status: 500 }
    );
  }
}

// Get all appreciations for an employee
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

    const employee = await Employees.findById(employeeId)
      .select("appreciations")
      .lean() as EmployeeInterface | null;
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      appreciations: employee?.appreciations || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch appreciations" },
      { status: 500 }
    );
  }
}

// Delete an appreciation
export async function DELETE(request: NextRequest) {
  try {
    await connectDb();
    const { employeeId, appreciationId } = await request.json();

    if (!employeeId || !appreciationId) {
      return NextResponse.json(
        { error: "Employee ID and appreciation ID are required" },
        { status: 400 }
      );
    }

    const employee = await Employees.findByIdAndUpdate(
      employeeId,
      { $pull: { appreciations: { _id: appreciationId } } },
      { new: true }
    )
      .select("appreciations")
      .lean() as EmployeeInterface | null;

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Appreciation deleted successfully",
      appreciations: (employee)?.appreciations || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete appreciation" },
      { status: 500 }
    );
  }
}

