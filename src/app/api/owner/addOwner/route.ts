import { Owners } from "@/models/owner";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    let token: any;
    try {
      token = await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    const body = await req.json();
    const newBody = {
      ...body,
      createdBy: token.email,
      // Auto-tag origin when created by HAdmin
      ...(token.role === "HAdmin" ? { origin: "holidaysera" } : {}),
    };

    await Owners.create(newBody);

    return NextResponse.json(
      { message: "Owner added successfully" },
      { status: 201 }
    );
  } catch (err: any) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
