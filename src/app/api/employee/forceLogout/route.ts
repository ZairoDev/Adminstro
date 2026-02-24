import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";

connectDb();

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  employeeId: z.string().min(1),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Invalid request body", errors: parsed.error.format() }, { status: 400 });
    }

    const { employeeId, sessionId } = parsed.data;

    // mark employee as logged out
    const logoutTime = new Date();
    await Employees.updateOne(
      { _id: employeeId },
      { $set: { isLoggedIn: false, lastLogout: logoutTime } }
    );

    // end active session(s) for this employee (either specific sessionId or all active)
    const sessionQuery: any = { employeeId: employeeId, status: "active", activityType: "login" };
    if (sessionId) sessionQuery.sessionId = sessionId;

    try {
      const activeSessions = await EmployeeActivityLog.find(sessionQuery);
      for (const session of activeSessions) {
        const loginTime = session.loginTime ? new Date(session.loginTime) : null;
        const durationMinutes = loginTime ? Math.max(0, Math.round((logoutTime.getTime() - loginTime.getTime()) / (1000 * 60))) : 0;
        session.logoutTime = logoutTime;
        session.duration = durationMinutes;
        session.status = "ended";
        session.lastActivityAt = logoutTime;
        // best-effort save; do not block on a single failure
        // eslint-disable-next-line no-await-in-loop
        await session.save().catch(() => {});
      }
    } catch (e) {
      console.warn("Failed to update activity logs during force logout:", e);
    }

    // emit socket event for realtime clients and disconnect sockets in rooms
    try {
      if ((global as any).io) {
        const io = (global as any).io;
        // Emit to a user-specific room so only that user's clients receive it
        io.to(`user-${employeeId}`).emit("force-logout", { _id: employeeId, sessionId });
        // Also emit to session-specific room if provided
        if (sessionId) {
          io.to(`session-${sessionId}`).emit("force-logout", { _id: employeeId, sessionId });
        }

        // Disconnect sockets in user room
        try {
          const userRoom = `user-${employeeId}`;
          const userSockets = await io.in(userRoom).fetchSockets();
          console.log(`Force logout: found ${userSockets.length} socket(s) in ${userRoom}`);
          for (const s of userSockets) {
            try {
              s.disconnect(true);
            } catch (err) {
              // ignore individual disconnect failures
            }
          }

          if (sessionId) {
            const sessionRoom = `session-${sessionId}`;
            const sessionSockets = await io.in(sessionRoom).fetchSockets();
            console.log(`Force logout: found ${sessionSockets.length} socket(s) in ${sessionRoom}`);
            for (const s of sessionSockets) {
              try {
                s.disconnect(true);
              } catch (err) {}
            }
          }
        } catch (err) {
          console.warn("Failed to fetch/disconnect sockets during force logout:", err);
        }

        // Fallback: iterate all connected sockets and disconnect those with matching metadata
        try {
          const allSockets = io.sockets.sockets;
          const matched: string[] = [];
          allSockets.forEach((s: any) => {
            try {
              const empId = s.data?.employeeId;
              const sid = s.data?.sessionId;
              if (empId === employeeId || (sessionId && sid === sessionId)) {
                matched.push(s.id);
                s.disconnect(true);
              }
            } catch (e) {
              // ignore per-socket errors
            }
          });
          if (matched.length > 0) {
            console.log(`Force logout fallback: disconnected ${matched.length} socket(s) by metadata`);
          } else {
            console.log(`Force logout fallback: no sockets matched by metadata for employee ${employeeId}`);
          }
        } catch (err) {
          console.warn("Force logout fallback failed:", err);
        }
      }
    } catch (e) {
      console.warn("Socket emit failed for force logout:", e);
    }

    return NextResponse.json({ success: true, message: "Employee force-logged out" });
  } catch (error: any) {
    console.error("Force logout error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

