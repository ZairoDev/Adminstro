import { NextResponse } from "next/server";

const TERMINAL_AUTH_CODES = new Set([
  "AUTH_EXPIRED",
  "SESSION_INVALID",
  "INVALID_TOKEN",
  "USER_NOT_FOUND",
]);

interface AuthErrorOptions {
  status: number;
  code: string;
  message?: string;
}

export function buildAuthErrorResponse(options: AuthErrorOptions) {
  const { status, code, message } = options;

  const response = NextResponse.json(
    {
      success: false,
      code,
      message: message ?? "Unauthorized",
    },
    { status },
  );

  // Only clear cookies when the server is explicitly saying
  // \"you are unauthenticated\" (401) *and* the code is a
  // terminal auth failure. This prevents accidental cookie
  // clearing for unrelated 4xx/5xx responses.
  if (status === 401 && TERMINAL_AUTH_CODES.has(code)) {
    response.cookies.set("token", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });

    response.cookies.set("sessionId", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });
  }

  return response;
}


