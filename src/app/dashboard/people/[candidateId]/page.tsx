"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  FileText,
  UserPlus,
  LogOut,
  Pencil,
  StickyNote,
  AlertTriangle,
  Trophy,
  Target,
} from "lucide-react";
import axios from "@/util/axios";
import { toast } from "sonner";
import { useAuthStore } from "@/AuthStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Loader from "@/components/loader";
import { CandidateHeader } from "@/app/dashboard/candidatePortal/[id]/components/CandidateHeader";
import { useCandidate } from "@/app/dashboard/candidatePortal/[id]/hooks/useCandidate";
import { OnboardingDetailsView } from "@/app/dashboard/candidatePortal/components/onboarding-details-view";
import { NotesModal } from "@/app/dashboard/candidatePortal/components/notes-modal";
import { CreateEmployeeDialog } from "@/app/dashboard/candidatePortal/components/createEmployee";
import type { CandidateLite } from "@/app/dashboard/candidatePortal/components/new-user";
import { SeparatePersonDialog } from "@/features/people/components/SeparatePersonDialog";
import { LifecycleBadge } from "@/features/people/components/LifecycleBadge";
import { usePersonPermissions } from "@/features/people/hooks/usePersonPermissions";
import type { Candidate } from "@/app/dashboard/candidatePortal/[id]/types";
import type {
  AppreciationRecord,
  EmployeeInterface,
  PIPRecord,
  WarningRecord,
} from "@/util/type";

type PersonTab =
  | "overview"
  | "pipeline"
  | "documents"
  | "employment"
  | "performance"
  | "history";

type PersonCandidate = Candidate & {
  exitedAt?: string | Date | null;
  exitReason?: string | null;
  exitNotes?: string | null;
  updatedAt?: string;
};

const EXIT_REASON_LABELS: Record<string, string> = {
  resigned: "Resigned",
  terminated: "Terminated",
  suspended: "Suspended",
  abscond: "Absconded",
};

function formatDate(value?: string | Date | null): string {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
}

function toEmployeeId(employeeId: unknown): string | null {
  if (!employeeId) return null;
  if (typeof employeeId === "string") return employeeId;
  if (typeof employeeId === "object" && employeeId !== null && "_id" in employeeId) {
    return String((employeeId as { _id: string })._id);
  }
  return String(employeeId);
}

