import type { IJobOpening } from "@/models/jobOpening";
import type { JobEmploymentType, JobWorkMode } from "@/lib/careers/jobTypes";

export type JobOpeningView = {
  _id: string;
  title: string;
  slug: string;
  departmentId: string;
  jobPositionId: string;
  departmentName: string;
  positionName: string;
  summary: string;
  description: string;
  responsibilities: string;
  requirements: string;
  location: string;
  employmentType: JobEmploymentType | null;
  workMode: JobWorkMode | null;
  experienceLevel: "fresher" | "range" | null;
  experienceMin: number | null;
  experienceMax: number | null;
  isPublished: boolean;
};

type OpeningSource = {
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
};

export function serializeJobOpening(
  opening: OpeningSource | IJobOpening,
  names: { departmentName: string; positionName: string },
): JobOpeningView {
  return {
    _id: String(opening._id),
    title: opening.title,
    slug: opening.slug,
    departmentId: String(opening.departmentId),
    jobPositionId: String(opening.jobPositionId),
    departmentName: names.departmentName,
    positionName: names.positionName,
    summary: opening.summary,
    description: opening.description,
    responsibilities: opening.responsibilities || "",
    requirements: opening.requirements || "",
    location: opening.location || "",
    employmentType: opening.employmentType ?? null,
    workMode: opening.workMode ?? null,
    experienceLevel: opening.employmentType === "intern" ? "fresher" : opening.experienceLevel ?? null,
    experienceMin: opening.employmentType === "intern" ? null : opening.experienceMin ?? null,
    experienceMax: opening.employmentType === "intern" ? null : opening.experienceMax ?? null,
    isPublished: opening.isPublished,
  };
}
