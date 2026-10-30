import type { JobEmploymentType } from "@/lib/careers/jobTypes";

export type JobExperienceLevel = "fresher" | "range";

export type JobExperienceInput = {
  employmentType?: JobEmploymentType | null;
  experienceLevel?: JobExperienceLevel | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
};

export type ResolvedJobExperience = {
  experienceLevel: JobExperienceLevel | null;
  experienceMin: number | null;
  experienceMax: number | null;
};

export function resolveJobExperience(
  input: JobExperienceInput,
): { ok: true; value: ResolvedJobExperience } | { ok: false; error: string } {
  if (input.employmentType === "intern") {
    return {
      ok: true,
      value: { experienceLevel: "fresher", experienceMin: null, experienceMax: null },
    };
  }

  if (input.experienceLevel === "range") {
    const min = input.experienceMin;
    const max = input.experienceMax;
    if (typeof min !== "number" || typeof max !== "number") {
      return { ok: false, error: "Enter the minimum and maximum years of experience" };
    }
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > 40) {
      return { ok: false, error: "Experience must be a whole number from 0 to 40" };
    }
    if (min > max) {
      return { ok: false, error: "Minimum experience cannot be higher than the maximum" };
    }
    return {
      ok: true,
      value: { experienceLevel: "range", experienceMin: min, experienceMax: max },
    };
  }

  if (input.experienceLevel === "fresher") {
    return {
      ok: true,
      value: { experienceLevel: "fresher", experienceMin: null, experienceMax: null },
    };
  }

  return {
    ok: true,
    value: { experienceLevel: null, experienceMin: null, experienceMax: null },
  };
}

export function formatJobExperience(job: JobExperienceInput): string {
  if (job.employmentType === "intern" || job.experienceLevel === "fresher") return "Fresher";
  if (
    job.experienceLevel === "range" &&
    typeof job.experienceMin === "number" &&
    typeof job.experienceMax === "number"
  ) {
    if (job.experienceMin === job.experienceMax) {
      return job.experienceMin === 1 ? "1 year" : `${job.experienceMin} years`;
    }
    return `${job.experienceMin}–${job.experienceMax} years`;
  }
  return "";
}
