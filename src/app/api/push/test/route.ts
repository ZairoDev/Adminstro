import { NextRequest, NextResponse } from "next/server";

import { getDataFromToken } from "@/util/getDataFromToken";
import { sendExpoPushTestToEmployee } from "@/services/push/expoPush.service";

/**
 * POST /api/push/test
 * Sends a test notification to all devices registered for the logged-in employee
 * and verifies real delivery via Expo receipts so the app can show the exact result.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await getDataFromToken(req);
    const employeeId = payload?.id as string | undefined;
    if (!employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await sendExpoPushTestToEmployee(employeeId);

    if (result.attempted === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_DEVICE_TOKENS",
          message:
            "No push token is registered for your account. Open the mobile app, log in, and allow notifications.",
          result,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: result.ok,
      message: result.summary,
      result,
    });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    const code = typeof e?.code === "string" ? e.code : "PUSH_TEST_FAILED";
    return NextResponse.json({ error: code }, { status });
  }
}
