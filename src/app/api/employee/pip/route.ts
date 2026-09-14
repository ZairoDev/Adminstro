import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { sendPIPEmail, getPIPLevelDescription, sendCustomEmail, sendPIPCompletionEmail } from "@/lib/email";
import { PIPLevel } from "@/lib/email/types";
import { EmployeeInterface } from "@/util/type";
import { DEFAULT_COMPANY_NAME } from "@/lib/email/transporter";
import { getDataFromToken } from "@/util/getDataFromToken";
import { forceLogoutEmployee } from "@/lib/employee/forceLogoutEmployee";
import { PIP_LOCK_SESSION_MESSAGE } from "@/lib/employee/pipLockMessages";

export const dynamic = "force-dynamic";

const objectIdSchema = z
  .string()
  .refine((value) => Types.ObjectId.isValid(value), "Invalid ObjectId");

const pipDatesSchema = z
  .object({
    startDate: z.string().refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "Invalid start date",
    ),
    endDate: z.string().refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "Invalid end date",
    ),
  })
  .refine(
    ({ startDate, endDate }) => new Date(startDate) <= new Date(endDate),
    { message: "End date must be on or after start date", path: ["endDate"] },
  );

const createPipSchema = z
  .object({
    employeeId: objectIdSchema,
    pipLevel: z.enum(["forTrainees", "level1", "level2", "level3"]),
    startDate: z.string(),
    endDate: z.string(),
    concerns: z.array(z.string().trim().min(1).max(2_000)).min(1).max(50),
    issuedBy: z.string().trim().min(1).max(200).optional(),
    notes: z.string().trim().max(5_000).optional().default(""),
    sendEmail: z.boolean().optional().default(true),
    customEmailSubject: z.string().trim().min(1).max(300).optional(),
    customEmailHtml: z.string().min(1).max(1_000_000).optional(),
    currentPipId: objectIdSchema.optional(),
  })
  .and(pipDatesSchema);

const updatePipSchema = z.object({
  employeeId: objectIdSchema,
  pipId: objectIdSchema,
  status: z.enum(["active", "completed", "failed"]),
  customCompletionEmailSubject: z.string().trim().min(1).max(300).optional(),
  customCompletionEmailHtml: z.string().min(1).max(1_000_000).optional(),
});

const deletePipSchema = z.object({
  employeeId: objectIdSchema,
  pipId: objectIdSchema,
});

