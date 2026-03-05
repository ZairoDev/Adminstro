import { NextRequest } from "next/server";
import { jwtVerify, decodeJwt } from "jose";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";

export const getDataFromToken = async (request: NextRequest) => {
  let token: string | undefined;

  try {
    token = request.cookies.get("token")?.value;

    if (!token) {
      throw { status: 401, code: "NO_TOKEN" };
    }

    const secret = new TextEncoder().encode(process.env.TOKEN_SECRET!);

    const { payload } = await jwtVerify(token, secret);

    const employeeId = payload.id as string;
    const sessionId = payload.sid as string;

    if (!employeeId) {
      throw { status: 401, code: "INVALID_TOKEN" };
    }

    await connectDb();

    const employee = await Employees.findById(employeeId);

    if (!employee) {
      throw { status: 401, code: "USER_NOT_FOUND" };
    }

    if (!employee.sessionId || employee.sessionId !== sessionId) {
      throw { status: 401, code: "SESSION_INVALID", };
    }

    return payload;
  } catch (error: any) {
    // 🔥 JWT Expired Handling
    if (error?.code === "ERR_JWT_EXPIRED" && token) {
      try {
        const decoded: any = decodeJwt(token);
        const employeeId = decoded?.id;

        if (employeeId) {
          await connectDb();

          await Employees.updateOne(
            { _id: employeeId },
            {
              $set: {
                sessionId: null,
                sessionStartedAt: null,
                tokenValidAfter: Date.now(),
                isLoggedIn: false,
              },
            },
          );
        }
      } catch {
        console.log("Decode failed");
      }

      throw { status: 401, code: "AUTH_EXPIRED" };
    }

    // Pass structured errors forward
    if (error?.code && error?.status) {
      throw error;
    }

    // Fallback unknown auth failure
    throw { status: 401, code: "AUTH_FAILED" };
  }
};
