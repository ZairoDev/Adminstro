"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  MoreVertical,
  Briefcase,
  FileText,
  UserPlus,
  Check,
  X,
  StickyNote,
  AlertCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  canCreateEmployee,
  getLifecyclePhase,
  type LifecyclePhase,
} from "@/lib/people/lifecycle";
import {
  getStatusColor,
  getStatusLabel,
  ROLE_OPTIONS,
} from "@/app/dashboard/candidatePortal/[id]/constants";
import {
  formatDateForDisplay,
  getTodayLocalMidnight,
  normalizeToLocalMidnight,
  parseLocalDateString,
} from "@/lib/utils";
import { format } from "date-fns";
import { NotesModal } from "@/app/dashboard/candidatePortal/components/notes-modal";

export type PeopleListTab =
  | "pipeline"
  | "interview"
  | "shortlisted"
  | "selected"
  | "rejected"
  | "onboarding"
  | "active"
  | "exited";

export interface PeopleListShellProps {
  tab: PeopleListTab;
}

interface InterviewRoundDetails {
  scheduledDate?: string | Date | null;
  scheduledTime?: string | null;
  scheduledBy?: string | null;
  rescheduleRequest?: {
    requestedDate?: string;
    requestedTime?: string;
    reason?: string;
    requestedAt?: string;
    status?: "pending" | "approved" | "rejected";
    reviewedBy?: string;
    reviewedAt?: string;
  };
}

interface RescheduleRequest {
  candidateId: string;
  candidateName: string;
  interviewType: "first" | "second";
  requestedDate: string;
  requestedTime: string;
  reason?: string;
  currentDate?: string;
  currentTime?: string;
}

interface PeopleListRow {
  _id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: number;
  status: string;
  createdAt: string;
  employeeId?: string | null;
  employedAt?: string | null;
  exitedAt?: string | Date | null;
  exitReason?: string | null;
  interviewAttendance?: "appeared" | "not_appeared" | null;
  interviewDetails?: InterviewRoundDetails;
  secondRoundInterviewDetails?: InterviewRoundDetails;
  notes?: Array<{
    _id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
  onboardingDetails?: {
    onboardingComplete?: boolean;
    completedAt?: string;
    verifiedByHR?: { verified?: boolean };
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Tabs that map directly onto a candidate lifecycle phase (Task 5-A `phase` param).
const PHASE_TABS: Partial<Record<PeopleListTab, LifecyclePhase>> = {
  pipeline: "applicant",
  onboarding: "onboarding",
  active: "active",
  exited: "exited",
};

// Tabs that filter on the raw candidate `status` field (pre-onboarding pipeline stages).
const STATUS_ONLY_TABS: Partial<Record<PeopleListTab, string>> = {
  interview: "interview",
  shortlisted: "shortlisted",
  selected: "selected",
  rejected: "rejected",
};

const DATE_COLUMN_LABEL: Record<PeopleListTab, string> = {
  pipeline: "Applied",
  interview: "Applied",
  shortlisted: "Applied",
  selected: "Applied",
  rejected: "Applied",
  onboarding: "Onboarded",
  active: "Employed",
  exited: "Exited",
};

const EMPTY_LABEL: Record<PeopleListTab, string> = {
  pipeline: "No pipeline candidates found",
  interview: "No candidates in interview stage",
  shortlisted: "No shortlisted candidates found",
  selected: "No candidates selected for training",
  rejected: "No rejected candidates found",
  onboarding: "No onboarding candidates found",
  active: "No employed people found",
  exited: "No exited people found",
};

const HIRING_RECORD_LINK_TABS: PeopleListTab[] = [
  "pipeline",
  "interview",
  "shortlisted",
  "selected",
  "rejected",
  "onboarding",
  "exited",
];

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

type DocumentStatus = "not-uploaded" | "uploaded" | "verified";

interface OnboardingDetailsForDocStatus {
  verifiedByHR?: { verified?: boolean };
  documents?: Record<string, unknown>;
}

function getDocumentStatus(
  onboardingDetails?: OnboardingDetailsForDocStatus
): DocumentStatus {
  // If HR has verified, status is "verified"
  if (onboardingDetails?.verifiedByHR?.verified === true) {
    return "verified";
  }

  // Check if any documents are uploaded
  const docs = onboardingDetails?.documents;
  if (!docs || typeof docs !== "object") {
    return "not-uploaded";
  }

  const hasAnyDocument = Object.values(docs).some((value) => {
    if (Array.isArray(value)) {
      return value.some(
        (item) => item !== null && item !== "" && item !== undefined
      );
    }
    return value !== null && value !== "" && value !== undefined;
  });

  return hasAnyDocument ? "uploaded" : "not-uploaded";
}

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  if (status === "verified") {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        Verified
      </Badge>
    );
  }
  if (status === "uploaded") {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
        Uploaded
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Not Uploaded
    </Badge>
  );
}

type InterviewDateCategory = "today" | "tomorrow" | "later" | "past";

function categorizeInterviewDate(
  scheduledDate: string | Date | null | undefined
): InterviewDateCategory {
  if (!scheduledDate) return "past";
  try {
    let normalized: Date;
    if (typeof scheduledDate === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
        normalized = parseLocalDateString(scheduledDate);
      } else {
        const dateObj = new Date(scheduledDate);
        normalized = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          dateObj.getDate(),
          0,
          0,
          0,
          0
        );
      }
    } else {
      normalized = normalizeToLocalMidnight(scheduledDate);
    }