// Send PIP email and store in database
export async function POST(request: NextRequest) {
  try {
    const auth = (await getDataFromToken(request)) as unknown as {
      id?: string;
      name?: string;
      role?: string;
    };
    if (auth.role !== "HR" && auth.role !== "SuperAdmin") {
      return NextResponse.json(
        { error: "Only HR or SuperAdmin can issue a PIP" },
        { status: 403 },
      );
    }
    await connectDb();
    const parsedBody = createPipSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid PIP request",
          details: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const {
      employeeId,
      pipLevel,
      startDate,
      endDate,
      concerns,
      issuedBy,
      notes,
      sendEmail = true,
      customEmailSubject,
      customEmailHtml,
      currentPipId,
    } = parsedBody.data;
    const actualIssuedBy = auth.name || issuedBy;

    if (!actualIssuedBy) {
      return NextResponse.json(
        { error: "Issued by is required" },
        { status: 400 }
      );
    }

    // Get employee details
    const employee = await Employees.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Add PIP to employee record. acknowledgedAt starts null - the employee must
    // clear the mandatory full-screen acknowledgment gate the next time they can
    // reach the dashboard (see /api/employee/pip/me and PipAcknowledgmentGate).
    const newPipId = new Types.ObjectId();
    const pipRecord = {
      _id: newPipId,
      pipLevel,
      startDate,
      endDate,
      concerns,
      issuedBy: actualIssuedBy,
      issuedAt: new Date(),
      emailSent: false,
      status: "active",
      notes: notes || "",
      acknowledgedAt: null,
      acknowledgmentRequired: true,
    };

    // Issuing a PIP immediately locks the profile (the "start lock"). It stays
    // locked until HR manually flips the plain Lock/Unlock toggle - there is no
    // auto-unlock for this initial lock, by design. This is distinct from the
    // end-of-duration auto-lock (pipAutoLock.ts cron), which requires the PIP to
    // be resolved (Completed/Failed) before it can be unlocked.
    const invalidatedAt = Date.now();
    const employeeFilter: Record<string, unknown> = { _id: employeeId };
    const setFields: Record<string, unknown> = {
      isLocked: true,
      lockReason: "pip",
      lastLogout: new Date(invalidatedAt),
      "webSession.sessionId": null,
      "webSession.sessionStartedAt": null,
      "webSession.expiresAt": null,
      "webSession.isLoggedIn": false,
      "mobileSession.sessionId": null,
      "mobileSession.sessionStartedAt": null,
      "mobileSession.lastActiveAt": null,
      "mobileSession.isLoggedIn": false,
      tokenValidAfter: invalidatedAt,
      webTokenValidAfter: invalidatedAt,
      mobileTokenValidAfter: invalidatedAt,
    };
    const updateOptions: {
      new: true;
      runValidators: true;
      arrayFilters?: Array<Record<string, unknown>>;
    } = { new: true, runValidators: true };

    if (currentPipId) {
      const previousPipId = new Types.ObjectId(currentPipId);
      employeeFilter.pips = {
        $elemMatch: { _id: previousPipId, status: "active" },
      };
      setFields["pips.$[previous].status"] = "failed";
      updateOptions.arrayFilters = [{ "previous._id": previousPipId }];
    }

    // The new PIP, optional previous-level transition, lock, and session
    // invalidation are committed in one atomic employee-document update.
    const updatedEmployee = await Employees.findOneAndUpdate(
      employeeFilter,
      {
        $push: { pips: pipRecord },
        $set: setFields,
      },
      updateOptions,
    ).lean() as EmployeeInterface | null;

    if (!updatedEmployee) {
      return NextResponse.json(
        {
          error: currentPipId
            ? "The previous active PIP could not be transitioned. Refresh and try again."
            : "Employee not found",
        },
        { status: currentPipId ? 409 : 404 },
      );
    }

    // Best-effort: kill any active session immediately so the employee is forced
    // to re-authenticate (and see the PIP-lock message) rather than continuing to
    // browse on a stale session.
    let forceLoggedOut = false;
    try {
      const result = await forceLogoutEmployee(employeeId, {
        actorName: actualIssuedBy,
        actorRole: auth?.role || "HR",
        reason: "pip",
        message: PIP_LOCK_SESSION_MESSAGE,
        notes: "Locked due to a newly issued PIP.",
        rotateCredentials: false,
        sessionsAlreadyRevoked: true,
      });
      forceLoggedOut = result.success;
    } catch (err) {
      console.warn("Failed to force-logout employee after issuing PIP:", err);
    }

    // Notify only after the state transition succeeds. This prevents a stale
    // next-level request from emailing the employee when no PIP was recorded.
    let emailSent = false;
    if (sendEmail && employee.email) {
      try {
        if (customEmailSubject && customEmailHtml) {
          const emailResult = await sendCustomEmail(
            employee.email,
            { subject: customEmailSubject, html: customEmailHtml },
            DEFAULT_COMPANY_NAME,
          );
          emailSent = emailResult.success;
        } else {
          const emailResult = await sendPIPEmail({
            to: employee.email,
            employeeName: employee.name,
            pipLevel: pipLevel as PIPLevel,
            startDate,
            endDate,
            concerns:
              pipLevel === "level1" || pipLevel === "forTrainees"
                ? concerns
                : undefined,
            issues: pipLevel === "level2" ? concerns : undefined,
            criticalIssues: pipLevel === "level3" ? concerns : undefined,
          });
          emailSent = emailResult.success;
        }

        if (emailSent) {
          await Employees.updateOne(
            { _id: employeeId, "pips._id": newPipId },
            { $set: { "pips.$.emailSent": true } },
          );
          const createdPip = updatedEmployee.pips?.find(
            (pip) => pip._id?.toString() === newPipId.toString(),
          );
          if (createdPip) createdPip.emailSent = true;
        }
      } catch (emailError) {
        console.error("Failed to send PIP email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "PIP sent and recorded successfully"
        : "PIP recorded (email not sent)",
      emailSent,
      pips: updatedEmployee?.pips || [],
      isLocked: true,
      forceLoggedOut,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.error("PIP API error:", error);
    return NextResponse.json(
      { error: err?.message || "Failed to send PIP" },
      { status: 500 }
    );
  }
}

// Get all PIPs for an employee
export async function GET(request: NextRequest) {
  try {
    const auth = (await getDataFromToken(request)) as unknown as {
      role?: string;
    };
    if (auth.role !== "HR" && auth.role !== "SuperAdmin") {
      return NextResponse.json(
        { error: "Only HR or SuperAdmin can view employee PIPs" },
        { status: 403 },
      );
    }
    await connectDb();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    const parsedEmployeeId = objectIdSchema.safeParse(employeeId);
    if (!parsedEmployeeId.success) {
      return NextResponse.json(
        { error: "A valid employee ID is required" },
        { status: 400 }
      );
    }

    const employee = await Employees.findById(parsedEmployeeId.data).select("pips").lean() as EmployeeInterface | null;
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      pips: employee.pips || [],
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    return NextResponse.json(
      { error: err?.message || "Failed to fetch PIPs" },
      { status: 500 }
    );
  }
}

// Update PIP status
export async function PUT(request: NextRequest) {
  try {
    const auth = (await getDataFromToken(request)) as unknown as {
      role?: string;
    };
    if (auth.role !== "HR" && auth.role !== "SuperAdmin") {
      return NextResponse.json(
        { error: "Only HR or SuperAdmin can update a PIP" },
        { status: 403 },
      );
    }
    await connectDb();
    const parsedBody = updatePipSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid PIP update request",
          details: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const {
      employeeId,
      pipId,
      status,
      customCompletionEmailSubject,
      customCompletionEmailHtml,
    } = parsedBody.data;

    // Get the PIP being updated to access its details
    const employeeBeforeUpdate = await Employees.findById(employeeId).lean() as EmployeeInterface | null;
    if (!employeeBeforeUpdate) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const pipToUpdate = employeeBeforeUpdate.pips?.find((p) => p._id?.toString() === pipId);
    if (!pipToUpdate) {
      return NextResponse.json(
        { error: "PIP not found" },
        { status: 404 }
      );
    }

    const targetPipId = new Types.ObjectId(pipId);
    const isResolution = status === "completed" || status === "failed";
    const otherActivePips = {
      $size: {
        $filter: {
          input: "$pips",
          as: "pip",
          cond: {
            $and: [
              { $ne: ["$$pip._id", targetPipId] },
              { $eq: ["$$pip.status", "active"] },
            ],
          },
        },
      },
    };

    // Update the target status and derive the lock state in one document-level
    // atomic operation. A PIP-driven lock is released only when no other active
    // PIP remains; an unrelated manual lock is always preserved.
    const employee = await Employees.findOneAndUpdate(
      { _id: employeeId, "pips._id": pipId },
      [
        {
          $set: {
            pips: {
              $map: {
                input: "$pips",
                as: "pip",
                in: {
                  $cond: [
                    { $eq: ["$$pip._id", targetPipId] },
                    { $mergeObjects: ["$$pip", { status }] },
                    "$$pip",
                  ],
                },
              },
            },
            isLocked: isResolution
              ? {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$lockReason", "pip"] },
                        { $eq: [otherActivePips, 0] },
                      ],
                    },
                    false,
                    "$isLocked",
                  ],
                }
              : "$isLocked",
            lockReason: isResolution
              ? {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$lockReason", "pip"] },
                        { $eq: [otherActivePips, 0] },
                      ],
                    },
                    null,
                    "$lockReason",
                  ],
                }
              : "$lockReason",
          },
        },
      ],
      { new: true }
    ).lean() as EmployeeInterface | null;

    if (!employee) {
      return NextResponse.json(
        { error: "Employee or PIP not found" },
        { status: 404 }
      );
    }

    // Send completion email if PIP was successfully completed
    let emailSent = false;
    if (status === "completed" && employee.email) {
      try {
        if (customCompletionEmailSubject && customCompletionEmailHtml) {
          // Use custom email content
          const emailResult = await sendCustomEmail(
            employee.email,
            { subject: customCompletionEmailSubject, html: customCompletionEmailHtml },
            DEFAULT_COMPANY_NAME
          );
          emailSent = emailResult.success;
        } else {
          // Use default template
          await sendPIPCompletionEmail(
            employee.email,
            employee.name,
            pipToUpdate.pipLevel as PIPLevel,
            pipToUpdate.startDate,
            pipToUpdate.endDate,
            DEFAULT_COMPANY_NAME
          );
          emailSent = true;
        }
      } catch (error: any) {
        console.error("Failed to send PIP completion email:", error);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "PIP status updated successfully",
      pips: employee?.pips || [],
      emailSent,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    return NextResponse.json(
      { error: err?.message || "Failed to update PIP" },
      { status: 500 }
    );
  }
}

// Delete a PIP
export async function DELETE(request: NextRequest) {
  try {
    const auth = (await getDataFromToken(request)) as unknown as {
      role?: string;
    };
    if (auth.role !== "HR" && auth.role !== "SuperAdmin") {
      return NextResponse.json(
        { error: "Only HR or SuperAdmin can delete a PIP" },
        { status: 403 },
      );
    }
    await connectDb();
    const parsedBody = deletePipSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid PIP delete request",
          details: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const { employeeId, pipId } = parsedBody.data;

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
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    return NextResponse.json(
      { error: err?.message || "Failed to delete PIP" },
      { status: 500 }
    );
  }
}