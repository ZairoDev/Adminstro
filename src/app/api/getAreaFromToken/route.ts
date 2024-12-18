import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getDataFromToken(req);
  return NextResponse.json({ area: token.allotedArea });
}
