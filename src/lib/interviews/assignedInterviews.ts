export const INTERVIEWER_VIEW_ROLES = [
  "SuperAdmin",
  "HR",
  "LeadGen-TeamLead",
  "Sales-TeamLead",
] as const;

export type InterviewerViewRole = (typeof INTERVIEWER_VIEW_ROLES)[number];
export type InterviewRange = "today" | "all";
export type InterviewTiming = "today" | "upcoming" | "past";
export type InterviewRound = "first" | "second";
export type InterviewAttendance = "appeared" | "not_appeared" | null;

export interface InterviewRemarksSnapshot {
  experienceValidation: string | null;
  motherTongueInfluence: string | null;
  englishSpeaking: string | null;
  understandingScale: string | null;
  listeningSkills: string | null;
  basicProfessionalism: string | null;
  stabilitySignals: string | null;
  salaryExpectations: string | null;
  hrNotes: string | null;
  evaluatedBy: string | null;
}

export interface AssignedInterview {
  candidateId: string;
  candidateName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  resumeUrl: string;
  status: string;
  round: InterviewRound;
  scheduledDate: string;
  scheduledTime: string;
  interviewMode: "physical" | "virtual" | null;
  officeName: string | null;
  googleMeetLink: string | null;
  notes: string | null;
  interviewAttendance: InterviewAttendance;
  remarks: InterviewRemarksSnapshot | null;
  hasRemarks: boolean;
  timing: InterviewTiming;
}

interface InterviewRoundRecord {
  scheduledDate?: Date | string | null;
  scheduledTime?: string | null;
  interviewMode?: "physical" | "virtual" | null;
  officeName?: string | null;
  googleMeetLink?: string | null;
  notes?: string | null;
  interviewerEmployeeId?: unknown;
  remarks?: {
    experienceValidation?: string | null;
    motherTongueInfluence?: string | null;
    englishSpeaking?: string | null;
    understandingScale?: string | null;
    listeningSkills?: string | null;
    basicProfessionalism?: string | null;
    stabilitySignals?: string | null;
    salaryExpectations?: string | null;
    hrNotes?: string | null;
    evaluatedBy?: string | null;
  } | null;
}

export interface CandidateInterviewRecord {
  _id: unknown;
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  status?: string;
  resumeUrl?: string;
  interviewAttendance?: string | null;
  interviewDetails?: InterviewRoundRecord | null;
  secondRoundInterviewDetails?: InterviewRoundRecord | null;
}

export function canViewAssignedInterviews(role: string): boolean {
  return (INTERVIEWER_VIEW_ROLES as readonly string[]).includes(role);
}

export function toCalendarDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarKeyFromStored(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return toCalendarDateKey(date);
}

function timingFor(dateKey: string, todayKey: string): InterviewTiming {
  if (dateKey === todayKey) return "today";
  return dateKey > todayKey ? "upcoming" : "past";
}

