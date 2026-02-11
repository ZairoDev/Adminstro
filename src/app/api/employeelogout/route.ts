import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";
import type { NextRequest, NextResponse as ResponseType } from "next/server";
import jwt from "jsonwebtoken";
import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";

export const dynamic = "force-dynamic";

connectDb();

export async function GET(request: NextRequest): Promise<ResponseType> {
  try {
    // Get token from cookies or authorization header
    const token = request.cookies.get("token")?.value || 
                  request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET as string) as any;
        
        // Update employee login status
        const logoutTime = new Date();
        await Employees.updateOne(
          { _id: decoded.id },
          { $set: { isLoggedIn: false, lastLogout: logoutTime } }
        );

        // Session-based logout: end the matching active login record for this device/session
        try {
          const sessionId = request.cookies.get("sessionId")?.value;
          if (sessionId) {
            const loginDoc = await EmployeeActivityLog.findOne({
              sessionId,
              status: "active",
              activityType: "login",
            });
            if (loginDoc) {
              const loginTime = loginDoc.loginTime ? new Date(loginDoc.loginTime) : null;
              const durationMinutes = loginTime ? Math.max(0, Math.round((logoutTime.getTime() - loginTime.getTime()) / (1000 * 60))) : 0;
              loginDoc.logoutTime = logoutTime;
              loginDoc.duration = durationMinutes;
              loginDoc.status = "ended";
              loginDoc.lastActivityAt = logoutTime;
              await loginDoc.save().catch(() => {});
            }
          }
        } catch (e) {
          console.warn("Session-based logout update failed:", e);
        }

        // Log logout activity
        try {
          const employee = await Employees.findById(decoded.id);
          if (employee) {
            const sessionId = request.cookies.get("sessionId")?.value || null;
            const activityLog = new EmployeeActivityLog({
              employeeId: decoded.id.toString(),
              employeeName: decoded.name || employee.name,
              employeeEmail: decoded.email || employee.email,
              role: decoded.role || employee.role,
              activityType: "logout",
              logoutTime: logoutTime,
              sessionId,
              status: "ended",
              lastActivityAt: logoutTime,
              ipAddress: extractIPFromRequest(request),
              userAgent: request.headers.get("user-agent") || "",
              notes: "Logout from employee portal",
            });
            
            await activityLog.save().catch((err: any) => {
              console.warn("Failed to log logout activity:", err.message);
            });
          }
        } catch (activityError) {
          console.warn("Activity logging failed (non-critical):", activityError);
        }

        // Emit socket event for real-time tracking
        if ((global as any).io) {
          (global as any).io.emit("employee-logout", {
            _id: decoded.id,
            email: decoded.email,
          });
        }
      } catch (err) {
        // Token might be expired, try to decode without verification
        const decoded = jwt.decode(token) as any;
        if (decoded?.id) {
          const logoutTime = new Date();
          await Employees.updateOne(
            { _id: decoded.id },
            { $set: { isLoggedIn: false, lastLogout: logoutTime } }
          );

          // Log logout activity
          try {
            const employee = await Employees.findById(decoded.id);
            if (employee) {
            const sessionId = request.cookies.get("sessionId")?.value || null;
            const activityLog = new EmployeeActivityLog({
                employeeId: decoded.id.toString(),
                employeeName: decoded.name || employee.name,
                employeeEmail: decoded.email || employee.email,
                role: decoded.role || employee.role,
                activityType: "logout",
                logoutTime: logoutTime,
              sessionId,
              status: "ended",
              lastActivityAt: logoutTime,
                ipAddress: extractIPFromRequest(request),
                userAgent: request.headers.get("user-agent") || "",
                notes: "Logout from employee portal",
              });
              
              await activityLog.save().catch((err: any) => {
                console.warn("Failed to log logout activity:", err.message);
              });
            }
          } catch (activityError) {
            console.warn("Activity logging failed (non-critical):", activityError);
          }

          if ((global as any).io) {
            (global as any).io.emit("employee-logout", {
              _id: decoded.id,
              email: decoded.email,
            });
          }
        }
      }
    }

    // Create the response
    const response = NextResponse.json({
      message: "Logged out successfully",
      success: true,
    });

    await response.cookies.delete({
      name: "token",
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    // clear sessionId cookie as well
    try {
      await response.cookies.delete({
        name: "sessionId",
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    } catch (e) {}

    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    // Handle errors if any occur
    return NextResponse.json(
      { message: "An error occurred", success: false },
      { status: 500 }
    );
  }
}

function extractIPFromRequest(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  return (forwarded ? forwarded.split(",")[0] : real) || "Unknown";
}
