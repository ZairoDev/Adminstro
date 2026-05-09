import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";
import { EmployeeMonthlyTarget } from "@/models/employeeMonthlyTarget";
import { normalizeCityKey, toDisplayCity } from "@/lib/city-normalizer";
import { z } from "zod";

connectDb();

const ALLOWED_ROLES = ["SuperAdmin", "Sales-TeamLead", "LeadGen-TeamLead"];

const SALES_ROLES = ["Sales", "hSale", "Sales-TeamLead", "Subscription-Sales"];
const LEAD_ROLES = ["LeadGen", "LeadGen-TeamLead"];

// Fields each role is permitted to set on an employee target
const EDITABLE_BY_ROLE: Record<string, Array<"leads" | "visits" | "sales">> = {
  SuperAdmin: ["leads", "visits", "sales"],
  "LeadGen-TeamLead": ["leads"],
  "Sales-TeamLead": ["leads", "visits", "sales"],
};

const schema = z.object({
  employeeId: z.string().min(1),
  city: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  leads: z.number().int().min(0).default(0),
  visits: z.number().int().min(0).default(0),
  sales: z.number().int().min(0).default(0),
});

export async function POST(req: NextRequest) {
  try {
    const tokenData = await getDataFromToken(req);
    const role = tokenData.role as string;

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse({
      ...body,
      month: Number(body.month),
      year: Number(body.year),
      leads: Number(body.leads ?? 0),
      visits: Number(body.visits ?? 0),
      sales: Number(body.sales ?? 0),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { employeeId, city: rawCity, month, year, leads, visits, sales } = parsed.data;

    // Verify employee exists and is active
    const employee = await Employees.findOne(
      { _id: employeeId, isActive: { $ne: false } },
      { name: 1, role: 1 }
    ).lean<{ name: string; role: string }>();

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found or inactive" },
        { status: 404 }
      );
    }

    const empRole = employee.role;
    const editableFields = EDITABLE_BY_ROLE[role] ?? [];

    // Enforce: Sales employees can only receive visits/sales targets;
    // LeadGen employees can only receive leads targets
    const isSalesEmp = SALES_ROLES.includes(empRole);
    const isLeadGenEmp = LEAD_ROLES.includes(empRole);

    if (!isSalesEmp && !isLeadGenEmp) {
      return NextResponse.json(
        { error: "Employee role is not eligible for monthly targets" },
        { status: 422 }
      );
    }

    const city = toDisplayCity(rawCity);
    const cityKey = normalizeCityKey(city);

    // Build the update payload respecting role field restrictions
    const existing = await EmployeeMonthlyTarget.findOne({
      employeeId,
      cityKey,
      month,
      year,
    }).lean<{ leads: number; visits: number; sales: number }>();

    const next = {
      leads: existing?.leads ?? 0,
      visits: existing?.visits ?? 0,
      sales: existing?.sales ?? 0,
    };

    // Only update the fields the caller is allowed to set, and only for appropriate employee type
    if (editableFields.includes("leads") && isLeadGenEmp) next.leads = leads;
    if (editableFields.includes("visits") && isSalesEmp) next.visits = visits;
    if (editableFields.includes("sales") && isSalesEmp) next.sales = sales;

    const result = await EmployeeMonthlyTarget.findOneAndUpdate(
      { employeeId, cityKey, month, year },
      {
        $set: {
          employeeName: employee.name as string,
          employeeRole: empRole,
          city,
          cityKey,
          leads: next.leads,
          visits: next.visits,
          sales: next.sales,
          createdBy: tokenData.id,
        },
        $setOnInsert: { employeeId, month, year },
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, target: result });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; code2?: number };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status }
      );
    }
    if (
      error?.code === "11000" ||
      (err as { code?: number })?.code === 11000
    ) {
      return NextResponse.json(
        { error: "Target for this employee/city/month already exists" },
        { status: 409 }
      );
    }
    console.error("Error in POST /api/monthly-target/employee:", err);
    return NextResponse.json({ error: "Unable to save employee target" }, { status: 500 });
  }
}
