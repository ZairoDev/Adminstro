import { connectDb } from "@/util/db";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function GET(request: NextRequest) {
  try {
    const payload = await getDataFromToken(request);
    if (payload?.role !== "SuperAdmin") {
      return NextResponse.json(
        { error: "Forbidden - SuperAdmin access required" },
        { status: 403 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const employeeId = searchParams.get("employeeId");
    const employeeEmail = searchParams.get("employeeEmail");
    const activityType = searchParams.get("activityType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const role = searchParams.get("role");

    // Build filter object
    const filter: any = {};

    if (employeeId) filter.employeeId = employeeId;
    if (employeeEmail) filter.employeeEmail = new RegExp(employeeEmail, "i");
    if (activityType && ["login", "logout"].includes(activityType)) {
      filter.activityType = activityType;
    }
    if (role) filter.role = role;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Fetch logs with filters
    const logs = await EmployeeActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    // ensure sessionId and status fields are present in response (backwards-compatible)
    const normalizedLogs = logs.map((l: any) => ({
      ...l,
      sessionId: l.sessionId || null,
      status: l.status || null,
      lastActivityAt: l.lastActivityAt || null,
    }));

    // Get total count for pagination
    const totalLogs = await EmployeeActivityLog.countDocuments(filter);

    // Get activity statistics
    const stats = await EmployeeActivityLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$activityType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get unique employees from logs
    const uniqueEmployees = await EmployeeActivityLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$employeeId",
          name: { $first: "$employeeName" },
          email: { $first: "$employeeEmail" },
          totalActivities: { $sum: 1 },
        },
      },
      { $sort: { totalActivities: -1 } },
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          logs: normalizedLogs,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalLogs / limit),
            totalLogs,
            logsPerPage: limit,
          },
          statistics: {
            stats,
            uniqueEmployees,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs", success: false },
      { status: 500 }
    );
  }
}
