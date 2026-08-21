import type { Candidate } from "@/app/dashboard/candidatePortal/[id]/types";

export type LifecyclePhase = "applicant" | "onboarding" | "active" | "exited";

export interface MinimalCandidate {
  status: string;
  employeeId?: string | null;
  exitedAt?: string | Date | null;
  onboardingDetails?: {
    onboardingComplete?: boolean;
    verifiedByHR?: { verified?: boolean };
  };
}

export function getLifecyclePhase(c: MinimalCandidate): LifecyclePhase {
  if (c.exitedAt) return "exited";
  if (c.employeeId) return "active";
  if (c.status === "onboarding") return "onboarding";
  return "applicant";
}

export function canCreateEmployee(c: MinimalCandidate): boolean {
  return (
    c.status === "onboarding" &&
    c.onboardingDetails?.onboardingComplete === true &&
    c.onboardingDetails?.verifiedByHR?.verified === true &&
    !c.employeeId
  );
}

export function canSeparate(c: MinimalCandidate): boolean {
  return Boolean(c.employeeId && !c.exitedAt);
}

export function canScheduleInterview(c: MinimalCandidate & {
  interviewDetails?: { scheduledDate?: string | null };
}): boolean {
  return c.status === "pending" && !c.interviewDetails?.scheduledDate;
}

export function canShortlist(c: MinimalCandidate): boolean {
  return c.status === "pending";
}

export function canSelect(c: MinimalCandidate & {
  interviewDetails?: { remarks?: { evaluatedBy?: string } };
}): boolean {
  if (c.status === "interview") {
    return Boolean(c.interviewDetails?.remarks?.evaluatedBy);
  }
  return c.status === "pending" || c.status === "shortlisted";
}

export function canReject(c: MinimalCandidate & {
  interviewDetails?: { remarks?: { evaluatedBy?: string } };
}): boolean {
  if (c.status === "interview") {
    return Boolean(c.interviewDetails?.remarks?.evaluatedBy);
  }
  return c.status !== "rejected" && c.status !== "onboarding";
}

export function canStartOnboarding(c: MinimalCandidate): boolean {
  return c.status === "selected";
}

export function canDiscontinueTraining(c: MinimalCandidate): boolean {
  return c.status === "selected";
}
