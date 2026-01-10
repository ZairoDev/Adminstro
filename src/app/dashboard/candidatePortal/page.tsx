"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreVertical,
  UserPlus,
  Users,
  Pencil,
  FileText,
  Mail,
  Clock,
  StickyNote,
  Calendar,
  Check,
  X,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateToLocalString, isDateBeforeToday, normalizeToLocalMidnight, getTodayLocalMidnight, parseLocalDateString, formatDateForDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotesModal } from "./components/notes-modal";

interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: number;
  college?: string;
  status: "pending" | "interview" | "shortlisted" | "selected" | "rejected" | "onboarding";
  createdAt: string;
  notes?: Array<{ _id: string; content: string; createdAt: string; updatedAt: string }>;
  interviewDetails?: {
    scheduledDate?: string;
    scheduledTime?: string;
    scheduledBy?: string;
    scheduledAt?: string;
    notes?: string;
    rescheduleRequest?: {
      requestedDate?: string;
      requestedTime?: string;
      reason?: string;
      requestedAt?: string;
      status?: "pending" | "approved" | "rejected";
      reviewedBy?: string;
      reviewedAt?: string;
      token?: string;
    };
  };
  secondRoundInterviewDetails?: {
    scheduledDate?: string;
    scheduledTime?: string;
    scheduledBy?: string;
    scheduledAt?: string;
    notes?: string;
    rescheduleRequest?: {
      requestedDate?: string;
      requestedTime?: string;
      reason?: string;
      requestedAt?: string;
      status?: "pending" | "approved" | "rejected";
      reviewedBy?: string;
      reviewedAt?: string;
      token?: string;
    };
  };
}

