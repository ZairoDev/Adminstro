import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import RetargetContact from "@/models/retargetContact";

connectDb();

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["SuperAdmin", "Sales", "Advert"];
    if (!allowedRoles.includes(token.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country") || "";
    const batchId = searchParams.get("batchId") || "";
    const activeOnly = searchParams.get("activeOnly") !== "false"; // default true

    const query: any = {};

    if (country) {
      query.country = { $regex: country, $options: "i" };
    }
    if (batchId) {
      query.batchId = batchId;
    }
    if (activeOnly) {
      query.isActive = true;
    }

    const contacts = await RetargetContact.find(query)
      .sort({ uploadedAt: -1 })
      .limit(10000)
      .lean();

    // Get distinct batches for the filter dropdown
    const batches = await RetargetContact.aggregate([
      ...(activeOnly ? [{ $match: { isActive: true } }] : []),
      {
        $group: {
          _id: "$batchId",
          sourceFileName: { $first: "$sourceFileName" },
          uploadedBy: { $first: "$uploadedBy" },
          uploadedAt: { $first: "$uploadedAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { uploadedAt: -1 } },
    ]);

    // Get distinct countries for filter dropdown
    const countries = await RetargetContact.distinct("country", activeOnly ? { isActive: true } : {});

    return NextResponse.json({
      success: true,
      contacts: contacts.map((c: any) => ({
        id: String(c._id),
        name: c.name,
        phone: c.phoneNumber,
        country: c.country,
        countryCode: c.countryCode,
        batchId: c.batchId,
        sourceFileName: c.sourceFileName,
        uploadedBy: c.uploadedBy,
        uploadedAt: c.uploadedAt,
        isActive: c.isActive,
      })),
      batches: batches.map((b: any) => ({
        batchId: b._id,
        sourceFileName: b.sourceFileName,
        uploadedBy: b.uploadedBy,
        uploadedAt: b.uploadedAt,
        count: b.count,
      })),
      countries,
      total: contacts.length,
    });
  } catch (error: any) {
    console.error("Fetch uploaded contacts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}
