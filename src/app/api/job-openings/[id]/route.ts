import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import JobOpening from "@/models/jobOpening";
import Department from "@/models/department";
import JobPosition from "@/models/jobPosition";
import { requireDepartmentManager } from "@/lib/departments/auth";
import { JobIdentityError, resolveJobIdentity } from "@/lib/departments/jobIdentity";
import { serializeJobOpening } from "@/lib/careers/serializeJobOpening";
import { resolveJobExperience } from "@/lib/careers/experience";
import { updateJobOpeningSchema } from "@/schemas/jobOpening.schema";

export const dynamic = "force-dynamic";

function zodMessage(error: ZodError): string {
  return error.issues[0]?.message || "Invalid request";
}

/** PATCH /api/job-openings/[id] */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireDepartmentManager(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Job id is invalid" },
        { status: 400 },
      );
    }

    await connectDb();
    const parsed = updateJobOpeningSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodMessage(parsed.error) },
        { status: 400 },
      );
    }

    const current = await JobOpening.findById(id);
    if (!current) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    const nextDepartmentId = parsed.data.departmentId ?? String(current.departmentId);
    const nextPositionId = parsed.data.jobPositionId ?? String(current.jobPositionId);
    if (parsed.data.departmentId || parsed.data.jobPositionId) {
      try {
        const identity = await resolveJobIdentity(nextDepartmentId, nextPositionId);
        if (!identity) {
          return NextResponse.json(
            { success: false, error: "Select a department and a job position" },
            { status: 400 },
          );
        }
        current.departmentId = identity.departmentId;
        current.jobPositionId = identity.jobPositionId;
      } catch (error) {
        if (error instanceof JobIdentityError) {
          return NextResponse.json(
            { success: false, error: error.message },
            { status: error.status },
          );
        }
        throw error;
      }
    }

    if (parsed.data.title !== undefined) current.title = parsed.data.title;
    if (parsed.data.summary !== undefined) current.summary = parsed.data.summary;
    if (parsed.data.description !== undefined) current.description = parsed.data.description;
    if (parsed.data.responsibilities !== undefined) {
      current.responsibilities = parsed.data.responsibilities;
    }
    if (parsed.data.requirements !== undefined) current.requirements = parsed.data.requirements;
    if (parsed.data.location !== undefined) current.location = parsed.data.location;
    if (parsed.data.employmentType !== undefined) {
      current.employmentType = parsed.data.employmentType;
    }
    if (parsed.data.workMode !== undefined) {
      current.workMode = parsed.data.workMode;
    }
    const touchesExperience =
      parsed.data.employmentType !== undefined ||
      parsed.data.experienceLevel !== undefined ||
      parsed.data.experienceMin !== undefined ||
      parsed.data.experienceMax !== undefined;
    if (touchesExperience) {
      const experience = resolveJobExperience({
        employmentType: current.employmentType,
        experienceLevel:
          parsed.data.experienceLevel !== undefined
            ? parsed.data.experienceLevel
            : current.experienceLevel,
        experienceMin:
          parsed.data.experienceMin !== undefined ? parsed.data.experienceMin : current.experienceMin,
        experienceMax:
          parsed.data.experienceMax !== undefined ? parsed.data.experienceMax : current.experienceMax,
      });
      if (!experience.ok) {
        return NextResponse.json({ success: false, error: experience.error }, { status: 400 });
      }
      current.experienceLevel = experience.value.experienceLevel;
      current.experienceMin = experience.value.experienceMin;
      current.experienceMax = experience.value.experienceMax;
    }
    if (parsed.data.isPublished !== undefined) current.isPublished = parsed.data.isPublished;

    await current.save();

    const [department, position] = await Promise.all([
      Department.findById(current.departmentId).select("name").lean(),
      JobPosition.findById(current.jobPositionId).select("name").lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: serializeJobOpening(current, {
        departmentName: department?.name || "",
        positionName: position?.name || "",
      }),
    });
  } catch (error) {
    console.error("[job-openings] PATCH failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update job" },
      { status: 500 },
    );
  }
}
