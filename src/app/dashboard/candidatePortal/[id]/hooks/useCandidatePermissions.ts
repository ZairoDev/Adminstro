import { Candidate } from "../types";
import * as LC from "@/lib/people/lifecycle";

type PermissionCandidate = LC.MinimalCandidate & {
  interviewDetails?: {
    scheduledDate?: string | null;
    remarks?: { evaluatedBy?: string };
  };
  secondRoundInterviewDetails?: { scheduledDate?: string | null };
};

export function useCandidatePermissions(candidate: Candidate | null) {
  const c = candidate as PermissionCandidate;

  return {
    hasInterviewRemarks: () => !!candidate?.interviewDetails?.remarks?.evaluatedBy,
    hasAnyInterviewScheduled: () =>
      !!(candidate?.interviewDetails?.scheduledDate || candidate?.secondRoundInterviewDetails?.scheduledDate),
    hasEmploymentType: () =>
      candidate?.employmentType === "fulltime" || candidate?.employmentType === "intern",
    canShortlist: () => (candidate ? LC.canShortlist(c) : false),
    canSelect: () => (candidate ? LC.canSelect(c) : false),
    canReject: () => (candidate ? LC.canReject(c) : false),
    canDiscontinueTraining: () => (candidate ? LC.canDiscontinueTraining(c) : false),
    canStartOnboarding: () => (candidate ? LC.canStartOnboarding(c) : false),
    canCreateEmployee: () => (candidate ? LC.canCreateEmployee(c) : false),
    canScheduleInterview: () => (candidate ? LC.canScheduleInterview(c) : false),
    canScheduleSecondRound: () =>
      !candidate?.secondRoundInterviewDetails?.scheduledDate,
    canSeparate: () => (candidate ? LC.canSeparate(c) : false),
  };
}
