import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { AttendanceError } from "@/modules/attendance/errors";

const READ_ROLES = new Set(["SuperAdmin", "Admin", "HR"]);

export type AttendanceActor = {
  id: string;
  name: string;
  role: string;
  email: string;
};

type TokenPayload = {
  id?: string;
  name?: string;
  role?: string;
  email?: string;
};

function toActor(payload: TokenPayload): AttendanceActor {
  return {
    id: String(payload.id),
    name: payload.name?.trim() || "Unknown user",
    role: payload.role ?? "",
    email: payload.email?.trim() || "",
  };
}

export async function requireSignedIn(request: NextRequest): Promise<AttendanceActor> {
  const payload = (await getDataFromToken(request)) as TokenPayload;
  if (!payload.id) {
    throw { status: 401, code: "UNAUTHORIZED", message: "Unauthorized" };
  }
  return toActor(payload);
}

export async function requireAttendanceReader(request: NextRequest): Promise<AttendanceActor> {
  const actor = await requireSignedIn(request);
  if (!READ_ROLES.has(actor.role)) {
    throw { status: 403, code: "FORBIDDEN", message: "Attendance access required" };
  }
  return actor;
}

export async function requireAttendancePolicyAdmin(
  request: NextRequest,
): Promise<AttendanceActor> {
  const actor = await requireAttendanceReader(request);
  if (actor.role !== "SuperAdmin") {
    throw { status: 403, code: "FORBIDDEN", message: "Only a super admin can change attendance settings" };
  }
  return actor;
}

export function canCorrectAttendance(role: string): boolean {
  return READ_ROLES.has(role);
}

export function attendanceErrorResponse(error: unknown): {
  status: number;
  body: { success: false; code?: string; message: string };
} {
  if (error instanceof AttendanceError) {
    return {
      status: error.status,
      body: { success: false, message: error.message },
    };
  }
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    const thrown = error as { status: number; code?: string; message?: string };
    return {
      status: thrown.status,
      body: {
        success: false,
        code: thrown.code,
        message: thrown.message ?? "Unauthorized",
      },
    };
  }
  return {
    status: 500,
    body: { success: false, message: "Attendance request failed" },
  };
}

export function attendanceJsonError(error: unknown, label: string): NextResponse {
  const mapped = attendanceErrorResponse(error);
  if (mapped.status === 500) console.error(label, error);
  return NextResponse.json(mapped.body, { status: mapped.status });
}
