import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import { getDataFromToken } from "@/util/getDataFromToken";
import { generatePassword } from "@/util/generatePassword";

connectDb();

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  employeeId: z.string().min(1),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize caller using shared token logic
    let auth: any;
    try {
      auth = await getDataFromToken(request);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    const role = auth?.role as string | undefined;
    const allowedRoles = ["SuperAdmin", "Admin", "HR", "Developer", "HAdmin"];
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body",
          errors: parsed.error.format(),
        },
        { status: 400 },
      );
    }

    const { employeeId, sessionId } = parsed.data;

    // Fetch employee details before updating
    const employee = await Employees.findById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Employee not found" },
        { status: 404 },
      );
    }

    // Generate new password and update employee
    let newPassword: string | null = null;
    const logoutTime = new Date();
    try {
      newPassword = generatePassword(8);


      // mark employee as logged out and change password
      await Employees.updateOne(
        { _id: employeeId },
        {
          $set: {
            isLoggedIn: false,
            lastLogout: logoutTime,
            sessionId: null,
            sessionStartedAt: null,
            tokenValidAfter: Date.now(),
            password: newPassword,
            passwordExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        },
      );

      // Log the new password for admin reference (should be communicated to employee securely)
      console.log(`🔐 Forced logout for ${employee.email}: New password generated: ${newPassword}`);
    } catch (updateError: any) {
      console.error("Error during employee update and password change:", updateError);
      return NextResponse.json(
        { success: false, message: "Failed to update employee data" },
        { status: 500 },
      );
    }

    // Create activity log entry for forced logout (separate from employee update for robustness)
    try {
      const forcedLogoutLog = new EmployeeActivityLog({
        employeeId,
        employeeName: employee.name,
        employeeEmail: employee.email,
        role: employee.role,
        activityType: "logout",
        logoutTime,
        duration: 0, // No duration for forced logout
        notes: `Forced logout by ${auth.name} (${auth.role}). Password changed.`,
        sessionId: sessionId || null,
        status: "ended",
        lastActivityAt: logoutTime,
      });
      await forcedLogoutLog.save();
    } catch (logError: any) {
      console.error("Error creating activity log for forced logout:", logError);
      // Don't fail the operation if logging fails
    }

    // end active session(s) for this employee (either specific sessionId or all active)
    const sessionQuery: any = {
      employeeId,
      status: "active",
      activityType: "login",
    };
    if (sessionId) sessionQuery.sessionId = sessionId;

    try {
      const activeSessions = await EmployeeActivityLog.find(sessionQuery);
      await Promise.all(
        activeSessions.map((session: any) => {
          const loginTime = session.loginTime
            ? new Date(session.loginTime)
            : null;
          const durationMinutes = loginTime
            ? Math.max(
                0,
                Math.round(
                  (logoutTime.getTime() - loginTime.getTime()) / (1000 * 60),
                ),
              )
            : 0;
          session.logoutTime = logoutTime;
          session.duration = durationMinutes;
          session.status = "ended";
          session.lastActivityAt = logoutTime;
          return session.save().catch(() => {});
        }),
      );
    } catch (e) {
      console.warn(
        "Failed to update activity logs during force logout:",
        e,
      );
    }

    // emit socket event for realtime clients and disconnect sockets in rooms
    try {
      if ((global as any).io) {
        const io = (global as any).io;
        // Emit to a user-specific room so only that user's clients receive it
        io.to(`user-${employeeId}`).emit("force-logout", {
          _id: employeeId,
          sessionId,
        });
        // Also emit to session-specific room if provided
        if (sessionId) {
          io.to(`session-${sessionId}`).emit("force-logout", {
            _id: employeeId,
            sessionId,
          });
        }

        // Disconnect sockets in user room
        try {
          const userRoom = `user-${employeeId}`;
          const userSockets = await io.in(userRoom).fetchSockets();
          console.log(
            `Force logout: found ${userSockets.length} socket(s) in ${userRoom}`,
          );
          for (const s of userSockets) {
            try {
              s.disconnect(true);
            } catch {
              // ignore individual disconnect failures
            }
          }

          if (sessionId) {
            const sessionRoom = `session-${sessionId}`;
            const sessionSockets = await io.in(sessionRoom).fetchSockets();
            console.log(
              `Force logout: found ${sessionSockets.length} socket(s) in ${sessionRoom}`,
            );
            for (const s of sessionSockets) {
              try {
                s.disconnect(true);
              } catch {
                // ignore
              }
            }
          }
        } catch (err) {
          console.warn(
            "Failed to fetch/disconnect sockets during force logout:",
            err,
          );
        }
      }
    } catch (e) {
      console.warn("Socket emit failed for force logout:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Employee force-logged out",
    });
  } catch (error: any) {
    console.error("Force logout error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