export default function PersonDetailPage() {
  const params = useParams();
  const candidateId = String(params?.candidateId ?? "");
  const { token } = useAuthStore();
  const userRole = token?.role ?? "";
  const canVerify = userRole === "HR" || userRole === "SuperAdmin";

  const { candidate, loading, error, refreshCandidate } = useCandidate(candidateId);
  const person = candidate as PersonCandidate | null;
  const {
    phase,
    canScheduleInterview,
    canShortlist,
    canSelect,
    canReject,
    canCreateEmployee,
    canStartOnboarding,
    canSeparate,
  } = usePersonPermissions(person);

  const [employee, setEmployee] = useState<EmployeeInterface | null>(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [tab, setTab] = useState<PersonTab>("overview");
  const [notesOpen, setNotesOpen] = useState(false);
  const [createEmployeeOpen, setCreateEmployeeOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  const linkedEmployeeId = toEmployeeId(person?.employeeId);
  const showPipeline = phase === "applicant" || phase === "onboarding";
  const showDocuments = phase === "onboarding" || phase === "active" || phase === "exited";
  const showEmployment = Boolean(linkedEmployeeId);
  const showPerformance = Boolean(linkedEmployeeId);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!linkedEmployeeId) {
        setEmployee(null);
        return;
      }
      setEmployeeLoading(true);
      try {
        const response = await axios.post("/api/employee/getEmployeeDetails", {
          userId: linkedEmployeeId,
        });
        setEmployee(response.data?.data ?? null);
      } catch (err) {
        console.error("Failed to load employee details:", err);
        toast.error("Failed to load employee profile");
        setEmployee(null);
      } finally {
        setEmployeeLoading(false);
      }
    };
    void loadEmployee();
  }, [linkedEmployeeId]);

  const createEmployeeCandidate = useMemo<CandidateLite | null>(() => {
    if (!person) return null;
    return {
      _id: person._id,
      name: person.name,
      email: person.email,
      phone: person.phone,
      experience: person.experience,
      address: person.address,
      city: person.city,
      country: person.country,
      position: person.position,
      photoUrl: person.photoUrl,
      employmentType: person.employmentType,
      selectionDetails: person.selectionDetails
        ? {
            salary: person.selectionDetails.salary,
            role: person.selectionDetails.role,
            positionType: person.selectionDetails.positionType,
          }
        : undefined,
      onboardingDetails: person.onboardingDetails,
    };
  }, [person]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader />
      </div>
    );
  }

  if (error || !person) {
    return (
      <Card className="p-8 text-center space-y-3">
        <p className="text-muted-foreground">{error || "Person not found"}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/people">Back to People</Link>
        </Button>
      </Card>
    );
  }

  const warnings: WarningRecord[] = employee?.warnings ?? [];
  const pips: PIPRecord[] = employee?.pips ?? [];
  const appreciations: AppreciationRecord[] = employee?.appreciations ?? [];

  return (
    <div className="-mx-8 -mt-8">
      <div className="px-8 pt-4 pb-2">
        <Button variant="ghost" size="sm" className="gap-1.5 h-8" asChild>
          <Link href="/dashboard/people">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to People
          </Link>
        </Button>
      </div>

      <CandidateHeader candidate={person} />

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LifecycleBadge phase={phase} />
            {person.exitReason ? (
              <Badge variant="outline">
                {EXIT_REASON_LABELS[person.exitReason] || person.exitReason}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {phase === "applicant" && (
              <>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/candidatePortal/${person._id}`}>
                    <Calendar className="h-4 w-4 mr-2" />
                    {canScheduleInterview() ? "Schedule" : "Hiring actions"}
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/candidatePortal/${person._id}`}>
                    Shortlist / Select / Reject
                  </Link>
                </Button>
              </>
            )}
            {phase === "onboarding" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setTab("documents")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Verify docs
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/candidatePortal/${person._id}/offer-letter`}>
                    Send offer
                  </Link>
                </Button>
                <Button
                  size="sm"
                  disabled={!canCreateEmployee()}
                  onClick={() => setCreateEmployeeOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Employee
                </Button>
              </>
            )}
            {phase === "active" && linkedEmployeeId && (
              <>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/employeedetails/${linkedEmployeeId}`}>
                    <Briefcase className="h-4 w-4 mr-2" />
                    Employee ops
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canSeparate()}
                  onClick={() => setExitOpen(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Mark as Exited
                </Button>
              </>
            )}
            {phase === "exited" && (
              <Button size="sm" variant="outline" onClick={() => setTab("history")}>
                View exit summary
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setNotesOpen(true)}>
              <StickyNote className="h-4 w-4 mr-2" />
              Notes
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as PersonTab)}>
          <TabsList className="h-auto flex-wrap gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {showPipeline && <TabsTrigger value="pipeline">Pipeline</TabsTrigger>}
            {showDocuments && <TabsTrigger value="documents">Documents</TabsTrigger>}
            {showEmployment && <TabsTrigger value="employment">Employment</TabsTrigger>}
            {showPerformance && <TabsTrigger value="performance">Performance</TabsTrigger>}
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium break-all">{person.email}</p>
              </Card>
              <Card className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">****{person.phone?.slice(-4)}</p>
              </Card>
              <Card className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm font-medium">{person.position}</p>
              </Card>
            </div>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">
                Use the tabs to review hiring, documents, employment, and performance
                for this person. Full hiring actions remain available on the candidate
                record.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/candidatePortal/${person._id}`}>
                    Open hiring record
                  </Link>
                </Button>
                {linkedEmployeeId ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/employeedetails/${linkedEmployeeId}`}>
                      Open employee profile
                    </Link>
                  </Button>
                ) : null}
              </div>
            </Card>
          </TabsContent>

          {showPipeline && (
            <TabsContent value="pipeline" className="mt-4">
              <Card className="p-4 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  Hiring actions
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/candidatePortal/${person._id}`}>
                      Open hiring workspace
                    </Link>
                  </Button>
                  {canStartOnboarding() && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/candidatePortal/${person._id}/onboarding`}>
                        Start onboarding
                      </Link>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Available now:{" "}
                  {[
                    canScheduleInterview() ? "Schedule" : null,
                    canShortlist() ? "Shortlist" : null,
                    canSelect() ? "Select" : null,
                    canReject() ? "Reject" : null,
                  ]
                    .filter(Boolean)
                    .join(", ") || "View hiring record for current status"}
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Interview:{" "}
                    {person.interviewDetails?.scheduledDate
                      ? `${formatDate(person.interviewDetails.scheduledDate)} ${person.interviewDetails.scheduledTime || ""}`
                      : "Not scheduled"}
                  </p>
                  <p>
                    Second round:{" "}
                    {person.secondRoundInterviewDetails?.scheduledDate
                      ? `${formatDate(person.secondRoundInterviewDetails.scheduledDate)} ${person.secondRoundInterviewDetails.scheduledTime || ""}`
                      : "Not scheduled"}
                  </p>
                </div>
              </Card>
            </TabsContent>
          )}

          {showDocuments && (
            <TabsContent value="documents" className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/candidatePortal/${person._id}/training-agreement`}>
                    Training agreement
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/candidatePortal/${person._id}/offer-letter`}>
                    Offer letter
                  </Link>
                </Button>
              </div>
              <OnboardingDetailsView
                onboardingDetails={person.onboardingDetails}
                selectionDetails={person.selectionDetails}
                candidateId={person._id}
                canVerify={canVerify}
                onUpdate={() => void refreshCandidate()}
              />
            </TabsContent>
          )}

          {showEmployment && (
            <TabsContent value="employment" className="mt-4">
              {employeeLoading ? (
                <div className="flex justify-center py-10">
                  <Loader />
                </div>
              ) : employee ? (
                <Card className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide">
                      Employment profile
                    </h2>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/editemployeedetails/${employee._id}`}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit profile
                      </Link>
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <p className="text-sm"><span className="text-muted-foreground">Name: </span>{employee.name}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Email: </span>{employee.email}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Role: </span>{String(employee.role)}</p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Status: </span>
                      {employee.isActive ? "Active" : "Inactive"}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Joined: </span>
                      {formatDate(employee.dateOfJoining)}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Organization: </span>
                      {employee.organization || "VacationSaga"}
                    </p>
                  </div>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground">Employee profile not found.</p>
              )}
            </TabsContent>
          )}

          {showPerformance && (
            <TabsContent value="performance" className="mt-4 grid gap-4 md:grid-cols-3">
              <Card className="p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4" /> Warnings
                </h3>
                {warnings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No warnings</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {warnings.map((warning, index) => (
                      <li key={warning._id || index}>
                        <p className="font-medium">{warning.warningType}</p>
                        <p className="text-muted-foreground">{warning.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4" /> PIPs
                </h3>
                {pips.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No PIPs</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {pips.map((pip, index) => (
                      <li key={pip._id || index}>
                        <p className="font-medium">{pip.pipLevel} · {pip.status}</p>
                        <p className="text-muted-foreground">
                          {formatDate(pip.startDate)} – {formatDate(pip.endDate)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Trophy className="h-4 w-4" /> Appreciations
                </h3>
                {appreciations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No appreciations</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {appreciations.map((item, index) => (
                      <li key={item._id || index}>
                        <p className="font-medium">{item.appreciationType}</p>
                        <p className="text-muted-foreground">{item.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabsContent>
          )}

          <TabsContent value="history" className="mt-4 space-y-4">
            <Card className="p-4 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide">Timeline</h2>
              <ul className="space-y-2 text-sm">
                <li>Applied: {formatDate(person.createdAt)}</li>
                {person.interviewDetails?.scheduledDate ? (
                  <li>Interview: {formatDate(person.interviewDetails.scheduledDate)}</li>
                ) : null}
                {person.onboardingDetails?.completedAt ? (
                  <li>Onboarding complete: {formatDate(person.onboardingDetails.completedAt)}</li>
                ) : null}
                {person.employedAt ? <li>Employed: {formatDate(person.employedAt)}</li> : null}
                {person.exitedAt ? (
                  <li>
                    Exited: {formatDate(person.exitedAt)}
                    {person.exitReason
                      ? ` (${EXIT_REASON_LABELS[person.exitReason] || person.exitReason})`
                      : ""}
                  </li>
                ) : null}
              </ul>
              {person.exitNotes ? (
                <p className="text-sm text-muted-foreground">Exit notes: {person.exitNotes}</p>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setNotesOpen(true)}>
                Open notes
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <NotesModal
        open={notesOpen}
        onOpenChange={setNotesOpen}
        candidateId={person._id}
        candidateName={person.name}
      />

      <CreateEmployeeDialog
        open={createEmployeeOpen}
        onClose={() => setCreateEmployeeOpen(false)}
        candidate={createEmployeeCandidate}
        onCreated={() => {
          setCreateEmployeeOpen(false);
          void refreshCandidate();
          toast.success("Employee created successfully");
        }}
      />

      <SeparatePersonDialog
        open={exitOpen}
        candidateId={person._id}
        employeeId={linkedEmployeeId}
        employeeName={person.name}
        onClose={() => setExitOpen(false)}
        onSuccess={() => {
          setExitOpen(false);
          void refreshCandidate();
        }}
      />
    </div>
  );
}
