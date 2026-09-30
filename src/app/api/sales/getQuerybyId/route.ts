import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import {
  canViewLeadDocuments,
  normalizeLeadDocuments,
} from "@/util/leadDocuments";
import { loadEmployeeLeadContext } from "@/lib/leads/employeeLeadContext";
import {
  guestTypeIsAllowed,
  isPropertyTypeRuleBypassRole,
  resolveGuestTypeAllowList,
} from "@/util/propertyTypeAllowList";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }
    const query = await Query.findById(id);
    if (!query) {
      return NextResponse.json(
        { success: false, message: "Query not found" },
        { status: 404 }
      );
    }

    const data = query.toObject() as {
      typeOfProperty?: string;
      location?: string;
      leadDocuments?: unknown;
      createdBy?: string;
    };
    const role = (token as { role?: string }).role;

    if (role === "HCollaborator") {
      const email = String((token as { email?: string }).email || "")
        .trim()
        .toLowerCase();
      const owner = String(data.createdBy || "").trim().toLowerCase();
      if (!email || owner !== email) {
        return NextResponse.json(
          { success: false, message: "You can only view leads you created" },
          { status: 403 },
        );
      }
    }

    if (!isPropertyTypeRuleBypassRole(role)) {
      const employeeId = String((token as { id?: string }).id || "");
      const employeeContext = await loadEmployeeLeadContext(
        employeeId,
        (token as { rentalType?: unknown }).rentalType,
      );
      const allowed = resolveGuestTypeAllowList({
        ownerRules: employeeContext.ownerPropertyTypeVisibilityRules,
        propertyVisibilityRules: employeeContext.propertyVisibilityRules,
        location: data.location,
      });
      if (!guestTypeIsAllowed(data.typeOfProperty, allowed)) {
        return NextResponse.json(
          { success: false, message: "This guest is outside your property type rule" },
          { status: 403 },
        );
      }
    }

    if (!canViewLeadDocuments(role)) {
      delete data.leadDocuments;
    } else {
      const docs = normalizeLeadDocuments(data.leadDocuments);
      data.leadDocuments = docs ?? {};
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
