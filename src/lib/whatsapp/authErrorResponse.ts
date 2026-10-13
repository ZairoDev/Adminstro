import { NextResponse } from "next/server";

type StructuredAuthError = { status: number; code: string };

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  NO_TOKEN: "Unauthorized",
  INVALID_TOKEN: "Unauthorized",
  USER_NOT_FOUND: "Unauthorized",
  SESSION_INVALID: "Session is no longer valid",
  AUTH_EXPIRED: "Session expired",
  AUTH_FAILED: "Unauthorized",
  DB_UNAVAILABLE: "Service temporarily unavailable",
};

function isStructuredAuthError(error: unknown): error is StructuredAuthError {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as Record<string, unknown>;
  return typeof candidate.status === "number" && typeof candidate.code === "string";
}

/**
 * `getDataFromToken` throws `{ status, code }` instead of returning null.
 * Returns the matching HTTP response, or null when the error is not an auth error.
 */
export function toAuthErrorResponse(error: unknown): NextResponse | null {
  if (!isStructuredAuthError(error)) return null;
  return NextResponse.json(
    {
      success: false,
      error: AUTH_ERROR_MESSAGES[error.code] ?? "Unauthorized",
      code: error.code,
    },
    { status: error.status },
  );
}
