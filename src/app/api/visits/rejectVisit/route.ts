import Visits from "@/models/visit";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    // Authenticate request
    let auth: any;
    try {
      auth = await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    const { id, rejectionReason, status } = await req.json();


    if (!id || !rejectionReason || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDb();

    const visit = await Visits.findByIdAndUpdate(
      id,
      { visitStatus: status, rejectionReason },
      { new: true }
    );

    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, {
        status: 404,
      });
    }

    return NextResponse.json({ success: true, data: visit }, {
      status: 200,
    });
  } catch (error) {
    console.error("Error updating visit:", error);
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
    });
  }
}
