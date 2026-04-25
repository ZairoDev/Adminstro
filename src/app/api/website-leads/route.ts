import { NextRequest, NextResponse } from "next/server";
import WebsiteLeads from "@/models/websiteLeads";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = request.nextUrl;
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "firstName";

    let query: Record<string, any> = {};

    if (searchTerm) {
      const regex = new RegExp(searchTerm, "i");
      if (searchType === "name") {
        query.$or = [
          { firstName: regex },
          { lastName: regex },
        ];
      } else {
        query[searchType] = regex;
      }
    }

    const leads = await WebsiteLeads.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalLeads = await WebsiteLeads.countDocuments(query);
    const totalPages = Math.ceil(totalLeads / limit);

    return NextResponse.json({
      data: leads,
      page,
      totalPages,
      totalLeads,
    });
  } catch (error: any) {
    console.error("Error fetching website leads:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch website leads",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const token = await getDataFromToken(request);
    if (!token || token.role !== "SuperAdmin") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body as { action?: string };

    if (action === "bulkNote") {
      const {
        note,
        searchTerm = "",
        searchType = "firstName",
      } = body as {
        note?: string;
        searchTerm?: string;
        searchType?: string;
      };

      if (!note || !note.trim()) {
        return NextResponse.json(
          { message: "Note is required" },
          { status: 400 }
        );
      }

      const query: Record<string, unknown> = {};
      if (searchTerm) {
        const regex = new RegExp(searchTerm, "i");
        if (searchType === "name") {
          query.$or = [{ firstName: regex }, { lastName: regex }];
        } else {
          query[searchType] = regex;
        }
      }

      const result = await WebsiteLeads.updateMany(query, {
        $set: { note: note.trim() },
      });

      return NextResponse.json({
        message: "Note applied successfully",
        modifiedCount: result.modifiedCount ?? 0,
      });
    }

    if (action === "updateLead") {
      const { leadId, telephone, email } = body as {
        leadId?: string;
        telephone?: string;
        email?: string;
      };

      if (!leadId) {
        return NextResponse.json(
          { message: "leadId is required" },
          { status: 400 }
        );
      }

      const updates: Record<string, string> = {};
      if (typeof telephone === "string") updates.telephone = telephone.trim();
      if (typeof email === "string") updates.email = email.trim();

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { message: "No fields to update" },
          { status: 400 }
        );
      }

      const updated = await WebsiteLeads.findByIdAndUpdate(
        leadId,
        { $set: updates },
        { new: true }
      ).lean();

      if (!updated) {
        return NextResponse.json(
          { message: "Lead not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: "Lead updated", data: updated });
    }

    return NextResponse.json(
      { message: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error updating website leads:", error);
    return NextResponse.json(
      {
        message: "Failed to update website leads",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

