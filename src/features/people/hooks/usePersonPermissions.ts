import type { Candidate } from "@/app/dashboard/candidatePortal/[id]/types";
import { useCandidatePermissions } from "@/app/dashboard/candidatePortal/[id]/hooks/useCandidatePermissions";
import {
  getLifecyclePhase,
  type LifecyclePhase,
  type MinimalCandidate,
} from "@/lib/people/lifecycle";

export function usePersonPermissions(candidate: Candidate | null) {
  const permissions = useCandidatePermissions(candidate);
  const phase: LifecyclePhase = candidate
    ? getLifecyclePhase(candidate as MinimalCandidate)
    : "applicant";

  return {
    ...permissions,
    phase,
  };
}
