import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { connectDb } from "@/util/db";
import Department from "@/models/department";
import JobPosition from "@/models/jobPosition";
import JobOpening from "@/models/jobOpening";
import { requireDepartmentManager } from "@/lib/departments/auth";
import { JobIdentityError, resolveJobIdentity } from "@/lib/departments/jobIdentity";
import { slugifyJobTitle } from "@/lib/careers/slug";
import { serializeJobOpening, type JobOpeningView } from "@/lib/careers/serializeJobOpening";
import { resolveJobExperience } from "@/lib/careers/experience";
import type { JobEmploymentType, JobWorkMode } from "@/lib/careers/jobTypes";
import { createJobOpeningSchema } from "@/schemas/jobOpening.schema";

export const dynamic = "force-dynamic";

function zodMessage(error: ZodError): string {
  return error.issues[0]?.message || "Invalid request";
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugifyJobTitle(title);
  let slug = base;
  let attempt = 1;
  while (await JobOpening.exists({ slug })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

async function withNames(
  openings: Array<{
    _id: unknown;
    title: string;
    slug: string;
    departmentId: unknown;
    jobPositionId: unknown;
    summary: string;
    description: string;
    responsibilities?: string;
    requirements?: string;
    location?: string;
    employmentType?: JobEmploymentType | null;
    workMode?: JobWorkMode | null;
    experienceLevel?: "fresher" | "range" | null;
    experienceMin?: number | null;
    experienceMax?: number | null;
    isPublished: boolean;
  }>,
): Promise<JobOpeningView[]> {
  const departmentIds = [...new Set(openings.map((opening) => String(opening.departmentId)))];
  const positionIds = [...new Set(openings.map((opening) => String(opening.jobPositionId)))];
  const [departments, positions] = await Promise.all([
    Department.find({ _id: { $in: departmentIds } }).select("name").lean(),
    JobPosition.find({ _id: { $in: positionIds } }).select("name").lean(),
  ]);
  const departmentNames = new Map(departments.map((row) => [String(row._id), row.name]));
  const positionNames = new Map(positions.map((row) => [String(row._id), row.name]));
  return openings.map((opening) =>
    serializeJobOpening(opening, {
      departmentName: departmentNames.get(String(opening.departmentId)) || "",
      positionName: positionNames.get(String(opening.jobPositionId)) || "",
    }),
  );
}

/** GET /api/job-openings?published=1 is public. Otherwise HR manages the full list. */
export async function GET(request: NextRequest) {
  try {
    await connectDb();
    const publishedOnly = request.nextUrl.searchParams.get("published") === "1";
    if (!publishedOnly) {
      const auth = await requireDepartmentManager(request);
      if (!auth.ok) return auth.response;
    }

    const openings = await JobOpening.find(publishedOnly ? { isPublished: true } : {})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: await withNames(openings) });
  } catch (error) {
    console.error("[job-openings] GET failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch jobs" },
      { status: 500 },
    );
  }
}

/** POST /api/job-openings — create a job posting */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireDepartmentManager(request);
    if (!auth.ok) return auth.response;

    await connectDb();
    const parsed = createJobOpeningSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodMessage(parsed.error) },
        { status: 400 },
      );
    }

    let identity;
    try {
      identity = await resolveJobIdentity(
        parsed.data.departmentId,
        parsed.data.jobPositionId,
      );
    } catch (error) {
      if (error instanceof JobIdentityError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.status },
        );
      }
      throw error;
    }
    if (!identity) {
      return NextResponse.json(
        { success: false, error: "Select a department and a job position" },
        { status: 400 },
      );
    }

    const experience = resolveJobExperience({
      employmentType: parsed.data.employmentType ?? null,
      experienceLevel: parsed.data.experienceLevel ?? null,
      experienceMin: parsed.data.experienceMin ?? null,
      experienceMax: parsed.data.experienceMax ?? null,
    });
    if (!experience.ok) {
      return NextResponse.json({ success: false, error: experience.error }, { status: 400 });
    }

    const opening = await JobOpening.create({
      title: parsed.data.title,
      slug: await uniqueSlug(parsed.data.title),
      departmentId: identity.departmentId,
      jobPositionId: identity.jobPositionId,
      summary: parsed.data.summary,
      description: parsed.data.description,
      responsibilities: parsed.data.responsibilities,
      requirements: parsed.data.requirements,
      location: parsed.data.location,
      employmentType: parsed.data.employmentType ?? null,
      workMode: parsed.data.workMode ?? null,
      experienceLevel: experience.value.experienceLevel,
      experienceMin: experience.value.experienceMin,
      experienceMax: experience.value.experienceMax,
      isPublished: parsed.data.isPublished,
    });

    const [view] = await withNames([opening.toObject()]);
    return NextResponse.json({ success: true, data: view }, { status: 201 });
  } catch (error) {
    console.error("[job-openings] POST failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create job" },
      { status: 500 },
    );
  }
}