const ROLE_OPTIONS = [
  "Developer",
  "LeadGen",
  "Sales",
  "Marketing",
  "HR",
];

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function CandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "interview" | "shortlisted" | "selected" | "rejected"
  >("pending");
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [newRole, setNewRole] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesCandidate, setNotesCandidate] = useState<Candidate | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [experienceFilter, setExperienceFilter] = useState<string>("all");
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const [availableRoles, setAvailableRoles] = useState<string[]>(ROLE_OPTIONS);
  const [availableColleges, setAvailableColleges] = useState<string[]>([]);
  const [unmaskedPhoneId, setUnmaskedPhoneId] = useState<string | null>(null);
  const [scheduleInterviewDialogOpen, setScheduleInterviewDialogOpen] = useState(false);
  const [interviewCandidate, setInterviewCandidate] = useState<Candidate | null>(null);
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(undefined);
  const [interviewHour, setInterviewHour] = useState<string>("4");
  const [interviewMinute, setInterviewMinute] = useState<string>("00");
  const [interviewAmPm, setInterviewAmPm] = useState<"AM" | "PM">("PM");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [schedulingInterview, setSchedulingInterview] = useState(false);
  const [viewedCandidates, setViewedCandidates] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<string | null>(null);
  const [processingReschedule, setProcessingReschedule] = useState<string | null>(null);
  const [pendingRescheduleRequests, setPendingRescheduleRequests] = useState<Array<{
    candidateId: string;
    candidateName: string;
    interviewType: "first" | "second";
    requestedDate: string;
    requestedTime: string;
    reason?: string;
    currentDate?: string;
    currentTime?: string;
  }>>([]);
  const [rescheduleDropdownOpen, setRescheduleDropdownOpen] = useState(false);

  // Convert 12-hour format to 24-hour format (HH:MM)
  const convertTo24Hour = (hour: string, minute: string, amPm: "AM" | "PM"): string => {
    let hour24 = parseInt(hour);
    if (amPm === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (amPm === "AM" && hour24 === 12) {
      hour24 = 0;
    }
    return `${hour24.toString().padStart(2, "0")}:${minute}`;
  };

  // Load viewed candidates from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("viewedCandidates");
    if (stored) {
      try {
        const viewedIds = JSON.parse(stored);
        setViewedCandidates(new Set(viewedIds));
      } catch (error) {
        console.error("Error loading viewed candidates:", error);
      }
    }
  }, []);

  // Check if a candidate is new (pending status, created within last 7 days and not viewed)
  const isNewCandidate = (candidate: Candidate): boolean => {
    // Only highlight pending candidates
    if (candidate.status !== "pending") {
      return false;
    }
    
    const createdAt = new Date(candidate.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const isRecentlyCreated = createdAt >= sevenDaysAgo;
    const hasNotBeenViewed = !viewedCandidates.has(candidate._id);
    
    return isRecentlyCreated && hasNotBeenViewed;
  };

  // Mark candidate as viewed
  const markAsViewed = (candidateId: string) => {
    const updated = new Set(viewedCandidates);
    updated.add(candidateId);
    setViewedCandidates(updated);
    localStorage.setItem("viewedCandidates", JSON.stringify(Array.from(updated)));
  };

  // Handle view details click
  const handleViewDetails = (candidate: Candidate) => {
    markAsViewed(candidate._id);
    router.push(`candidatePortal/${candidate._id}`);
  };

  useEffect(() => {
    // Fetch available roles from API
    const fetchRoles = async () => {
      try {
        const response = await fetch("/api/candidates/positions");
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          setAvailableRoles(result.data);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    };
    
    // Fetch available colleges from API
    const fetchColleges = async () => {
      try {
        const response = await fetch("/api/candidates/colleges");
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          setAvailableColleges(result.data);
        }
      } catch (error) {
        console.error("Error fetching colleges:", error);
      }
    };
    
    fetchRoles();
    fetchColleges();
  }, []);

  // Fetch user role
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/user/getloggedinuser");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUserRole(data.user.role);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const canVerify = userRole === "HR" || userRole === "SuperAdmin";

  // Fetch pending reschedule requests when user role is available
  useEffect(() => {
    if (canVerify) {
      fetchPendingRescheduleRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canVerify]);

  // Refresh pending requests when candidates are fetched
  useEffect(() => {
    if (canVerify && candidates.length > 0) {
      fetchPendingRescheduleRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, canVerify]);

  // Fetch pending reschedule requests
  const fetchPendingRescheduleRequests = async () => {
    if (!canVerify) return;
    
    try {
      const response = await fetch("/api/candidates?status=interview&limit=1000");
      const result = await response.json();
      
      if (result.success && result.data) {
        const pendingRequests: Array<{
          candidateId: string;
          candidateName: string;
          interviewType: "first" | "second";
          requestedDate: string;
          requestedTime: string;
          reason?: string;
          currentDate?: string;
          currentTime?: string;
        }> = [];
        
        result.data.forEach((candidate: Candidate) => {
          // Check first round interview reschedule request
          if (candidate.interviewDetails?.rescheduleRequest?.status === "pending") {
            pendingRequests.push({
              candidateId: candidate._id,
              candidateName: candidate.name,
              interviewType: "first",
              requestedDate: candidate.interviewDetails.rescheduleRequest.requestedDate || "",
              requestedTime: candidate.interviewDetails.rescheduleRequest.requestedTime || "",
              reason: candidate.interviewDetails.rescheduleRequest.reason,
              currentDate: candidate.interviewDetails.scheduledDate,
              currentTime: candidate.interviewDetails.scheduledTime,
            });
          }
          
          // Check second round interview reschedule request
          if (candidate.secondRoundInterviewDetails?.rescheduleRequest?.status === "pending") {
            pendingRequests.push({
              candidateId: candidate._id,
              candidateName: candidate.name,
              interviewType: "second",
              requestedDate: candidate.secondRoundInterviewDetails.rescheduleRequest.requestedDate || "",
              requestedTime: candidate.secondRoundInterviewDetails.rescheduleRequest.requestedTime || "",
              reason: candidate.secondRoundInterviewDetails.rescheduleRequest.reason,
              currentDate: candidate.secondRoundInterviewDetails.scheduledDate,
              currentTime: candidate.secondRoundInterviewDetails.scheduledTime,
            });
          }
        });
        
        setPendingRescheduleRequests(pendingRequests);
      }
    } catch (error) {
      console.error("Error fetching pending reschedule requests:", error);
    }
  };

  // Handle reschedule request approval/rejection
  const handleRescheduleRequest = async (
    candidateId: string,
    action: "approve" | "reject",
    interviewType: "first" | "second"
  ) => {
    setProcessingReschedule(candidateId);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/approve-reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          interviewType,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(
          action === "approve"
            ? "Reschedule request approved successfully"
            : "Reschedule request rejected"
        );
        // Refresh candidates list and pending requests
        await fetchCandidates(search, page, activeTab, selectedRole, experienceFilter, collegeFilter);
        await fetchPendingRescheduleRequests();
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

  const fetchCandidates = async (
    searchTerm: string,
    pageNum: number,
    statusFilter?: string,
    roleFilter?: string,
    expFilter?: string,
    collegeFilterParam?: string
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
      });
      if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (roleFilter && roleFilter !== "all") {
        params.append("position", roleFilter);
      }
      if (expFilter && expFilter !== "all") {
        params.append("experienceFilter", expFilter);
      }
      if (collegeFilterParam && collegeFilterParam !== "all") {
        params.append("college", collegeFilterParam);
      }

      const response = await fetch(`/api/candidates?${params}`);
      const result = await response.json();

      if (result.success) {
        setCandidates(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCandidates(search, 1, activeTab, selectedRole, experienceFilter, collegeFilter);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, activeTab, selectedRole, experienceFilter, collegeFilter]);

  useEffect(() => {
    fetchCandidates(search, page, activeTab, selectedRole, experienceFilter, collegeFilter);
  }, [page]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "selected":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "shortlisted":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "interview":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    }
  };

  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr} ${timeStr}`;
  };

   /**
   * Categorizes an interview date into one of four groups: Today, Tomorrow, Later, or Past.
   * Uses timezone-safe local date comparisons to prevent date-shift errors.
   * 
   * @param scheduledDate - Date object or ISO string from database (stored as UTC)
   * @returns Category string: "today" | "tomorrow" | "later" | "past"
   */
   const categorizeInterviewDate = (scheduledDate: Date | string | undefined | null): "today" | "tomorrow" | "later" | "past" => {
    if (!scheduledDate) return "past";
    
    try {
      let normalizedInterviewDate: Date;
      
      if (typeof scheduledDate === "string") {
        // If it's a YYYY-MM-DD string, parse as local date
        if (/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
          normalizedInterviewDate = parseLocalDateString(scheduledDate);
        } else {
          // ISO string from database (e.g., "2025-01-15T00:00:00.000Z" or "2025-01-14T18:30:00.000Z")
          // Parse the ISO string to get a Date object, then use LOCAL date components
          // This is critical: MongoDB stores dates as UTC, but we want to compare calendar dates
          // in the user's local timezone. When a date was stored as "2025-01-15 00:00:00 IST",
          // MongoDB converts it to UTC (e.g., "2025-01-14T18:30:00.000Z"). When we parse this
          // and use LOCAL date methods (getFullYear, getMonth, getDate), we get back the
          // original calendar date "2025-01-15".
          const dateObj = new Date(scheduledDate);
          // Use LOCAL date components to reconstruct the calendar date
          const year = dateObj.getFullYear();
          const month = dateObj.getMonth();
          const day = dateObj.getDate();
          normalizedInterviewDate = new Date(year, month, day, 0, 0, 0, 0);
        }
      } else {
        // Date object - normalize to local midnight using local date components
        normalizedInterviewDate = normalizeToLocalMidnight(scheduledDate);
      }
      
      // Get today and tomorrow at local midnight
      const today = getTodayLocalMidnight();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowNormalized = normalizeToLocalMidnight(tomorrow);
      
      // Compare normalized dates
      const interviewTime = normalizedInterviewDate.getTime();
      const todayTime = today.getTime();
      const tomorrowTime = tomorrowNormalized.getTime();
      
      if (interviewTime === todayTime) {
        return "today";
      } else if (interviewTime === tomorrowTime) {
        return "tomorrow";
      } else if (interviewTime < todayTime) {
        return "past";
      } else {
        return "later";
      }
    } catch (error) {
      console.error("Error categorizing interview date:", error, scheduledDate);
      return "past";
    }
  };

  /**
   * Groups and sorts candidates with interviews into four categories:
   * Today, Tomorrow, Later, and Past (in that order).
   * 
   * @param candidates - Array of candidates to sort
   * @returns Sorted array with interviews grouped by date category
   */
  const sortInterviewsByDate = (candidates: Candidate[]): Candidate[] => {
    const categorized = {
      today: [] as Candidate[],
      tomorrow: [] as Candidate[],
      later: [] as Candidate[],
      past: [] as Candidate[],
    };

    // Categorize each candidate
    candidates.forEach((candidate) => {
      if (candidate.interviewDetails?.scheduledDate) {
        const category = categorizeInterviewDate(candidate.interviewDetails.scheduledDate);
        categorized[category].push(candidate);
      } else {
        // Candidates without scheduled dates go to past
        categorized.past.push(candidate);
      }
    });

    // Sort within each category by scheduled date (ascending for future, descending for past)
    const sortByDate = (a: Candidate, b: Candidate) => {
      const dateA = a.interviewDetails?.scheduledDate 
        ? new Date(a.interviewDetails.scheduledDate).getTime() 
        : 0;
      const dateB = b.interviewDetails?.scheduledDate 
        ? new Date(b.interviewDetails.scheduledDate).getTime() 
        : 0;
      return dateA - dateB;
    };

    categorized.today.sort(sortByDate);
    categorized.tomorrow.sort(sortByDate);
    categorized.later.sort(sortByDate);
    categorized.past.sort((a, b) => {
      const dateA = a.interviewDetails?.scheduledDate 
        ? new Date(a.interviewDetails.scheduledDate).getTime() 
        : 0;
      const dateB = b.interviewDetails?.scheduledDate 
        ? new Date(b.interviewDetails.scheduledDate).getTime() 
        : 0;
      return dateB - dateA; // Descending for past dates
    });

    // Return in the required order: Today → Tomorrow → Later → Past
    return [
      ...categorized.today,
      ...categorized.tomorrow,
      ...categorized.later,
      ...categorized.past,
    ];
  };


  const handleCreateEmployee = (candidateId: string) => {
    // Navigate to employee creation page with candidate ID
    router.push(`/employees/create?candidateId=${candidateId}`);
  };

  const handleEditRole = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setNewRole(candidate.position);
    setEditRoleDialogOpen(true);
  };

  const handleAddNote = (candidate: Candidate) => {
    setNotesCandidate(candidate);
    setNotesDialogOpen(true);
  };

  const handlePhoneClick = (candidateId: string) => {
    if (unmaskedPhoneId === candidateId) {
      // If clicking the same phone, mask it again
      setUnmaskedPhoneId(null);
    } else {
      // Unmask the clicked phone and mask any previously unmasked phone
      setUnmaskedPhoneId(candidateId);
    }
  };

  const maskPhone = (phone: string) => {
    if (!phone) return "****";
    return `****${phone.slice(-4)}`;
  };

  const handleScheduleInterviewClick = (candidate: Candidate) => {
    if (candidate.status !== "pending") {
      toast.error("Only pending candidates can be scheduled for interview");
      return;
    }
    setInterviewCandidate(candidate);
    setInterviewDate(undefined);
    setInterviewHour("4");
    setInterviewMinute("00");
    setInterviewAmPm("PM");
    setInterviewNotes("");
    setScheduleInterviewDialogOpen(true);
  };

  const handleScheduleInterview = async () => {
    if (!interviewCandidate || !interviewDate) {
      toast.error("Please select both date and time");
      return;
    }

    setSchedulingInterview(true);
    try {
      // Use local date components to prevent timezone shifts
      // This ensures the selected calendar date is preserved exactly as chosen
      const dateString = formatDateToLocalString(interviewDate);
      const time24Hour = convertTo24Hour(interviewHour, interviewMinute, interviewAmPm);
      
      const response = await fetch(
        `/api/candidates/${interviewCandidate._id}/schedule-interview`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledDate: dateString,
            scheduledTime: time24Hour,
            notes: interviewNotes || undefined,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success("Interview scheduled successfully");
        setScheduleInterviewDialogOpen(false);
        setInterviewDate(undefined);
        setInterviewHour("4");
        setInterviewMinute("00");
        setInterviewAmPm("PM");
        setInterviewNotes("");
        setInterviewCandidate(null);
        // Refresh candidates list
        await fetchCandidates(search, page, activeTab, selectedRole, experienceFilter);
      } else {
        toast.error(result.error || "Failed to schedule interview");
      }
    } catch (error) {
      console.error("Error scheduling interview:", error);
      toast.error("Failed to schedule interview");
    } finally {
      setSchedulingInterview(false);
    }
  };


  const handleUpdateRole = async () => {
    if (!selectedCandidate || !newRole) return;

    setUpdatingRole(true);
    try {
      const response = await fetch(`/api/candidates/${selectedCandidate._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: newRole }),
      });

      const result = await response.json();
      if (result.success) {
        setCandidates((prev) =>
          prev.map((c) =>
            c._id === selectedCandidate._id ? { ...c, position: newRole } : c
          )
        );
        toast.success("Role updated successfully");
        setEditRoleDialogOpen(false);
      } else {
        toast.error(result.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setUpdatingRole(false);
    }
  };

  const CandidateTable = () => {
    // Sort interviews by date when viewing the interview tab
    const displayCandidates = activeTab === "interview" 
      ? sortInterviewsByDate(candidates)
      : candidates;

    return (
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
                Status
              </th>
              {activeTab === "interview" && (
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  Interview Date & Time
                </th>
              )}
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Applied
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">
                Notes
              </th>
              {activeTab === "pending" && (
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                  Schedule Interview
                </th>
              )}
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Actions

              </th>
            
            
            </tr>
            </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={activeTab === "interview" ? 10 : activeTab === "pending" ? 10 : 9} className="px-6 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </td>
              </tr>
            ) : displayCandidates.length === 0 ? (
              <tr>
                <td
                  colSpan={activeTab === "interview" ? 10 : activeTab === "pending" ? 10 : 9}
                  className="px-6 py-8 text-center text-muted-foreground"
                >
                  No candidates found
                </td>
              </tr>
            ) : (
              displayCandidates.map((candidate: Candidate) => {
              const isNew = isNewCandidate(candidate);
              return (
              <tr
                key={candidate._id}
                className={`transition-colors ${
                  isNew
                    ? "bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-l-blue-500 hover:bg-blue-100/50 dark:hover:bg-blue-950/30"
                    : "hover:bg-muted/50"
                }`}
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground">
                    {candidate.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex items-center gap-2 hover:text-foreground transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(candidate.email);
                            toast.success("Email copied to clipboard");
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{candidate.email}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                <button
                    onClick={() => handlePhoneClick(candidate._id)}
                    className="hover:text-foreground transition-colors cursor-pointer"
                    title={unmaskedPhoneId === candidate._id ? "Click to mask" : "Click to reveal"}
                  >
                    {unmaskedPhoneId === candidate._id
                      ? candidate.phone || "N/A"
                      : maskPhone(candidate.phone || "")}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-foreground">
                    {candidate.position}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-foreground">
                    {candidate.experience === 0
                      ? "Fresher"
                      : `${candidate.experience} ${candidate.experience === 1 ? "year" : "years"}`}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge className={getStatusColor(candidate.status)}>
                    {candidate.status === "selected"
                      ? "Selected for Training"
                      : candidate.status === "interview"
                      ? "Interview"
                      : candidate?.status?.charAt(0).toUpperCase() +
                        candidate?.status?.slice(1)}
                  </Badge>
                </td>
                {activeTab === "interview" && (
                  <td className="px-6 py-4 text-sm text-foreground">
                    {candidate.interviewDetails?.scheduledDate && candidate.interviewDetails?.scheduledTime ? (
                      <div>
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          {formatDateForDisplay(candidate.interviewDetails.scheduledDate)}
                          {(() => {
                            const category = categorizeInterviewDate(candidate.interviewDetails.scheduledDate);
                            if (category === "today") {
                              return (
                                <Badge variant="outline" className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                  Today
                                </Badge>
                              );
                            } else if (category === "tomorrow") {
                              return (
                                <Badge variant="outline" className="text-xs font-normal bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                                  Tomorrow
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {candidate.interviewDetails.scheduledTime}
                        </div>
                        {candidate.interviewDetails.scheduledBy && (
                          <div className="text-muted-foreground text-xs mt-1">
                            Scheduled by: {candidate.interviewDetails.scheduledBy}
                          </div>
                        )}
                        {/* Reschedule Request */}
                        {candidate.interviewDetails.rescheduleRequest?.status === "pending" && (
                          <div className="mt-2 pt-2 border-t">
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 mb-2">
                              Reschedule Request
                            </Badge>
                            <div className="text-xs text-muted-foreground mb-2">
                              <div>Requested: {candidate.interviewDetails.rescheduleRequest.requestedDate 
                                ? new Date(candidate.interviewDetails.rescheduleRequest.requestedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                : "N/A"} at {candidate.interviewDetails.rescheduleRequest.requestedTime || "N/A"}</div>
                              {candidate.interviewDetails.rescheduleRequest.reason && (
                                <div className="mt-1 italic">&quot;{candidate.interviewDetails.rescheduleRequest.reason}&quot;</div>
                              )}
                            </div>
                            {canVerify && (
                              <div className="flex gap-1 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                  onClick={() => handleRescheduleRequest(candidate._id, "approve", "first")}
                                  disabled={processingReschedule === candidate._id}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                  onClick={() => handleRescheduleRequest(candidate._id, "reject", "first")}
                                  disabled={processingReschedule === candidate._id}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not scheduled</span>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {formatDate(candidate.createdAt)}
                </td>
                <td className="px-6 py-4 text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleAddNote(candidate)}
                          className={`p-2 rounded-md transition-colors ${
                            candidate.notes && candidate.notes.length > 0
                              ? "text-green-600 hover:bg-green-50"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <StickyNote className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {candidate.notes && candidate.notes.length > 0
                            ? `${candidate.notes.length} note${candidate.notes.length > 1 ? "s" : ""}`
                            : "Add note"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                {activeTab === "pending" && (
                  <td className="px-6 py-4">
                    <Button
                      onClick={() => handleScheduleInterviewClick(candidate)}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Schedule Interview
                    </Button>
                  </td>
                )}

                <td className="px-6 py-4">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                      <DropdownMenuItem
                          onClick={() => handleViewDetails(candidate)}
                          className="flex items-center cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEditRole(candidate)}
                          className="flex items-center cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Role
                        </DropdownMenuItem>
                        {candidate.status === "selected" && (
                          <DropdownMenuItem
                            onClick={() => handleCreateEmployee(candidate._id)}
                            className="flex items-center cursor-pointer"
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Create Employee
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
  );
};

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Candidates
          </h1>
          <p className="text-muted-foreground">
            Manage and review job applications
          </p>
        </div>

        {/* Pending Reschedule Requests Banner */}
        {canVerify && pendingRescheduleRequests.length > 0 && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Pending Reschedule Requests ({pendingRescheduleRequests.length})
                  </h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRescheduleDropdownOpen(!rescheduleDropdownOpen)}
                  className="border-amber-300 dark:border-amber-700"
                >
                  {rescheduleDropdownOpen ? "Hide" : "Show"} Requests
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${rescheduleDropdownOpen ? "rotate-180" : ""}`} />
                </Button>
              </div>
              
              {rescheduleDropdownOpen && (
                <div className="space-y-3 mt-4">
                  {pendingRescheduleRequests.map((request, index) => (
                    <div
                      key={`${request.candidateId}-${request.interviewType}-${index}`}
                      className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Link
                              href={`/dashboard/candidatePortal/${request.candidateId}`}
                              className="font-semibold text-foreground hover:text-primary hover:underline"
                            >
                              {request.candidateName}
                            </Link>
                            <Badge variant="outline" className="text-xs">
                              {request.interviewType === "first" ? "First Round" : "Second Round"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {request.currentDate && request.currentTime && (
                              <div>
                                <span className="font-medium">Current:</span>{" "}
                                {new Date(request.currentDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}{" "}
                                at {request.currentTime}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Requested:</span>{" "}
                              {request.requestedDate
                                ? new Date(request.requestedDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "N/A"}{" "}
                              at {request.requestedTime || "N/A"}
                            </div>
                            {request.reason && (
                              <div className="mt-1 italic text-xs">
                                &quot;{request.reason}&quot;
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleRescheduleRequest(request.candidateId, "approve", request.interviewType)}
                            disabled={processingReschedule === request.candidateId}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRescheduleRequest(request.candidateId, "reject", request.interviewType)}
                            disabled={processingReschedule === request.candidateId}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Search Bar */}
        <Card className="mb-6 p-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Tabs and Filters */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as typeof activeTab);
            setPage(1);
          }}
          className="w-full"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            <TabsList className="flex flex-wrap h-auto p-1 gap-1">
              <TabsTrigger value="all" className="flex items-center gap-1.5 px-3 py-1.5">
                <Users className="h-4 w-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-1.5 px-3 py-1.5">
                <Clock className="h-4 w-4" />
                Pending
              </TabsTrigger>
              <TabsTrigger value="interview" className="flex items-center gap-1.5 px-3 py-1.5">
                <Calendar className="h-4 w-4" />
                Interviews
              </TabsTrigger>
              <TabsTrigger value="shortlisted" className="px-3 py-1.5">
                Shortlisted
              </TabsTrigger>
              <TabsTrigger value="selected" className="px-3 py-1.5">
                Selected for Training
              </TabsTrigger>
              <TabsTrigger value="rejected" className="px-3 py-1.5">
                Rejected
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2 w-full lg:w-auto lg:max-w-2xl flex-wrap">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-10 w-full lg:w-[150px]">
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
                <SelectTrigger className="h-10 w-full lg:w-[150px]">
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Experience</SelectItem>
                  <SelectItem value="fresher">Fresher</SelectItem>
                  <SelectItem value="experienced">Experienced</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={collegeFilter}
                onValueChange={setCollegeFilter}
              >
                <SelectTrigger className="h-10 w-full lg:w-[180px]">
                  <SelectValue placeholder="Filter by College" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Colleges</SelectItem>
                  {availableColleges.map((college) => (
                    <SelectItem key={college} value={college}>
                      {college}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="overflow-hidden">
            <TabsContent value="all" className="m-0">
              <CandidateTable />
            </TabsContent>
            <TabsContent value="pending" className="m-0">
              <CandidateTable />
            </TabsContent>
            <TabsContent value="interview" className="m-0">
              <CandidateTable />
            </TabsContent>
            <TabsContent value="shortlisted" className="m-0">
              <CandidateTable />
            </TabsContent>
            <TabsContent value="selected" className="m-0">
              <CandidateTable />
            </TabsContent>
            <TabsContent value="rejected" className="m-0">
              <CandidateTable />
            </TabsContent>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total}{" "}
                  {activeTab === "selected"
                    ? "selected for training"
                    : activeTab !== "all"
                    ? activeTab
                    : ""}{" "}
                  candidates
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }).map(
                      (_, i) => {
                        let pageNum;
                        if (pagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= pagination.pages - 2) {
                          pageNum = pagination.pages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className="w-8"
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                    )}
                    {pagination.pages > 5 && page < pagination.pages - 2 && (
                      <>
                        <span className="px-2">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(pagination.pages)}
                          className="w-8"
                        >
                          {pagination.pages}
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.pages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Tabs>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Role for {selectedCandidate?.name}
            </label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {/* Include current role if not in options */}
                {selectedCandidate?.position &&
                  !ROLE_OPTIONS.includes(selectedCandidate.position) && (
                    <SelectItem value={selectedCandidate.position}>
                      {selectedCandidate.position} (Current)
                    </SelectItem>
                  )}
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditRoleDialogOpen(false)}
              disabled={updatingRole}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={updatingRole}>
              {updatingRole ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Modal */}
      {notesCandidate && (
        <NotesModal
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
          candidateId={notesCandidate._id}
          candidateName={notesCandidate.name}
          onUpdate={() => {
            // Refresh candidates list to update notes indicator
            fetchCandidates(search, page, activeTab, selectedRole, experienceFilter, collegeFilter);
          }}
        />
      )}

       {/* Schedule Interview Dialog */}
       <Dialog open={scheduleInterviewDialogOpen} onOpenChange={setScheduleInterviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Candidate: {interviewCandidate?.name}
              </Label>
            </div>
            <div>
              <Label htmlFor="interview-date" className="text-sm font-medium mb-2 block">
                Interview Date *
              </Label>
              <div className="border rounded-md">
                <CalendarComponent
                  mode="single"
                  selected={interviewDate}
                  onSelect={setInterviewDate}
                  disabled={(date) => isDateBeforeToday(date)}
                  className="rounded-md"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Interview Time *
              </Label>
              <div className="flex items-center gap-2">
                <Select value={interviewHour} onValueChange={setInterviewHour}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={interviewMinute} onValueChange={setInterviewMinute}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Minute" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="00">00</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={interviewAmPm} onValueChange={(value: "AM" | "PM") => setInterviewAmPm(value)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="AM/PM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="interview-notes" className="text-sm font-medium mb-2 block">
                Notes (Optional)
              </Label>
              <Textarea
                id="interview-notes"
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                placeholder="Add any additional notes about the interview..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleInterviewDialogOpen(false)}
              disabled={schedulingInterview}
            >
              Cancel
            </Button>
            <Button onClick={handleScheduleInterview} disabled={schedulingInterview}>
              {schedulingInterview ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
