import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { excludeTestAccountFromQuery, excludeTestAccountFromCount } from "@/util/employeeConstants";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function POST(request: NextRequest) {
  try {
    await getDataFromToken(request);
    const filters = await request.json();
    const filtersWithExclusion = excludeTestAccountFromQuery(filters);
    const tempActiveEmployees = await Employees.find(filtersWithExclusion).lean();


    const current = new Date();
    const day = current.getDay();

    // const diffToMonday = day === 0 ? -6 : 1 - day;
    // const startOfWeek = new Date(current.setDate(current.getDate() + diffToMonday));
    const startOfMonth = new Date(current.setDate(1));
    // startOfWeek.setHours(0, 0, 0, 0);
    startOfMonth.setHours(0, 0, 0, 0);

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    fourDaysAgo.setHours(0, 0, 0, 0);

    // const endOfWeek = new Date(startOfWeek);
    // endOfWeek.setDate(startOfWeek.getDate() + 7?);
    // endOfWeek.setMilliseconds(-1);
    const endDate = new Date();

    const activeEmployees: any[] = [];
    for (let i = 0; i < tempActiveEmployees.length; i++) {
      const employee = tempActiveEmployees[i];
      const leadCount = await Query.countDocuments({
        createdBy: employee.email,
        createdAt: { $gte: startOfMonth, $lt: endDate },
      });
      const hasRecentLeads = await Query.exists({
        createdBy: employee.email,
        createdAt: {$gte: fourDaysAgo, $lte:endDate},
      })
      if(leadCount >0 && hasRecentLeads)
      activeEmployees.push({ ...employee, leads: leadCount });
    }

    const totalEmployee: number = await Employees.countDocuments(excludeTestAccountFromCount({ isActive: true }));

    return NextResponse.json({ activeEmployees, totalEmployee });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.error("Error fetching Employee:", error);
    return NextResponse.json(
      { message: "Failed to fetch Employees" },
      { status: 500 }
    );
  }
}
