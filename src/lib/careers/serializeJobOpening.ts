import type { IJobOpening } from "@/models/jobOpening";

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
  employmentType: "fulltime" | "intern" | null;
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
  employmentType?: "fulltime" | "intern" | null;
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
    isPublished: opening.isPublished,
  };
}
