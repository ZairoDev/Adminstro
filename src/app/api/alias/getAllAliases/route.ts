import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import Aliases from "@/models/alias";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { OrganizationZod } from "@/util/organizationConstants";

const QuerySchema = z.object({
  /** Invalid values become undefined so GET never 400s; server still enforces org by role. */
  organization: z
    .string()
    .optional()
    .transform((v) => {
      if (v == null || v === "") return undefined;
      const parsed = OrganizationZod.safeParse(v);
      return parsed.success ? parsed.data : undefined;
    }),
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

    const rawParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    if (rawParams.organization === "") delete rawParams.organization;

    const parsedQuery = QuerySchema.safeParse(rawParams);

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: "Invalid query params" },
        { status: 400 },
      );
    }

    const userRole = String(token.role ?? "").trim();
    const roleNorm = userRole.toLowerCase();
    const employeeId = token.id;
    const requestedOrg = parsedQuery.data.organization;
    const includeInactive = parsedQuery.data.includeInactive;

    let finalOrg: string | null = null;

    // 🔒 Role-based org resolution
    // HAdmin is always Holidaysera for offers/aliases (UI locks org there). Do not use
    // employee.organization — legacy rows may still be VacationSaga default, which
    // incorrectly blocked `?organization=Holidaysera` and returned no aliases.
    if (roleNorm === "hadmin") {
      // Always Holidaysera for HAdmin; ignore client `organization` so stale/wrong param never returns [].
      finalOrg = "Holidaysera";
    } else if (roleNorm === "hsale") {
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
    else if (roleNorm === "superadmin") {
      finalOrg = requestedOrg ?? null;
    }

    // Admin → requested org, else employee DB org (avoid unscoped query when param missing)
    else if (roleNorm === "admin") {
      if (requestedOrg) {
        finalOrg = requestedOrg;
      } else if (employeeId) {
        const emp = await Employees.findById(employeeId).select("organization").lean();
        const eo = emp ? String((emp as { organization?: string }).organization ?? "") : "";
        finalOrg = OrganizationZod.safeParse(eo).success ? eo : null;
      } else {
        finalOrg = null;
      }
    }

    // fallback (other roles)
    else {
      finalOrg = requestedOrg ?? null;
    }

    // 🧱 Build query
    const query: Record<string, unknown> = {};

    if (!includeInactive) {
      query.status = { $regex: "^Active$", $options: "i" };
    }

    if (finalOrg) {
      query.organization = {
        $regex: `^${finalOrg}$`,
        $options: "i",
      };
    }

    const aliases = await Aliases.find(query).sort({ updatedAt: -1 }).lean();

    return NextResponse.json({ aliases }, { status: 200 });
  } catch (err) {
    console.error("Alias API Error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
