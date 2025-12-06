import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";
import type { NextRequest, NextResponse as ResponseType } from "next/server";
import jwt from "jsonwebtoken";
import Employees from "@/models/employee";

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
        await Employees.updateOne(
          { _id: decoded.id },
          { $set: { isLoggedIn: false, lastLogout: new Date() } }
        );

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
          await Employees.updateOne(
            { _id: decoded.id },
            { $set: { isLoggedIn: false, lastLogout: new Date() } }
          );

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
      sameSite: "none",
      secure: true,
    });

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
