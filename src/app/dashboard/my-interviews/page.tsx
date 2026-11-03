"use client";

import { useCallback, useState, useEffect } from "react";
import {
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  Mail,
  Phone,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import axios from "@/util/axios";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { InterviewRemarksDialog } from "@/app/dashboard/candidatePortal/components/interview-remarks-dialog";
import { RejectCandidateDialog } from "@/app/dashboard/candidatePortal/components/reject-candidate-dialog";
import type {
  AssignedInterview,
  InterviewAttendance,
  InterviewRange,
  InterviewRemarksSnapshot,
} from "@/lib/interviews/assignedInterviews";

type InterviewsResponse = {
  data?: AssignedInterview[];
  counts?: { today: number; all: number };
  error?: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  interview: "Interview",
  shortlisted: "Shortlisted",
  selected: "Selected",
  rejected: "Rejected",
  onboarding: "Onboarding",
};

const REMARK_FIELDS: { key: keyof InterviewRemarksSnapshot; label: string }[] = [
  { key: "experienceValidation", label: "Experience" },
  { key: "motherTongueInfluence", label: "Mother tongue" },
  { key: "englishSpeaking", label: "English" },
  { key: "understandingScale", label: "Understanding" },
  { key: "listeningSkills", label: "Listening" },
  { key: "basicProfessionalism", label: "Professionalism" },
  { key: "stabilitySignals", label: "Stability" },
  { key: "salaryExpectations", label: "Salary expectations" },
  { key: "hrNotes", label: "Notes" },
];

function formatClock(time: string): string {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timingLabel(timing: AssignedInterview["timing"]): string {
  if (timing === "today") return "Today";
  if (timing === "upcoming") return "Upcoming";
  return "Past";
}

function attendanceLabel(attendance: InterviewAttendance): string {
  if (attendance === "appeared") return "Appeared";
  if (attendance === "not_appeared") return "Not appeared";
  return "Not marked";
}

export default function MyInterviewsPage() {
  const [range, setRange] = useState<InterviewRange>("today");
  const [interviews, setInterviews] = useState<AssignedInterview[]>([]);
  const [counts, setCounts] = useState({ today: 0, all: 0 });
  const [loading, setLoading] = useState(true);
  const [attendanceCandidateId, setAttendanceCandidateId] = useState<string | null>(null);
  const [remarksTarget, setRemarksTarget] = useState<AssignedInterview | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<AssignedInterview | null>(null);
  const [notesTarget, setNotesTarget] = useState<AssignedInterview | null>(null);
  const [endingNotes, setEndingNotes] = useState("");
  const [notesError, setNotesError] = useState("");
  const [shortlisting, setShortlisting] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AssignedInterview | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async (nextRange: InterviewRange) => {
    setLoading(true);
    try {
      const response = await axios.get<InterviewsResponse>("/api/my-interviews", {
        params: { range: nextRange },
      });
      setInterviews(Array.isArray(response.data?.data) ? response.data.data : []);
      setCounts(response.data?.counts ?? { today: 0, all: 0 });
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Could not load your interviews";
      toast.error(message);
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  const markAttendance = async (
    interview: AssignedInterview,
    next: InterviewAttendance
  ) => {
    const interviewAttendance =
      interview.interviewAttendance === next ? null : next;
    setAttendanceCandidateId(interview.candidateId);
    try {
      await axios.patch(`/api/my-interviews/${interview.candidateId}`, {
        action: "attendance",
        interviewAttendance,
      });
      setInterviews((current) =>
        current.map((item) =>
          item.candidateId === interview.candidateId
            ? { ...item, interviewAttendance }
            : item
        )
      );
      toast.success(
        interviewAttendance
          ? `Attendance marked as ${attendanceLabel(interviewAttendance).toLowerCase()}`
          : "Attendance cleared"
      );
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Could not update attendance";
      toast.error(message);
    } finally {
      setAttendanceCandidateId(null);
    }
  };

  const rejectInterview = async (reason: string) => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await axios.patch(`/api/my-interviews/${rejectTarget.candidateId}`, {
        action: "reject",
        reason,
      });
      toast.success(`${rejectTarget.candidateName} rejected`);
      setRejectTarget(null);
      await load(range);
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Could not reject this interview";
      toast.error(message);
    } finally {
      setRejecting(false);
    }
  };

  const shortlistInterview = async () => {
    if (!notesTarget || shortlisting) return;
    const notes = endingNotes.trim();
    if (!notes) {
      setNotesError("Ending notes are required");
      return;
    }
    setShortlisting(true);
    setNotesError("");
    try {
      await axios.patch(`/api/my-interviews/${notesTarget.candidateId}`, {
        action: "shortlist",
        endingNotes: notes,
      });
      toast.success(`${notesTarget.candidateName} shortlisted`);
      setNotesTarget(null);
      setEndingNotes("");
      await load(range);
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Could not shortlist this interview";
      toast.error(message);
    } finally {
      setShortlisting(false);
    }
  };

  const requestReject = (interview: AssignedInterview) => {
    if (!interview.hasRemarks) {
      toast.error("Fill the remarks form before rejecting this interview");
      setRemarksTarget(interview);
      return;
    }
    setRejectTarget(interview);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CalendarClock className="h-6 w-6 text-[#F7951D]" aria-hidden="true" />
          My Interviews
        </h1>
        <p className="text-sm text-muted-foreground">
          Interviews assigned to you. Attendance and remarks are saved on the candidate profile.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Interview date filter">
        {(
          [
            { id: "today", label: "Today", count: counts.today },
            { id: "all", label: "All", count: counts.all },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={range === option.id}
            onClick={() => setRange(option.id)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              range === option.id
                ? "bg-[#F7951D] text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label} ({option.count})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading interviews…
        </p>
      ) : interviews.length === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            {range === "today"
              ? "No interviews scheduled for today."
              : "You have no assigned interviews."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {interviews.map((interview) => {
            const attendanceBusy = attendanceCandidateId === interview.candidateId;
            const canReject = interview.status === "interview";
            return (
              <li key={`${interview.candidateId}-${interview.round}`}>
                <article className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <h2 className="truncate text-base font-semibold">
                        {interview.candidateName}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {[interview.position, interview.department].filter(Boolean).join(" · ") ||
                          "Role not set"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        {interview.round === "first" ? "Round 1" : "Round 2"}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        {timingLabel(interview.timing)}
                      </span>
                      {interview.status ? (
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                          {STATUS_LABELS[interview.status] ?? interview.status}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        {attendanceLabel(interview.interviewAttendance)}
                      </span>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">When</dt>
                      <dd className="font-medium">
                        {formatDateLabel(interview.scheduledDate)} · {formatClock(interview.scheduledTime)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Mode</dt>
                      <dd className="flex items-center gap-1.5 font-medium">
                        {interview.interviewMode === "virtual" ? (
                          <Video className="h-4 w-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        )}
                        {interview.interviewMode === "virtual"
                          ? "Virtual"
                          : interview.interviewMode === "physical"
                            ? "Physical"
                            : "Not set"}
                        {interview.officeName ? ` · ${interview.officeName}` : ""}
                      </dd>
                    </div>
                  </dl>

                  {interview.notes ? (
                    <p className="mt-3 text-sm text-muted-foreground">{interview.notes}</p>
                  ) : null}

                  {interview.remarks ? (
                    <details className="mt-3 rounded-md border px-3 py-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Remarks on profile
                      </summary>
                      <dl className="mt-3 grid gap-2 text-sm">
                        {REMARK_FIELDS.map((field) =>
                          interview.remarks?.[field.key] ? (
                            <div key={field.key}>
                              <dt className="text-muted-foreground">{field.label}</dt>
                              <dd>{interview.remarks[field.key]}</dd>
                            </div>
                          ) : null
                        )}
                        {interview.remarks.evaluatedBy ? (
                          <div>
                            <dt className="text-muted-foreground">Saved by</dt>
                            <dd>{interview.remarks.evaluatedBy}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </details>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                    {interview.phone ? (
                      <a
                        href={`tel:${interview.phone}`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        {interview.phone}
                      </a>
                    ) : null}
                    {interview.email ? (
                      <a
                        href={`mailto:${interview.email}`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Email
                      </a>
                    ) : null}
                    {interview.resumeUrl ? (
                      <a
                        href={interview.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        Resume
                      </a>
                    ) : null}
                    {interview.googleMeetLink ? (
                      <a
                        href={interview.googleMeetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Video className="h-4 w-4" aria-hidden="true" />
                        Join meet
                      </a>
                    ) : null}
                    <div
                      className="flex flex-wrap items-center gap-2"
                      role="group"
                      aria-label="Attendance"
                    >
                      <Button
                        type="button"
                        variant={interview.interviewAttendance === "appeared" ? "default" : "outline"}
                        className="min-h-11"
                        disabled={attendanceBusy}
                        aria-pressed={interview.interviewAttendance === "appeared"}
                        onClick={() => void markAttendance(interview, "appeared")}
                      >
                        Appeared
                      </Button>
                      <Button
                        type="button"
                        variant={interview.interviewAttendance === "not_appeared" ? "default" : "outline"}
                        className="min-h-11"
                        disabled={attendanceBusy}
                        aria-pressed={interview.interviewAttendance === "not_appeared"}
                        onClick={() => void markAttendance(interview, "not_appeared")}
                      >
                        Not appeared
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => setRemarksTarget(interview)}
                    >
                      <ClipboardList className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      {interview.hasRemarks ? "Edit remarks" : "Fill remarks"}
                    </Button>
                    {canReject ? (
                      <Button
                        type="button"
                        variant="destructive"
                        className="min-h-11"
                        onClick={() => requestReject(interview)}
                      >
                        Reject
                      </Button>
                    ) : null}
                  </div>
                  {canReject && !interview.hasRemarks ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Fill the remarks form before you can reject this interview.
                    </p>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <InterviewRemarksDialog
        open={remarksTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemarksTarget(null);
        }}
        candidateId={remarksTarget?.candidateId ?? ""}
        candidateName={remarksTarget?.candidateName ?? ""}
        existingRemarks={remarksTarget?.remarks}
        onSuccess={() => {
          const saved = remarksTarget;
          void load(range);
          if (saved?.status === "interview") {
            setDecisionTarget(saved);
          }
        }}
      />
      <Dialog
        open={decisionTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDecisionTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shortlist or reject</DialogTitle>
            <DialogDescription>
              Remarks for {decisionTarget?.candidateName ?? "this candidate"} are saved. Choose what happens next.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setDecisionTarget(null)}
            >
              Decide later
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              onClick={() => {
                if (!decisionTarget) return;
                setRejectTarget(decisionTarget);
                setDecisionTarget(null);
              }}
            >
              Reject
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={() => {
                if (!decisionTarget) return;
                setEndingNotes("");
                setNotesError("");
                setNotesTarget(decisionTarget);
                setDecisionTarget(null);
              }}
            >
              Shortlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={notesTarget !== null}
        onOpenChange={(open) => {
          if (!open && !shortlisting) {
            setNotesTarget(null);
            setNotesError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ending notes</DialogTitle>
            <DialogDescription>
              Add the closing notes for {notesTarget?.candidateName ?? "this candidate"} before they are shortlisted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="ending-notes">
              Ending notes
            </label>
            <Textarea
              id="ending-notes"
              value={endingNotes}
              maxLength={1000}
              disabled={shortlisting}
              aria-invalid={notesError ? true : undefined}
              aria-describedby={notesError ? "ending-notes-error" : undefined}
              onChange={(event) => {
                setEndingNotes(event.target.value);
                if (notesError) setNotesError("");
              }}
              className="min-h-28"
            />
            {notesError ? (
              <p id="ending-notes-error" className="text-sm text-destructive" role="alert">
                {notesError}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={shortlisting}
              onClick={() => {
                setNotesTarget(null);
                setNotesError("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={shortlisting}
              onClick={() => void shortlistInterview()}
            >
              {shortlisting ? "Shortlisting…" : "Shortlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RejectCandidateDialog
        open={rejectTarget !== null}
        onClose={() => {
          if (!rejecting) setRejectTarget(null);
        }}
        onSubmit={async (data) => {
          await rejectInterview(data.reason);
        }}
        loading={rejecting}
        title="Reject failed interview"
        description={
          rejectTarget
            ? `Reject ${rejectTarget.candidateName}. Remarks are already saved on their profile.`
            : undefined
        }
        submitButtonText="Reject"
      />
    </div>
  );
}
