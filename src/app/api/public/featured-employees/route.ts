import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { ORGANIZATIONS } from "@/util/organizationConstants";
import { excludeTestAccountFromQuery } from "@/util/employeeConstants";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type FeaturedEmployeeRow = {
  name?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  description?: string | null;
  profilePic?: string | null;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

/** Preflight for the company site. */
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/public/featured-employees
 * Public list of active featured employees for the company website.
 * Optional ?organization=VacationSaga|Holidaysera|HousingSaga
 */
export async function GET(request: NextRequest) {
  try {
    const organization = request.nextUrl.searchParams.get("organization")?.trim() ?? "";
    if (
      organization &&
      !(ORGANIZATIONS as readonly string[]).includes(organization)
    ) {
      return json(
        { success: false, error: "Unknown organization" },
        400,
      );
    }

    await connectDb();

    const employees = await Employees.find(
      excludeTestAccountFromQuery({
        isActive: true,
        isfeatured: true,
        ...(organization ? { organization } : {}),
      }),
    )
      .select("name jobTitle department description profilePic")
      .sort({ name: 1 })
      .lean<FeaturedEmployeeRow[]>();

    const data = employees
      .map((employee) => ({
        name: employee.name?.trim() ?? "",
        position: employee.jobTitle?.trim() ?? "",
        department: employee.department?.trim() ?? "",
        description: employee.description?.trim() ?? "",
        photoUrl: employee.profilePic?.trim() ?? "",
      }))
      .filter(
        (employee) =>
          employee.name &&
          employee.position &&
          employee.department &&
          employee.description,
      );

    return json({ success: true, data });
  } catch (error) {
    console.error("[featured-employees] public list failed:", error);
    return json(
      { success: false, error: "Failed to fetch featured employees" },
      500,
    );
  }
}
