import { NextRequest, NextResponse } from "next/server";
import {
  getWarningEmailTemplate,
  getPIPEmailTemplate,
  getAppreciationEmailTemplate,
  getActiveHREmployee,
} from "@/lib/email";
import { WarningType, PIPLevel, AppreciationType } from "@/lib/email/types";

export async function POST(request: NextRequest) {
  try {
    const { type, payload } = await request.json();

    if (!type || !payload) {
      return NextResponse.json(
        { error: "Type and payload are required" },
        { status: 400 }
      );
    }

    // Fetch active HR employee for signature
    const hrEmployee = await getActiveHREmployee();

    let template;

    switch (type) {
      case "warning":
        template = getWarningEmailTemplate(
          {
            to: payload.to,
            employeeName: payload.employeeName,
            warningType: payload.warningType as WarningType,
            department: payload.department,
            reportingManager: payload.reportingManager,
            date: payload.date,
            dateTime: payload.dateTime,
            companyName: payload.companyName,
          },
          hrEmployee
        );
        break;

      case "pip":
        template = getPIPEmailTemplate(
          {
            to: payload.to,
            employeeName: payload.employeeName,
            pipLevel: payload.pipLevel as PIPLevel,
            startDate: payload.startDate,
            endDate: payload.endDate,
            concerns: payload.concerns,
            issues: payload.issues,
            criticalIssues: payload.criticalIssues,
            companyName: payload.companyName,
          },
          hrEmployee
        );
        break;

      case "appreciation":
        template = getAppreciationEmailTemplate(
          {
            to: payload.to,
            employeeName: payload.employeeName,
            appreciationType: payload.appreciationType as AppreciationType,
            companyName: payload.companyName,
          },
          hrEmployee
        );
        break;

      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      subject: template.subject,
      html: template.html,
    });
  } catch (error: any) {
    console.error("Template generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate email template" },
      { status: 500 }
    );
  }
}


