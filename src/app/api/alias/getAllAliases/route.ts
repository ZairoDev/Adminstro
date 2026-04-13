import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import Aliases from "@/models/alias";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { OrganizationZod } from "@/util/organizationConstants";

const QuerySchema = z.object({
  organization: OrganizationZod.optional(),
  includeInactive: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

type TokenPayload = {
  id?: string;
  role?: string;
};

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const token = (await getDataFromToken(req)) as TokenPayload;

    const parsedQuery = QuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: "Invalid query params" },
        { status: 400 },
      );
    }

    const userRole = String(token.role ?? "").trim();
    const employeeId = token.id;
    const requestedOrg = parsedQuery.data.organization;
    const includeInactive = parsedQuery.data.includeInactive;

    let finalOrg: string | null = null;

    // 🔒 Role-based org resolution
    if (userRole === "HAdmin" || userRole === "hSale") {
      if (!employeeId) {
        return NextResponse.json({ aliases: [] }, { status: 200 });
      }

      const emp = await Employees.findById(employeeId)
        .select("organization")
        .lean();

      const employeeOrg = emp
        ? String((emp as { organization?: string }).organization ?? "")
        : "";

      if (!employeeOrg) {
        return NextResponse.json({ aliases: [] }, { status: 200 });
      }

      // ❌ Prevent cross-org access
      if (requestedOrg && requestedOrg !== employeeOrg) {
        return NextResponse.json({ aliases: [] }, { status: 200 });
      }

      finalOrg = employeeOrg;
    }

    // 🧠 SuperAdmin → can use requested org freely
    else if (userRole === "SuperAdmin") {
      finalOrg = requestedOrg ?? null;
    }

    // fallback (unknown roles)
    else {
      finalOrg = requestedOrg ?? null;
    }

    // 🧱 Build query
    const query: Record<string, any> = {};

    if (!includeInactive) {
      query.status = { $regex: "^Active$", $options: "i" };
    }

    if (finalOrg) {
      query.organization = {
        $regex: `^${finalOrg}$`,
        $options: "i",
      };
    }

    console.log("---- ALIAS FETCH DEBUG ----");
    console.log({
      userRole,
      employeeId,
      requestedOrg,
      finalOrg,
      includeInactive,
      query,
    });

    const aliases = await Aliases.find(query).sort({ updatedAt: -1 }).lean();

    console.log("Aliases found:", aliases.length);

    return NextResponse.json({ aliases }, { status: 200 });
  } catch (err) {
    console.error("Alias API Error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
