import { NextRequest, NextResponse } from "next/server";
import {
  getWarningEmailTemplate,
  getPIPEmailTemplate,
  getAppreciationEmailTemplate,
  getActiveHREmployee,
  getPIPCompletionEmailTemplate,
} from "@/lib/email";
import { WarningType, PIPLevel, AppreciationType } from "@/lib/email/types";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const senderId = token.id as string;
    const { type, payload } = await request.json();

    if (!type || !payload) {
      return NextResponse.json(
        { error: "Type and payload are required" },
        { status: 400 }
      );
    }

    // Signature name/title = logged-in sender (HR / SuperAdmin)
    const hrEmployee = await getActiveHREmployee(senderId);

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

      case "pipCompletion":
        template = getPIPCompletionEmailTemplate(
          payload.employeeName,
          payload.pipLevel as PIPLevel,
          payload.startDate,
          payload.endDate,
          payload.companyName,
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
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.error("Template generation error:", error);
    return NextResponse.json(
      { error: err?.message || "Failed to generate email template" },
      { status: 500 }
    );
  }
}


