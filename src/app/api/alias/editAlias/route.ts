import { NextRequest, NextResponse } from "next/server";

import Aliases from "@/models/alias";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function PATCH(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { aliasEmail, body } = await req.json();

    const alias = await Aliases.findOneAndUpdate({ aliasEmail: aliasEmail }, body);

    return NextResponse.json({ alias }, { status: 201 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.log("error in editing alias: ", err);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
