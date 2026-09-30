import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
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
    const { phoneNo } = await req.json();
    if (!phoneNo) {
      return NextResponse.json(
        { success: false, message: "Phone number is required" },
        { status: 400 }
      );
    }
    const query = await Query.find({ phoneNo }).lean<
      Array<{ typeOfProperty?: string; location?: string }>
    >();
    const role = String((token as { role?: string }).role || "");
    if (isPropertyTypeRuleBypassRole(role) || query.length === 0) {
      return NextResponse.json({ success: true, data: query }, { status: 200 });
    }

    const employeeId = String((token as { id?: string }).id || "");
    const employeeContext = await loadEmployeeLeadContext(
      employeeId,
      (token as { rentalType?: unknown }).rentalType,
    );
    const allowedLeads = query.filter((lead) => {
      const allowed = resolveGuestTypeAllowList({
        ownerRules: employeeContext.ownerPropertyTypeVisibilityRules,
        propertyVisibilityRules: employeeContext.propertyVisibilityRules,
        location: lead.location,
      });
      return guestTypeIsAllowed(lead.typeOfProperty, allowed);
    });
    if (allowedLeads.length === 0) {
      return NextResponse.json(
        { success: false, message: "This guest is outside your property type rule" },
        { status: 403 },
      );
    }
    return NextResponse.json({ success: true, data: allowedLeads }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error(err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
