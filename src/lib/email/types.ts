// Email Types and Interfaces

// Candidate Email Types
export type CandidateEmailStatus =
  | "selected"
  | "rejected"
  | "shortlisted"
  | "onboarding"
  | "trainingDiscontinued"
  | "interview"
  | "secondRoundInterview"
  | "interviewRescheduled"
  | "secondRoundInterviewRescheduled"
  | "interviewRescheduleRejected"
  | "secondRoundInterviewRescheduleRejected";

export interface SelectionDetails {
  positionType: string;
  duration: string;
  trainingPeriod: string;
  trainingDate?: string; // Training start date (YYYY-MM-DD format)
  role: string;
}

export interface CandidateEmailPayload {
  to: string;
  candidateName: string;
  status: CandidateEmailStatus;
  position: string;
  companyName?: string;
  selectionDetails?: SelectionDetails;
  rejectionReason?: string;
  shortlistRoles?: string[];
  onboardingLink?: string;
  trainingAgreementLink?: string;
  interviewDetails?: {
    scheduledDate: string;
    scheduledTime: string;
    officeAddress: string;
    googleMapsLink: string;
    candidateId?: string;
    interviewType?: "first" | "second";
    rescheduleLink?: string;
  };
  id?: string;
}

// Warning Email Types
export type WarningType =
  | "disciplineIssue"
  | "lateAttendance"
  | "unplannedLeaves"
  | "poshWarning"
  | "combinedWarning";

export interface WarningEmailPayload {
  to: string;
  employeeName: string;
  warningType: WarningType;
  department: string;
  reportingManager: string;
  date: string;
  companyName?: string;
  dateTime?: string; // For combined warning
}

// Generic Email Template Response
export interface EmailTemplate {
  subject: string;
  html: string;
}

// Email Send Response
export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Warning Record for Database
export interface WarningRecord {
  _id?: string;
  warningType: WarningType;
  reason: string;
  department: string;
  reportingManager: string;
  issuedBy: string;
  issuedAt: Date | string;
  emailSent: boolean;
  notes?: string;
}

// Warning Type Labels for UI
export const WARNING_TYPE_LABELS: Record<WarningType, string> = {
  disciplineIssue: "Discipline Issue",
  lateAttendance: "Late Attendance",
  unplannedLeaves: "Unplanned Leaves",
  poshWarning: "POSH Warning",
  combinedWarning: "Combined Warning",
};

// Warning Type Colors for UI
export const WARNING_TYPE_COLORS: Record<WarningType, string> = {
  disciplineIssue: "bg-red-500/10 text-red-600 border-red-500/30",
  lateAttendance: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  unplannedLeaves: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  poshWarning: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  combinedWarning: "bg-red-700/10 text-red-700 border-red-700/30",
};

// PIP (Performance Improvement Plan) Types
export type PIPLevel = "forTrainees"|"level1" | "level2" | "level3";

export interface PIPEmailPayload {
  to: string;
  employeeName: string;
  pipLevel: PIPLevel;
  startDate: string;
  endDate: string;
  concerns?: string[]; // For level 1
  issues?: string[]; // For level 2
  criticalIssues?: string[]; // For level 3
  companyName?: string;
}

// PIP Record for Database
export interface PIPRecord {
  _id?: string;
  pipLevel: PIPLevel;
  startDate: string;
  endDate: string;
  concerns: string[];
  issuedBy: string;
  issuedAt: Date | string;
  emailSent: boolean;
  status: "active" | "completed" | "failed";
  notes?: string;
}

// PIP Level Labels for UI
export const PIP_LEVEL_LABELS: Record<PIPLevel, string> = {
  forTrainees: "For Trainees",
  level1: "Level 1 - Supportive Guidance",
  level2: "Level 2 - Strict Monitoring",
  level3: "Level 3 - Final Warning",
};

// PIP Level Colors for UI
export const PIP_LEVEL_COLORS: Record<PIPLevel, string> = {
  forTrainees: "bg-green-500/10 text-green-600 border-green-500/30",
  level1: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  level2: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  level3: "bg-red-500/10 text-red-600 border-red-500/30",
};

// Appreciation Email Types
export type AppreciationType =
  | "outstandingContribution"
  | "outstandingAchievement"
  | "excellentAttendance";

export interface AppreciationEmailPayload {
  to: string;
  employeeName: string;
  appreciationType: AppreciationType;
  companyName?: string;
}

// Appreciation Record for Database
export interface AppreciationRecord {
  _id?: string;
  appreciationType: AppreciationType;
  reason: string;
  issuedBy: string;
  issuedAt: Date | string;
  emailSent: boolean;
  notes?: string;
}

// Appreciation Type Labels for UI
export const APPRECIATION_TYPE_LABELS: Record<AppreciationType, string> = {
  outstandingContribution: "Outstanding Contribution",
  outstandingAchievement: "Outstanding Achievement",
  excellentAttendance: "Excellent Attendance",
};

// Appreciation Type Colors for UI
export const APPRECIATION_TYPE_COLORS: Record<AppreciationType, string> = {
  outstandingContribution: "bg-green-500/10 text-green-600 border-green-500/30",
  outstandingAchievement: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  excellentAttendance: "bg-blue-500/10 text-blue-600 border-blue-500/30",
};
