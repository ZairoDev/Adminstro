import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      message:
        "Use /api/holidaysera/properties/approve or /api/holidaysera/properties/approve-all",
    },
    { status: 200 }
  );
}
