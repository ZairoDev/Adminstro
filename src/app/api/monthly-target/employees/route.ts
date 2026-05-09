import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";
import { EmployeeMonthlyTarget } from "@/models/employeeMonthlyTarget";

connectDb();

const ALLOWED_ROLES = ["SuperAdmin", "Sales-TeamLead", "LeadGen-TeamLead"];

// Roles considered "Sales" department
const SALES_ROLES = ["Sales", "hSale", "Sales-TeamLead", "Subscription-Sales"];
// Roles considered "LeadGen" department
const LEAD_ROLES = ["LeadGen", "LeadGen-TeamLead"];

export interface EmployeeTargetRecord {
  employeeId: string;
  name: string;
  role: string;
  leads: number;
  visits: number;
  sales: number;
  hasSavedTarget: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const tokenData = await getDataFromToken(req);
    const role = tokenData.role as string;

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const cityKey = searchParams.get("cityKey");
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    if (!cityKey || !month || !year) {
      return NextResponse.json(
        { error: "cityKey, month and year are required" },
        { status: 400 }
      );
    }

    // Determine which employee pools to return based on the caller's role
    const showSales = role === "SuperAdmin" || role === "Sales-TeamLead";
    const showLeadGen = role === "SuperAdmin" || role === "LeadGen-TeamLead";

    type EmpLean = { _id: unknown; name: string; role: string };
    type SavedLean = { employeeId: unknown; leads: number; visits: number; sales: number };

    const [salesEmployees, leadGenEmployees, existingTargets] = await Promise.all([
      showSales
        ? Employees.find(
            { role: { $in: SALES_ROLES }, isActive: { $ne: false } },
            { name: 1, role: 1 }
          )
            .sort({ name: 1 })
            .lean<EmpLean[]>()
        : Promise.resolve([] as EmpLean[]),

      showLeadGen
        ? Employees.find(
            { role: { $in: LEAD_ROLES }, isActive: { $ne: false } },
            { name: 1, role: 1 }
          )
            .sort({ name: 1 })
            .lean<EmpLean[]>()
        : Promise.resolve([] as EmpLean[]),

      EmployeeMonthlyTarget.find({ cityKey, month, year }).lean<SavedLean[]>(),
    ]);

    // Build a quick lookup of saved targets keyed by employeeId string
    const savedByEmp = new Map(
      existingTargets.map((t) => [(t.employeeId as { toString(): string }).toString(), t])
    );

    const toRecord = (emp: { _id: unknown; name: string; role: string }): EmployeeTargetRecord => {
      const empId = (emp._id as { toString: () => string }).toString();
      const saved = savedByEmp.get(empId);
      return {
        employeeId: empId,
        name: emp.name,
        role: emp.role,
        leads: saved?.leads ?? 0,
        visits: saved?.visits ?? 0,
        sales: saved?.sales ?? 0,
        hasSavedTarget: Boolean(saved),
      };
    };

    return NextResponse.json({
      salesEmployees: salesEmployees.map(toRecord),
      leadGenEmployees: leadGenEmployees.map(toRecord),
    });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status }
      );
    }
    console.error("Error in GET /api/monthly-target/employees:", err);
    return NextResponse.json({ error: "Unable to fetch employees" }, { status: 500 });
  }
}
