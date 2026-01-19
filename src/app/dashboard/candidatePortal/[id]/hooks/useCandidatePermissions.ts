import { Candidate } from "../types";

export function useCandidatePermissions(candidate: Candidate | null) {
  const hasInterviewRemarks = () => {
    return !!candidate?.interviewDetails?.remarks?.evaluatedBy;
  };

  const hasAnyInterviewScheduled = () => {
    return !!(
      candidate?.interviewDetails?.scheduledDate ||
      candidate?.secondRoundInterviewDetails?.scheduledDate
    );
  };

  const canShortlist = () => {
    return candidate?.status === "pending";
  };

  const canSelect = () => {
    const status = candidate?.status;
    if (status === "interview") {
      return hasInterviewRemarks();
    }
    if (status === "pending" || status === "shortlisted") {
      return true;
    }
    return false;
  };

  const canReject = () => {
    const status = candidate?.status;
    if (status === "interview") {
      return hasInterviewRemarks();
    }
    return status !== "rejected" && status !== "onboarding";
  };

  const canDiscontinueTraining = () => {
    return candidate?.status === "selected";
  };

  const canStartOnboarding = () => {
    return candidate?.status === "selected";
  };

  const canCreateEmployee = () => {
    return candidate?.status === "onboarding" && candidate?.onboardingDetails?.onboardingComplete === true;
  };

  const canScheduleInterview = () => {
    return candidate?.status === "pending" && !candidate?.interviewDetails?.scheduledDate;
  };

  const canScheduleSecondRound = () => {
    const hasSecondRound = candidate?.secondRoundInterviewDetails?.scheduledDate;
    return !hasSecondRound;
  };

  return {
    hasInterviewRemarks,
    hasAnyInterviewScheduled,
    canShortlist,
    canSelect,
    canReject,
    canDiscontinueTraining,
    canStartOnboarding,
    canCreateEmployee,
    canScheduleInterview,
    canScheduleSecondRound,
  };
}

