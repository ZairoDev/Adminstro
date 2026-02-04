import { NextRequest, NextResponse } from "next/server";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { applyLocationFilter, isLocationExempt } from "@/util/apiSecurity";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role: string = (token.role || "") as string;
    const assignedArea: string | string[] | undefined = token.allotedArea
      ? Array.isArray(token.allotedArea)
        ? token.allotedArea
        : typeof token.allotedArea === "string"
        ? token.allotedArea
        : undefined
      : undefined;

    const { filters } = await req.json();
    const baseQuery: Record<string, any> = {};

    if (filters?.searchType && filters?.searchValue) {
      const escaped = filters.searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      baseQuery[filters.searchType] = new RegExp(escaped, "i");
    }
    if (filters?.propertyType) baseQuery.propertyType = filters.propertyType;
    if (filters?.isImportant) baseQuery.isImportant = "Important";
    if (filters?.isPinned) baseQuery.isPinned = "Pinned";

    const locations = filters?.place?.flat().filter((loc: any) => typeof loc === "string") || [];

    if (locations.length > 0) {
      if (!isLocationExempt(role)) {
        const userAreas = Array.isArray(assignedArea)
          ? assignedArea.map((a: string) => a.toLowerCase())
          : assignedArea
          ? [String(assignedArea).toLowerCase()]
          : [];
        const valid = locations.filter((loc: string) => userAreas.includes(loc.toLowerCase()));
        if (valid.length > 0) {
          baseQuery.$or = valid.map((loc: string) => ({ location: { $regex: new RegExp(`^${loc}$`, "i") } }));
        } else {
          return NextResponse.json({ availableCount: 0, notAvailableCount: 0 });
        }
      } else {
        baseQuery.$or = locations.map((loc: string) => ({ location: { $regex: new RegExp(`^${loc}$`, "i") } }));
      }
    } else if (!isLocationExempt(role)) {
      applyLocationFilter(baseQuery, role, assignedArea, undefined);
    }

    const [availableCount, notAvailableCount] = await Promise.all([
      unregisteredOwner.countDocuments({ ...baseQuery, availability: "Available" }),
      unregisteredOwner.countDocuments({ ...baseQuery, availability: "Not Available" }),
    ]);

    return NextResponse.json({ availableCount, notAvailableCount });
  } catch (error) {
    console.error("getCounts error:", error);
    return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
  }
}