function clockMinutes(time: string): number {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

function interviewerMatches(value: unknown, employeeId: string): boolean {
  if (value == null || !employeeId) return false;
  return String(value) === employeeId;
}

export function isAssignedInterviewer(
  candidate: {
    interviewDetails?: { interviewerEmployeeId?: unknown } | null;
    secondRoundInterviewDetails?: { interviewerEmployeeId?: unknown } | null;
  },
  employeeId: string
): boolean {
  return (
    interviewerMatches(candidate.interviewDetails?.interviewerEmployeeId, employeeId) ||
    interviewerMatches(
      candidate.secondRoundInterviewDetails?.interviewerEmployeeId,
      employeeId
    )
  );
}

function textOrNull(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  return text || null;
}

function readRemarks(
  details: InterviewRoundRecord | null | undefined
): InterviewRemarksSnapshot | null {
  const remarks = details?.remarks;
  const evaluatedBy = textOrNull(remarks?.evaluatedBy);
  if (!remarks || !evaluatedBy) return null;
  return {
    experienceValidation: textOrNull(remarks.experienceValidation),
    motherTongueInfluence: textOrNull(remarks.motherTongueInfluence),
    englishSpeaking: textOrNull(remarks.englishSpeaking),
    understandingScale: textOrNull(remarks.understandingScale),
    listeningSkills: textOrNull(remarks.listeningSkills),
    basicProfessionalism: textOrNull(remarks.basicProfessionalism),
    stabilitySignals: textOrNull(remarks.stabilitySignals),
    salaryExpectations: textOrNull(remarks.salaryExpectations),
    hrNotes: textOrNull(remarks.hrNotes),
    evaluatedBy,
  };
}

function readAttendance(value: string | null | undefined): InterviewAttendance {
  if (value === "appeared" || value === "not_appeared") return value;
  return null;
}

function mapRound(
  candidate: CandidateInterviewRecord,
  round: InterviewRound,
  details: InterviewRoundRecord | null | undefined,
  employeeId: string,
  todayKey: string,
  remarks: InterviewRemarksSnapshot | null,
  interviewAttendance: InterviewAttendance
): AssignedInterview | null {
  if (!details || !interviewerMatches(details.interviewerEmployeeId, employeeId)) {
    return null;
  }
  const scheduledDate = calendarKeyFromStored(details.scheduledDate);
  const scheduledTime = details.scheduledTime?.trim() ?? "";
  if (!scheduledDate || !scheduledTime) return null;

  const mode = details.interviewMode === "physical" || details.interviewMode === "virtual"
    ? details.interviewMode
    : null;

  return {
    candidateId: String(candidate._id),
    candidateName: candidate.name?.trim() || "Candidate",
    email: candidate.email?.trim() || "",
    phone: candidate.phone?.trim() || "",
    position: candidate.position?.trim() || "",
    department: candidate.department?.trim() || "",
    resumeUrl: candidate.resumeUrl?.trim() || "",
    status: candidate.status?.trim() || "",
    round,
    scheduledDate,
    scheduledTime,
    interviewMode: mode,
    officeName: details.officeName?.trim() || null,
    googleMeetLink: details.googleMeetLink?.trim() || null,
    notes: details.notes?.trim() || null,
    interviewAttendance,
    remarks,
    hasRemarks: remarks !== null,
    timing: timingFor(scheduledDate, todayKey),
  };
}

function compareInterviews(a: AssignedInterview, b: AssignedInterview): number {
  const rank: Record<InterviewTiming, number> = { today: 0, upcoming: 1, past: 2 };
  const timingDiff = rank[a.timing] - rank[b.timing];
  if (timingDiff !== 0) return timingDiff;
  const dateDiff =
    a.timing === "past"
      ? b.scheduledDate.localeCompare(a.scheduledDate)
      : a.scheduledDate.localeCompare(b.scheduledDate);
  if (dateDiff !== 0) return dateDiff;
  return clockMinutes(a.scheduledTime) - clockMinutes(b.scheduledTime);
}

export function buildAssignedInterviewList(
  candidates: CandidateInterviewRecord[],
  employeeId: string,
  todayKey: string,
  range: InterviewRange
): { data: AssignedInterview[]; counts: { today: number; all: number } } {
  const all = candidates.flatMap((candidate) => {
    const remarks = readRemarks(candidate.interviewDetails);
    const interviewAttendance = readAttendance(candidate.interviewAttendance);
    const first = mapRound(
      candidate,
      "first",
      candidate.interviewDetails,
      employeeId,
      todayKey,
      remarks,
      interviewAttendance
    );
    const second = mapRound(
      candidate,
      "second",
      candidate.secondRoundInterviewDetails,
      employeeId,
      todayKey,
      remarks,
      interviewAttendance
    );
    return [first, second].filter((item): item is AssignedInterview => item !== null);
  });

  all.sort(compareInterviews);

  return {
    counts: {
      today: all.filter((item) => item.timing === "today").length,
      all: all.length,
    },
    data: range === "today" ? all.filter((item) => item.timing === "today") : all,
  };
}
