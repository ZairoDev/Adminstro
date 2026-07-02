import { Properties } from "@/models/property";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

connectDb();

const PROPERTY_EDIT_ROLES = new Set([
  "SuperAdmin",
  "Advert",
  "Admin",
  "Developer",
  "HAdmin",
]);

interface UpdatedData {
  lastUpdatedBy?: string[];
  [key: string]: unknown;
}
interface RequestBody {
  propertyId: string | string[];
  updatedData: UpdatedData;
  userEmail: string;
}

function resolvePropertyId(id: string | string[] | undefined): string {
  if (!id) return "";
  return Array.isArray(id) ? String(id[0] ?? "") : String(id);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const host = request.headers.get("host");
  try {
    let auth: { role?: string; email?: string };
    try {
      auth = (await getDataFromToken(request)) as {
        role?: string;
        email?: string;
      };
    } catch (err: unknown) {
      const authErr = err as { status?: number; code?: string };
      const status = authErr?.status ?? 401;
      const code = authErr?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    const role = String(auth.role ?? "").trim();
    if (!PROPERTY_EDIT_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reqBody: RequestBody = await request.json();
    const propertyId = resolvePropertyId(reqBody.propertyId);
    const { updatedData } = reqBody;
    const userEmail =
      String(reqBody.userEmail ?? "").trim() ||
      String(auth.email ?? "").trim();
    let { lastUpdatedBy } = updatedData;

    if (lastUpdatedBy) {
      lastUpdatedBy.push(userEmail);
      updatedData.lastUpdatedBy = lastUpdatedBy;
    } else if (userEmail) {
      updatedData.lastUpdatedBy = [userEmail];
    }

    delete updatedData.VSID;

    if (!propertyId || !updatedData) {
      return new NextResponse(
        JSON.stringify({
          error: "Property ID, updated data, and user ID are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const property = await Properties.findOneAndUpdate(
      { _id: propertyId },
      { $set: updatedData },
      { new: true }
    );

    if (!property) {
      return new NextResponse(
        JSON.stringify({ message: "Property not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new NextResponse(JSON.stringify({ property }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
