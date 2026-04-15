import { NextRequest, NextResponse } from "next/server";
import { Expo } from "expo-server-sdk";

import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import ExpoPushTokens from "@/models/expoPushToken";

type RegisterBody = {
  expoPushToken: string;
  platform?: "ios" | "android";
  deviceId?: string;
  deviceName?: string;
  projectId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const payload = await getDataFromToken(req);
    const employeeId = payload?.id as string | undefined;
    if (!employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as RegisterBody | null;
    if (!body || typeof body.expoPushToken !== "string") {
      return NextResponse.json({ error: "expoPushToken is required" }, { status: 400 });
    }

    const token = body.expoPushToken.trim();
    if (!Expo.isExpoPushToken(token)) {
      return NextResponse.json({ error: "Invalid Expo push token" }, { status: 400 });
    }

    await connectDb();

    await ExpoPushTokens.findOneAndUpdate(
      { token },
      {
        $set: {
          employeeId,
          token,
          platform: body.platform,
          deviceId: body.deviceId,
          deviceName: body.deviceName,
          projectId: body.projectId,
          lastSeenAt: new Date(),
          disabledAt: null,
          disabledReason: null,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    const code = typeof e?.code === "string" ? e.code : "PUSH_REGISTER_FAILED";
    return NextResponse.json({ error: code }, { status });
  }
}

