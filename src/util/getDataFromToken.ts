import { NextRequest } from "next/server";
import { jwtVerify, decodeJwt } from "jose";
import Employees from "@/models/employee";
import HousingCollaborator from "@/models/housingCollaborator";
import { connectDb } from "@/util/db";
import { getDeviceTypeFromHeaders } from "@/util/deviceSession";
import { resolveEmployeeRentalType } from "@/util/employeeRentalTypeAccess";
import {
  HOUSING_COLLABORATOR_ACCOUNT_TYPE,
  HOUSING_COLLABORATOR_ROLE,
} from "@/schemas/housingCollaborator.schema";
// NOTE: imported lazily (inside the two call sites below) instead of as a
// static top-level import. This file is imported by nearly every API route
// in the app; a static import of employeeActivitySession.ts here made
// Next's dev bundler fail to register dozens of unrelated routes (they'd
// compile but resolve to a 404 not-found page). A dynamic import breaks
// that dependency edge while keeping the same runtime behavior.

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

    const accountId = payload.id as string;
    const sessionId = payload.sid as string;
    const issuedAtSeconds = payload.iat as number | undefined;
    const accountType = String((payload as { accountType?: unknown }).accountType ?? "");
    const role = String((payload as { role?: unknown }).role ?? "");

    if (!accountId) {
      throw { status: 401, code: "INVALID_TOKEN" };
    }

    // Test SuperAdmin has no DB record; accept token as-is
    if (accountId === "test-superadmin") {
      return payload;
    }

    await connectDb();

    // Housing Saga collaborators — separate identity from Employees
    if (
      accountType === HOUSING_COLLABORATOR_ACCOUNT_TYPE ||
      role === HOUSING_COLLABORATOR_ROLE
    ) {
      const collaborator = await HousingCollaborator.findById(accountId).select(
        "isActive webSession tokenValidAfter name email allotedArea",
      );

      if (!collaborator || collaborator.isActive === false) {
        throw { status: 401, code: "USER_NOT_FOUND" };
      }

      if (typeof issuedAtSeconds === "number") {
        const issuedAtMs = issuedAtSeconds * 1000;
        const SKEW_TOLERANCE_MS = 1500;
        const cutoff =
          typeof collaborator.tokenValidAfter === "number"
            ? collaborator.tokenValidAfter
            : 0;
        if (cutoff > 0 && issuedAtMs + SKEW_TOLERANCE_MS < cutoff) {
          throw { status: 401, code: "SESSION_INVALID" };
        }
      }

      const slot = collaborator.webSession;
      const slotMatches =
        Boolean(slot?.sessionId) &&
        slot?.sessionId === sessionId &&
        slot?.isLoggedIn === true;

      if (!slotMatches) {
        throw { status: 401, code: "SESSION_INVALID" };
      }

      if (deviceType === "web") {
        const expiresAt = slot?.expiresAt;
        if (typeof expiresAt === "number" && expiresAt > 0 && Date.now() > expiresAt) {
          await HousingCollaborator.updateOne(
            { _id: accountId, "webSession.sessionId": sessionId },
            {
              $set: {
                "webSession.sessionId": null,
                "webSession.sessionStartedAt": null,
                "webSession.expiresAt": null,
                "webSession.lastActiveAt": null,
                "webSession.isLoggedIn": false,
              },
            },
          ).catch(() => undefined);
          throw { status: 401, code: "AUTH_EXPIRED" };
        }

        await HousingCollaborator.updateOne(
          { _id: accountId, "webSession.sessionId": sessionId },
          { $set: { "webSession.lastActiveAt": Date.now() } },
        ).catch(() => undefined);
      }

      return {
        ...payload,
        id: String(collaborator._id),
        name: collaborator.name,
        email: collaborator.email,
        role: HOUSING_COLLABORATOR_ROLE,
        accountType: HOUSING_COLLABORATOR_ACCOUNT_TYPE,
        allotedArea: Array.isArray(collaborator.allotedArea)
          ? collaborator.allotedArea
          : [],
      };
    }

    const employeeId = accountId;

    const employee = await Employees.findById(employeeId).select(
      "tokenValidAfter webTokenValidAfter mobileTokenValidAfter mobileSession webSession rentalType",
    );

    if (!employee) {
      throw { status: 401, code: "USER_NOT_FOUND" };
    }

    // Force-invalidate tokens (password change / admin logout)
    // jsonwebtoken's `iat` is second-granularity, while `tokenValidAfter` is ms.
    // Without a tolerance window, a freshly issued token can be rejected
    // if tokenValidAfter is set a few hundred ms after iat's rounded timestamp.
    if (typeof issuedAtSeconds === "number") {
      const issuedAtMs = issuedAtSeconds * 1000;
      const SKEW_TOLERANCE_MS = 1500;

      // Prefer device-specific invalidation when present; fall back to legacy tokenValidAfter.
      const legacy = typeof employee.tokenValidAfter === "number" ? employee.tokenValidAfter : 0;
      const webCutoff =
        typeof (employee as any).webTokenValidAfter === "number"
          ? (employee as any).webTokenValidAfter
          : 0;
      const mobileCutoff =
        typeof (employee as any).mobileTokenValidAfter === "number"
          ? (employee as any).mobileTokenValidAfter
          : 0;

      const cutoff =
        deviceType === "mobile"
          ? (mobileCutoff > 0 ? mobileCutoff : legacy)
          : (webCutoff > 0 ? webCutoff : legacy);

      if (typeof cutoff === "number" && cutoff > 0 && issuedAtMs + SKEW_TOLERANCE_MS < cutoff) {
        throw { status: 401, code: "SESSION_INVALID" };
      }
    }

    const slot = deviceType === "mobile" ? employee.mobileSession : employee.webSession;
    const slotMatches =
      Boolean(slot?.sessionId) &&
      slot?.sessionId === sessionId &&
      slot?.isLoggedIn === true;

    let restoredSweptSlot = false;
    if (!slotMatches) {
      // Sweeper-freed web slot: JWT is still valid (force-logout / PIP /
      // password rotation already failed the *TokenValidAfter check above).
      // Restore instead of kicking someone who checked email. A different
      // live web session stays SESSION_INVALID. Explicit logout deleted the
      // cookie, so it never reaches here.
      if (deviceType === "web" && sessionId) {
        const { restoreWebSessionIfSwept } = await import("@/util/webSession");
        const restoreResult = await restoreWebSessionIfSwept({
          employeeId,
          sessionId,
          issuedAtMs:
            typeof issuedAtSeconds === "number"
              ? issuedAtSeconds * 1000
              : undefined,
        });
        if (restoreResult === "expired") {
          throw { status: 401, code: "AUTH_EXPIRED" };
        }
        if (restoreResult !== "restored") {
          throw { status: 401, code: "SESSION_INVALID" };
        }
        restoredSweptSlot = true;
      } else {
        throw { status: 401, code: "SESSION_INVALID" };
      }
    }

    // Web session expiry enforcement (12h), independent of JWT exp.
    if (deviceType === "web") {
      // After a sweeper restore the in-memory slot is vacant; restore already
      // enforced the 12h ceiling from JWT iat, so don't trust stale expiresAt.
      const expiresAt = restoredSweptSlot
        ? undefined
        : ((slot as { expiresAt?: number | null } | null | undefined)?.expiresAt);
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
        // Without this, the login-activity dashboard shows the session as
        // "active" forever — the web session expired but nothing ever told
        // the activity log to close it out.
        try {
          const { endActiveEmployeeLoginSessions } = await import(
            "@/util/employeeActivitySession"
          );
          await endActiveEmployeeLoginSessions({
            employeeId,
            logoutTime: new Date(),
            sessionId,
          });
        } catch {
          // non-critical
        }
        throw { status: 401, code: "AUTH_EXPIRED" };
      }

      // Web session heartbeat: any authenticated web request keeps the session
      // alive and cancels a pending tab-close release (e.g. after a refresh).
      await Employees.updateOne(
        { _id: employeeId, "webSession.sessionId": sessionId },
        {
          $set: {
            "webSession.lastActiveAt": Date.now(),
            "webSession.pendingReleaseAt": null,
          },
        },
      ).catch(() => undefined);
    } else {
      // Mobile session heartbeat
      await Employees.updateOne(
        { _id: employeeId, "mobileSession.sessionId": sessionId },
        { $set: { "mobileSession.lastActiveAt": Date.now() } },
      ).catch(() => undefined);
    }

    const rentalType = resolveEmployeeRentalType(
      payload.rentalType,
      (employee as { rentalType?: unknown }).rentalType,
    );

    return {
      ...payload,
      rentalType,
    };
  } catch (error: any) {
    // JWT Expired Handling
    if (error?.code === "ERR_JWT_EXPIRED" && token) {
      try {
        const decoded: any = decodeJwt(token);
        const employeeId = decoded?.id;
        const sessionId = decoded?.sid;
        const accountType = String(decoded?.accountType ?? "");
        const decodedRole = String(decoded?.role ?? "");

        if (employeeId) {
          await connectDb();

          if (
            accountType === HOUSING_COLLABORATOR_ACCOUNT_TYPE ||
            decodedRole === HOUSING_COLLABORATOR_ROLE
          ) {
            await HousingCollaborator.updateOne(
              sessionId
                ? { _id: employeeId, "webSession.sessionId": sessionId }
                : { _id: employeeId },
              {
                $set: {
                  "webSession.sessionId": null,
                  "webSession.sessionStartedAt": null,
                  "webSession.expiresAt": null,
                  "webSession.lastActiveAt": null,
                  "webSession.isLoggedIn": false,
                },
              },
            ).catch(() => undefined);
            throw { status: 401, code: "AUTH_EXPIRED" };
          }

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

          try {
            const { endActiveEmployeeLoginSessions } = await import(
              "@/util/employeeActivitySession"
            );
            await endActiveEmployeeLoginSessions({
              employeeId: String(employeeId),
              logoutTime: new Date(),
              sessionId: sessionId ?? null,
            });
          } catch {
            // non-critical
          }
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
