import Query from "@/models/query";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { loadEmployeeLeadContext } from "@/lib/leads/employeeLeadContext";
import {
  guestTypeIsAllowed,
  isPropertyTypeRuleBypassRole,
  resolveGuestTypeAllowList,
} from "@/util/propertyTypeAllowList";

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const { phoneNo } = await req.json();

    if (!phoneNo) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 },
      );
    }

    const lead = await Query.findOne({ phoneNo: { $regex: phoneNo, $options: "i" } }).lean<{
      typeOfProperty?: string;
      location?: string;
    } | null>();

    if (!lead) {
      return NextResponse.json(lead);
    }

    const role = String((token as { role?: string }).role || "");
    if (!isPropertyTypeRuleBypassRole(role)) {
      const employeeId = String((token as { id?: string }).id || "");
      const employeeContext = await loadEmployeeLeadContext(
        employeeId,
        (token as { rentalType?: unknown }).rentalType,
      );
      const allowed = resolveGuestTypeAllowList({
        ownerRules: employeeContext.ownerPropertyTypeVisibilityRules,
        propertyVisibilityRules: employeeContext.propertyVisibilityRules,
        location: lead.location,
      });
      if (!guestTypeIsAllowed(lead.typeOfProperty, allowed)) {
        return NextResponse.json(
          { error: "This guest is outside your property type rule" },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(lead);
  } catch (err) {
    const error = err as { status?: number; code?: string };
    if (error?.status === 401 || error?.code) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status || 401 },
      );
    }
    console.log(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
