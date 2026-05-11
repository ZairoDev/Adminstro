import { NextRequest } from "next/server";
import { jwtVerify, decodeJwt } from "jose";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDeviceTypeFromHeaders } from "@/util/deviceSession";

export const getDataFromToken = async (request: NextRequest) => {
  let token: string | undefined;
  const deviceType = getDeviceTypeFromHeaders(request.headers);

  try {
    token = request.cookies.get("token")?.value;

    // Mobile/third-party clients may not use httpOnly cookies.
    // Accept standard Bearer auth as a fallback.
    if (!token) {
      const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
      if (authHeader && typeof authHeader === "string") {
        const m = authHeader.match(/^Bearer\s+(.+)$/i);
        if (m?.[1]) token = m[1].trim();
      }
    }

    if (!token) {
      throw { status: 401, code: "NO_TOKEN" };
    }

    const secret = new TextEncoder().encode(process.env.TOKEN_SECRET!);

    const { payload } = await jwtVerify(token, secret);

    const employeeId = payload.id as string;
    const sessionId = payload.sid as string;
    const issuedAtSeconds = payload.iat as number | undefined;

    if (!employeeId) {
      throw { status: 401, code: "INVALID_TOKEN" };
    }

    // Test SuperAdmin has no DB record; accept token as-is
    if (employeeId === "test-superadmin") {
      return payload;
    }

    await connectDb();

    const employee = await Employees.findById(employeeId);

    if (!employee) {
      throw { status: 401, code: "USER_NOT_FOUND" };
    }

    // Force-invalidate tokens (password change / admin logout)
    // jsonwebtoken's `iat` is second-granularity, while `tokenValidAfter` is ms.
    // Without a tolerance window, a freshly issued token can be rejected
    // if tokenValidAfter is set a few hundred ms after iat's rounded timestamp.
    if (
      typeof employee.tokenValidAfter === "number" &&
      employee.tokenValidAfter > 0 &&
      typeof issuedAtSeconds === "number"
    ) {
      const issuedAtMs = issuedAtSeconds * 1000;
      const SKEW_TOLERANCE_MS = 1500;
      if (issuedAtMs + SKEW_TOLERANCE_MS < employee.tokenValidAfter) {
        throw { status: 401, code: "SESSION_INVALID" };
      }
    }

    const slot = deviceType === "mobile" ? employee.mobileSession : employee.webSession;
    if (!slot?.sessionId || slot.sessionId !== sessionId || slot.isLoggedIn !== true) {
      throw { status: 401, code: "SESSION_INVALID" };
    }

    // Web session expiry enforcement (12h), independent of JWT exp.
    if (deviceType === "web") {
      const expiresAt = (slot as any)?.expiresAt as number | null | undefined;
      if (typeof expiresAt === "number" && expiresAt > 0 && Date.now() > expiresAt) {
        // Best-effort cleanup; don't touch tokenValidAfter.
        await Employees.updateOne(
          { _id: employeeId, "webSession.sessionId": sessionId },
          {
            $set: {
              "webSession.sessionId": null,
              "webSession.sessionStartedAt": null,
              "webSession.expiresAt": null,
              "webSession.isLoggedIn": false,
            },
          },
        ).catch(() => undefined);
        throw { status: 401, code: "AUTH_EXPIRED" };
      }
    } else {
      // Mobile session heartbeat
      await Employees.updateOne(
        { _id: employeeId, "mobileSession.sessionId": sessionId },
        { $set: { "mobileSession.lastActiveAt": Date.now() } },
      ).catch(() => undefined);
    }

    return payload;
  } catch (error: any) {
    // 🔥 JWT Expired Handling
    if (error?.code === "ERR_JWT_EXPIRED" && token) {
      try {
        const decoded: any = decodeJwt(token);
        const employeeId = decoded?.id;
        const sessionId = decoded?.sid;

        if (employeeId) {
          await connectDb();

          const isMobile = deviceType === "mobile";
          const matchField = isMobile ? "mobileSession.sessionId" : "webSession.sessionId";
          const unsetPrefix = isMobile ? "mobileSession" : "webSession";
          await Employees.updateOne(
            sessionId ? { _id: employeeId, [matchField]: sessionId } : { _id: employeeId },
            {
              $set: isMobile
                ? {
                    [`${unsetPrefix}.sessionId`]: null,
                    [`${unsetPrefix}.sessionStartedAt`]: null,
                    [`${unsetPrefix}.lastActiveAt`]: null,
                    [`${unsetPrefix}.isLoggedIn`]: false,
                  }
                : {
                    [`${unsetPrefix}.sessionId`]: null,
                    [`${unsetPrefix}.sessionStartedAt`]: null,
                    [`${unsetPrefix}.expiresAt`]: null,
                    [`${unsetPrefix}.isLoggedIn`]: false,
                  },
            },
          ).catch(() => undefined);
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

    const rawMessage = String(error?.message ?? "");
    const loweredMessage = rawMessage.toLowerCase();
    const rawCode = String(error?.code ?? "");
    const isDbConnectivityError =
      rawCode === "ETIMEOUT" ||
      rawCode === "ENOTFOUND" ||
      rawCode === "ECONNREFUSED" ||
      loweredMessage.includes("querysrv") ||
      loweredMessage.includes("mongodb connection failed") ||
      loweredMessage.includes("server selection") ||
      loweredMessage.includes("timed out") ||
      loweredMessage.includes("getaddrinfo");

    if (isDbConnectivityError) {
      throw { status: 503, code: "DB_UNAVAILABLE" };
    }

    // Fallback unknown auth failure
    throw { status: 401, code: "AUTH_FAILED" };
  }
};