    const today = getTodayLocalMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (normalized.getTime() === today.getTime()) return "today";
    if (normalized.getTime() === tomorrow.getTime()) return "tomorrow";
    if (normalized.getTime() < today.getTime()) return "past";
    return "later";
  } catch {
    return "past";
  }
}

function InterviewDateCategoryBadge({
  category,
}: {
  category: InterviewDateCategory;
}) {
  if (category === "today") {
    return (
      <Badge
        variant="outline"
        className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-200"
      >
        Today
      </Badge>
    );
  }
  if (category === "tomorrow") {
    return (
      <Badge
        variant="outline"
        className="text-xs font-normal bg-purple-50 text-purple-700 border-purple-200"
      >
        Tomorrow
      </Badge>
    );
  }
  return null;
}

function InterviewScheduleCell({ person }: { person: PeopleListRow }) {
  const first = person.interviewDetails;
  const second = person.secondRoundInterviewDetails;
  const hasFirst = Boolean(first?.scheduledDate && first?.scheduledTime);
  const hasSecond = Boolean(second?.scheduledDate && second?.scheduledTime);

  if (!hasFirst && !hasSecond) {
    return <span className="text-muted-foreground">Not scheduled</span>;
  }

  return (
    <div className="space-y-3">
      {hasFirst && (
        <div>
          <div className="font-medium flex items-center gap-2 flex-wrap">
            {formatDateForDisplay(first?.scheduledDate)}
            <Badge
              variant="outline"
              className="text-xs font-normal bg-indigo-50 text-indigo-700 border-indigo-200"
            >
              First Round
            </Badge>
            <InterviewDateCategoryBadge
              category={categorizeInterviewDate(first?.scheduledDate)}
            />
          </div>
          <div className="text-muted-foreground text-xs">
            {first?.scheduledTime}
          </div>
          {first?.scheduledBy && (
            <div className="text-muted-foreground text-xs mt-1">
              Scheduled by: {first.scheduledBy}
            </div>
          )}
        </div>
      )}
      {hasSecond && (
        <div className={hasFirst ? "pt-3 border-t" : ""}>
          <div className="font-medium flex items-center gap-2 flex-wrap">
            {formatDateForDisplay(second?.scheduledDate)}
            <Badge
              variant="outline"
              className="text-xs font-normal bg-orange-50 text-orange-700 border-orange-200"
            >
              Second Round
            </Badge>
            <InterviewDateCategoryBadge
              category={categorizeInterviewDate(second?.scheduledDate)}
            />
          </div>
          <div className="text-muted-foreground text-xs">
            {second?.scheduledTime}
          </div>
          {second?.scheduledBy && (
            <div className="text-muted-foreground text-xs mt-1">
              Scheduled by: {second.scheduledBy}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildListParams(
  tab: PeopleListTab,
  searchTerm: string,
  pageNum: number,
  roleFilter: string,
  expFilter: string,
  dateFilterType: string,
  customFrom?: Date,
  customTo?: Date
): URLSearchParams {
  const params = new URLSearchParams({
    page: pageNum.toString(),
    limit: "10",
  });

  if (searchTerm) {
    params.append("search", searchTerm);
  }
  if (roleFilter !== "all") {
    params.append("position", roleFilter);
  }
  if (expFilter !== "all") {
    params.append("experienceFilter", expFilter);
  }

  // Add date filters
  if (dateFilterType !== "all") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateFilterType === "today") {
      params.append("appliedFrom", format(today, "yyyy-MM-dd"));
      params.append("appliedTo", format(today, "yyyy-MM-dd"));
    } else if (dateFilterType === "last7days") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      params.append("appliedFrom", format(weekAgo, "yyyy-MM-dd"));
      params.append("appliedTo", format(today, "yyyy-MM-dd"));
    } else if (dateFilterType === "last30days") {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      params.append("appliedFrom", format(monthAgo, "yyyy-MM-dd"));
      params.append("appliedTo", format(today, "yyyy-MM-dd"));
    } else if (dateFilterType === "custom" && customFrom && customTo) {
      params.append("appliedFrom", format(customFrom, "yyyy-MM-dd"));
      params.append("appliedTo", format(customTo, "yyyy-MM-dd"));
    }
  }

  const phase = PHASE_TABS[tab];
  const statusOnly = STATUS_ONLY_TABS[tab];

  if (phase) {
    params.append("phase", phase);
  } else if (statusOnly) {
    params.append("status", statusOnly);
  }

  return params;
}

export function PeopleListShell({ tab }: PeopleListShellProps) {
  const [candidates, setCandidates] = useState<PeopleListRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [selectedRole, setSelectedRole] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [availableRoles, setAvailableRoles] = useState<string[]>([
    ...ROLE_OPTIONS,
  ]);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesPerson, setNotesPerson] = useState<PeopleListRow | null>(null);
  const [pendingRescheduleRequests, setPendingRescheduleRequests] = useState<
    RescheduleRequest[]
  >([]);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [processingReschedule, setProcessingReschedule] = useState<string | null>(
    null
  );
  const [userRole, setUserRole] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [customRangeDialogOpen, setCustomRangeDialogOpen] = useState(false);

  const dateColumnLabel = DATE_COLUMN_LABEL[tab];
  const columnCount = 9;

  // Get user role for reschedule permissions
  useEffect(() => {
    const getUserRole = async () => {
      try {
        const mod: any = await import("@/AuthStore").catch(() => null);
        const store = mod?.useAuthStore;
        const token =
          typeof store?.getState === "function"
            ? store.getState()?.token
            : undefined;
        const tokenRole = token?.role;
        if (tokenRole) {
          setUserRole(tokenRole);
        }
      } catch {
        setUserRole(null);
      }
    };
    void getUserRole();
  }, []);

  const canVerify = userRole === "HR" || userRole === "SuperAdmin";

  const fetchPeople = useCallback(
    async (
      searchTerm: string,
      pageNum: number,
      roleFilter: string,
      expFilter: string,
      dateFilterType: string,
      customFrom?: Date,
      customTo?: Date
    ) => {
      setLoading(true);
      try {
        const params = buildListParams(
          tab,
          searchTerm,
          pageNum,
          roleFilter,
          expFilter,
          dateFilterType,
          customFrom,
          customTo
        );
        const response = await fetch(`/api/candidates?${params.toString()}`);
        const result = (await response.json()) as {
          success?: boolean;
          data?: PeopleListRow[];
          pagination?: PaginationData;
          error?: string;
        };

        if (result.success && Array.isArray(result.data)) {
          setCandidates(result.data);
          setPagination(result.pagination ?? null);
          setFetchError(false);
        } else {
          toast.error(result.error || "Failed to load people. Please try again.");
          setFetchError(true);
        }
      } catch (error) {
        console.error("Error fetching people list:", error);
        toast.error("Failed to load people. Please try again.");
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    },
    [tab]
  );

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch("/api/candidates/positions");
        const result = (await response.json()) as {
          success?: boolean;
          data?: string[];
        };
        if (result.success && result.data && result.data.length > 0) {
          setAvailableRoles(result.data);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    };
    void fetchRoles();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab, search, selectedRole, experienceFilter, dateFilter, customDateFrom, customDateTo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchPeople(search, page, selectedRole, experienceFilter, dateFilter, customDateFrom, customDateTo);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, page, selectedRole, experienceFilter, dateFilter, customDateFrom, customDateTo, fetchPeople]);

  const phaseDateValue = (person: PeopleListRow): string => {
    if (tab === "exited") return formatDate(person.exitedAt);
    if (tab === "active") return formatDate(person.employedAt);
    if (tab === "onboarding") {
      return formatDate(person.onboardingDetails?.completedAt);
    }
    return formatDate(person.createdAt);
  };

  const handleUpdateAttendance = async (
    person: PeopleListRow,
    attendance: "appeared" | "not_appeared" | null
  ) => {
    try {
      const response = await fetch(`/api/candidates/${person._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewAttendance: attendance }),
      });
      const result = await response.json();
      if (result.success) {
        setCandidates((prev) =>
          prev.map((c) =>
            c._id === person._id ? { ...c, interviewAttendance: attendance } : c
          )
        );
        const attendanceText =
          attendance === "appeared"
            ? "Appeared"
            : attendance === "not_appeared"
              ? "Not Appeared"
              : "Cleared";
        toast.success(`Interview attendance marked as: ${attendanceText}`);
      } else {
        toast.error(result.error || "Failed to update attendance");
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error("Failed to update attendance");
    }
  };

  const handleAddNote = (person: PeopleListRow) => {
    setNotesPerson(person);
    setNotesDialogOpen(true);
  };

  const handleNotesUpdated = () => {
    void fetchPeople(search, page, selectedRole, experienceFilter, dateFilter, customDateFrom, customDateTo);
  };

  // Fetch pending reschedule requests
  const fetchPendingRescheduleRequests = useCallback(async () => {
    if (!canVerify) {
      return;
    }

    try {
      const response = await fetch("/api/candidates/reschedule-requests");

      if (!response.ok) {
        console.error("API response not OK:", response.status, response.statusText);
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        setPendingRescheduleRequests(result.data);
      } else {
        setPendingRescheduleRequests([]);
      }
    } catch (error) {
      console.error("Error fetching pending reschedule requests:", error);
      setPendingRescheduleRequests([]);
    }
  }, [canVerify]);

  // Handle reschedule request approval/rejection
  const handleRescheduleRequest = async (
    candidateId: string,
    action: "approve" | "reject",
    interviewType: "first" | "second"
  ) => {
    setProcessingReschedule(candidateId);
    try {
      const response = await fetch(
        `/api/candidates/${candidateId}/approve-reschedule`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            interviewType,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success(
          action === "approve"
            ? "Reschedule request approved successfully"
            : "Reschedule request rejected"
        );
        // Refresh candidates list and pending requests
        await fetchPeople(search, page, selectedRole, experienceFilter, dateFilter, customDateFrom, customDateTo);
        await fetchPendingRescheduleRequests();
        // Close modal if no more pending requests
        if (pendingRescheduleRequests.length <= 1) {
          setRescheduleModalOpen(false);
        }
      } else {
        toast.error(result.error || `Failed to ${action} reschedule request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing reschedule request:`, error);
      toast.error(`Failed to ${action} reschedule request`);
    } finally {
      setProcessingReschedule(null);
    }
  };

  // Fetch pending reschedule requests when user role is available
  useEffect(() => {
    if (canVerify) {
      void fetchPendingRescheduleRequests();
    }
  }, [canVerify, fetchPendingRescheduleRequests]);

  // Refresh pending requests when candidates are fetched
  useEffect(() => {
    if (canVerify && candidates.length > 0) {
      void fetchPendingRescheduleRequests();
    }
  }, [candidates, canVerify, fetchPendingRescheduleRequests]);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 shrink-0 items-center">
            {canVerify && (
              <Button
                variant="outline"
                onClick={() => setRescheduleModalOpen(true)}
                disabled={pendingRescheduleRequests.length === 0}
                className={`shrink-0 ${
                  pendingRescheduleRequests.length > 0
                    ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-100"
                    : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 opacity-60"
                }`}
              >
                <AlertCircle
                  className={`w-4 h-4 mr-2 ${
                    pendingRescheduleRequests.length > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                Reschedule Requests
                {pendingRescheduleRequests.length > 0 && (
                  <Badge className="ml-2 bg-amber-600 dark:bg-amber-500 text-white">
                    {pendingRescheduleRequests.length}
                  </Badge>
                )}
              </Button>
            )}
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="h-10 w-[150px]">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={experienceFilter}
              onValueChange={setExperienceFilter}
            >
              <SelectTrigger className="h-10 w-[150px]">
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Experience</SelectItem>
                <SelectItem value="fresher">Fresher</SelectItem>
                <SelectItem value="experienced">Experienced</SelectItem>
              </SelectContent>
            </Select>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-[180px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    {dateFilter === "all" && "Applied Dates"}
                    {dateFilter === "today" && "Applied: Today"}
                    {dateFilter === "last7days" && "Applied: Last 7 Days"}
                    {dateFilter === "last30days" && "Applied: Last 30 Days"}
                    {dateFilter === "custom" &&
                      customDateFrom &&
                      customDateTo &&
                      `${format(customDateFrom, "MMM dd")} - ${format(customDateTo, "MMM dd")}`}
                    {dateFilter === "custom" && (!customDateFrom || !customDateTo) && "Applied: Custom"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 space-y-2">
                  <Button
                    variant={dateFilter === "all" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setDateFilter("all");
                      setDatePickerOpen(false);
                    }}
                  >
                    All Dates
                  </Button>
                  <Button
                    variant={dateFilter === "today" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setDateFilter("today");
                      setDatePickerOpen(false);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant={dateFilter === "last7days" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setDateFilter("last7days");
                      setDatePickerOpen(false);
                    }}
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant={dateFilter === "last30days" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setDateFilter("last30days");
                      setDatePickerOpen(false);
                    }}
                  >
                    Last 30 Days
                  </Button>
                  <div className="border-t pt-2">
                    <Button
                      variant={dateFilter === "custom" ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setDatePickerOpen(false);
                        setCustomRangeDialogOpen(true);
                      }}
                    >
                      Custom Range...
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  Experience
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  {tab === "interview"
                    ? "Attendance"
                    : tab === "onboarding"
                      ? "Document Status"
                      : "Status"}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  {tab === "interview" ? "Interview Date & Time" : dateColumnLabel}
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={columnCount} className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    {fetchError ? (
                      <div className="flex flex-col items-center gap-3">
                        <span>Failed to load people. Please try again.</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void fetchPeople(
                              search,
                              page,
                              selectedRole,
                              experienceFilter,
                              dateFilter,
                              customDateFrom,
                              customDateTo
                            )
                          }
                        >
                          Retry
                        </Button>
                      </div>
                    ) : (
                      EMPTY_LABEL[tab]
                    )}
                  </td>
                </tr>
              ) : (
                candidates.map((person) => {
                  const phase = getLifecyclePhase(person);
                  return (
                    <tr
                      key={person._id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">
                          {person.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="flex items-center gap-2 hover:text-foreground transition-colors"
                                onClick={() => {
                                  void navigator.clipboard.writeText(
                                    person.email
                                  );
                                  toast.success("Email copied to clipboard");
                                }}
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{person.email}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        ****{person.phone?.slice(-4)}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {person.position}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {person.experience === 0
                          ? "Fresher"
                          : `${person.experience} ${
                              person.experience === 1 ? "year" : "years"
                            }`}
                      </td>
                      <td className="px-6 py-4">
                        {tab === "interview" ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={
                                person.interviewAttendance === "appeared"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                void handleUpdateAttendance(
                                  person,
                                  person.interviewAttendance === "appeared"
                                    ? null
                                    : "appeared"
                                )
                              }
                              className={
                                person.interviewAttendance === "appeared"
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : ""
                              }
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Appeared
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                person.interviewAttendance === "not_appeared"
                                  ? "destructive"
                                  : "outline"
                              }
                              onClick={() =>
                                void handleUpdateAttendance(
                                  person,
                                  person.interviewAttendance === "not_appeared"
                                    ? null
                                    : "not_appeared"
                                )
                              }
                            >
                              <X className="h-4 w-4 mr-1" />
                              Not Appeared
                            </Button>
                          </div>
                        ) : tab === "onboarding" ? (
                          <DocumentStatusBadge
                            status={getDocumentStatus(person.onboardingDetails)}
                          />
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className={getStatusColor(person.status)}>
                              {getStatusLabel(person.status)}
                            </Badge>
                            {phase === "exited" ? (
                              <Badge
                                variant="outline"
                                className="text-xs font-normal"
                              >
                                {EXIT_REASON_LABELS[person.exitReason || ""] ||
                                  "Exited"}
                              </Badge>
                            ) : phase === "active" ? (
                              <Badge
                                variant="outline"
                                className="text-xs font-normal border-emerald-200 bg-emerald-50 text-emerald-800"
                              >
                                Employed
                              </Badge>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td
                        className={
                          tab === "interview"
                            ? "px-6 py-4 text-sm text-foreground"
                            : "px-6 py-4 text-sm text-muted-foreground"
                        }
                      >
                        {tab === "interview" ? (
                          <InterviewScheduleCell person={person} />
                        ) : (
                          phaseDateValue(person)
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleAddNote(person)}
                                aria-label={
                                  person.notes && person.notes.length > 0
                                    ? `View ${person.notes.length} notes for ${person.name}`
                                    : `Add note for ${person.name}`
                                }
                                className={`p-2 rounded-md transition-colors ${
                                  person.notes && person.notes.length > 0
                                    ? "text-green-600 hover:bg-green-50"
                                    : "text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                <StickyNote className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {person.notes && person.notes.length > 0
                                  ? `${person.notes.length} note${
                                      person.notes.length > 1 ? "s" : ""
                                    }`
                                  : "Add note"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={`Actions for ${person.name}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/dashboard/people/${person._id}`}
                                className="flex items-center cursor-pointer"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View details
                              </Link>
                            </DropdownMenuItem>
                            {HIRING_RECORD_LINK_TABS.includes(tab) && (
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/candidatePortal/${person._id}`}
                                  className="flex items-center cursor-pointer"
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Hiring record
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {tab === "onboarding" &&
                              canCreateEmployee(person) && (
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/dashboard/candidatePortal/${person._id}`}
                                    className="flex items-center cursor-pointer"
                                  >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Create employee
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            {tab === "active" && person.employeeId && (
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/employeedetails/${person.employeeId}`}
                                  className="flex items-center cursor-pointer"
                                >
                                  <Briefcase className="mr-2 h-4 w-4" />
                                  Employee profile
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pagination.limit + 1} to{" "}
              {Math.min(page * pagination.limit, pagination.total)} of{" "}
              {pagination.total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {notesPerson && (
        <NotesModal
          open={notesDialogOpen}
          onOpenChange={(open) => {
            setNotesDialogOpen(open);
            if (!open) {
              setNotesPerson(null);
            }
          }}
          candidateId={notesPerson._id}
          candidateName={notesPerson.name}
          onUpdate={handleNotesUpdated}
        />
      )}

      {/* Reschedule Requests Modal */}
      <Dialog
        open={rescheduleModalOpen}
        onOpenChange={(open) => {
          setRescheduleModalOpen(open);
          // Refresh requests when modal opens
          if (open && canVerify) {
            void fetchPendingRescheduleRequests();
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Pending Reschedule Requests ({pendingRescheduleRequests.length})
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Review and approve or reject reschedule requests from candidates.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            {pendingRescheduleRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending reschedule requests
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRescheduleRequests.map((request, index) => (
                  <Card
                    key={`${request.candidateId}-${request.interviewType}-${index}`}
                    className="p-4 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Link
                            href={`/dashboard/people/${request.candidateId}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline"
                            onClick={() => setRescheduleModalOpen(false)}
                          >
                            {request.candidateName}
                          </Link>
                          <Badge variant="outline" className="text-xs">
                            {request.interviewType === "first"
                              ? "First Round"
                              : "Second Round"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-2">
                          {request.currentDate && request.currentTime && (
                            <div>
                              <span className="font-medium text-foreground">
                                Current Schedule:
                              </span>{" "}
                              {new Date(request.currentDate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}{" "}
                              at {request.currentTime}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-foreground">
                              Requested:
                            </span>{" "}
                            {new Date(request.requestedDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}{" "}
                            at {request.requestedTime}
                          </div>
                          {request.reason && (
                            <div>
                              <span className="font-medium text-foreground">
                                Reason:
                              </span>{" "}
                              {request.reason}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => {
                            void handleRescheduleRequest(
                              request.candidateId,
                              "approve",
                              request.interviewType
                            );
                          }}
                          disabled={processingReschedule === request.candidateId}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            void handleRescheduleRequest(
                              request.candidateId,
                              "reject",
                              request.interviewType
                            );
                          }}
                          disabled={processingReschedule === request.candidateId}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleModalOpen(false)}
              className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Date Range Dialog */}
      <Dialog open={customRangeDialogOpen} onOpenChange={setCustomRangeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Custom Date Range</DialogTitle>
            <DialogDescription>
              Choose a start and end date to filter applied candidates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <p className="text-sm font-medium mb-2">From Date</p>
              <Calendar
                mode="single"
                selected={customDateFrom}
                onSelect={(date) => {
                  setCustomDateFrom(date);
                }}
                disabled={(date) =>
                  date > new Date() || (customDateTo ? date > customDateTo : false)
                }
                className="rounded-md border"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">To Date</p>
              <Calendar
                mode="single"
                selected={customDateTo}
                onSelect={(date) => {
                  setCustomDateTo(date);
                }}
                disabled={(date) =>
                  date > new Date() || (customDateFrom ? date < customDateFrom : false)
                }
                className="rounded-md border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCustomRangeDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (customDateFrom && customDateTo) {
                  setDateFilter("custom");
                  setCustomRangeDialogOpen(false);
                }
              }}
              disabled={!customDateFrom || !customDateTo}
            >
              Apply Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
