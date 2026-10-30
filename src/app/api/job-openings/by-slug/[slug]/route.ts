import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Department from "@/models/department";
import JobPosition from "@/models/jobPosition";
import JobOpening from "@/models/jobOpening";
import { serializeJobOpening } from "@/lib/careers/serializeJobOpening";

export const dynamic = "force-dynamic";

/** GET /api/job-openings/by-slug/[slug] — published job for the public career page */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await connectDb();
    const { slug } = await params;
    const opening = await JobOpening.findOne({
      slug: String(slug || "").trim(),
      isPublished: true,
    }).lean();

    if (!opening) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    const [department, position] = await Promise.all([
      Department.findById(opening.departmentId).select("name").lean(),
      JobPosition.findById(opening.jobPositionId).select("name").lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: serializeJobOpening(opening, {
        departmentName: department?.name || "",
        positionName: position?.name || "",
      }),
    });
  } catch (error) {
    console.error("[job-openings] public get failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch job" },
      { status: 500 },
    );
  }
}
