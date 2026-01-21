"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  CheckCircle2,
  Star,
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
  DialogDescription,
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
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  isImportant?: boolean;
  interviewAttendance?: "appeared" | "not_appeared" | null;
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
  trainingAgreementDetails?: {
    signingLink?: string;
    eSign?: {
      signatureImage?: string;
      signedAt?: string;
    };
    signedPdfUrl?: string;
    agreementAccepted?: boolean;
    agreementAcceptedAt?: string;
    agreementComplete?: boolean;
    completedAt?: string;
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  // Load state from localStorage or use defaults
  const [search, setSearch] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("candidatePortalSearch") || "";
    }
    return "";
  });
  // Load page from URL search params, default to 1
  const [page, setPage] = useState<number>(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? parseInt(pageParam, 10) || 1 : 1;
  });
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(false);
  // Load activeTab from localStorage or default to "pending"
  type TabValue = "all" | "pending" | "interview" | "shortlisted" | "selected" | "rejected";
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("candidatePortalActiveTab");
      if (savedTab && ["all", "pending", "interview", "shortlisted", "selected", "rejected"].includes(savedTab)) {
        return savedTab as TabValue;
      }
    }
    return "pending";
  });
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [newRole, setNewRole] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesCandidate, setNotesCandidate] = useState<Candidate | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("candidatePortalSelectedRole") || "all";
    }
    return "all";
  });
  const [experienceFilter, setExperienceFilter] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("candidatePortalExperienceFilter") || "all";
    }
    return "all";
  });
  const [collegeFilter, setCollegeFilter] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("candidatePortalCollegeFilter") || "all";
    }
    return "all";
  });
  const [trainingDocumentFilter, setTrainingDocumentFilter] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("candidatePortalTrainingDocumentFilter") || "all";
    }
    return "all";
  });
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
  const [interviewRound, setInterviewRound] = useState<"first" | "second">("first");
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
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  
  // Track if this is the initial mount to preserve pagination
  const isInitialMount = useRef(true);
  const prevFilters = useRef({
    search: "",
    activeTab: "pending" as TabValue,
    selectedRole: "all",
    experienceFilter: "all",
    collegeFilter: "all",
  });

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
    if (!canVerify) {
      console.log("Cannot verify - user role:", userRole);
      return;
    }
    
    try {
      console.log("🔍 [Frontend] Fetching pending reschedule requests...");
      console.log("🔍 [Frontend] User role:", userRole, "Can verify:", canVerify);
      
      // Use dedicated endpoint for reschedule requests with cache-busting
      const timestamp = Date.now(); // Add timestamp to prevent caching
      const response = await fetch(`/api/candidates/reschedule-requests?t=${timestamp}`, {
        cache: "no-store", // Prevent caching issues
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      
      console.log("🔍 [Frontend] Response status:", response.status, response.statusText);
      
      if (!response.ok) {
        console.error("❌ [Frontend] API response not OK:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("❌ [Frontend] Error response body:", errorText);
        throw new Error(`API returned ${response.status}`);
      }
      
      const result = await response.json();
      console.log("🔍 [Frontend] API response:", result);
      console.log("🔍 [Frontend] Debug info:", result.debug);
      
      if (result.success && result.data) {
        console.log("✅ [Frontend] Fetched pending reschedule requests:", result.data.length, result.data);
        setPendingRescheduleRequests(result.data);
      } else {
        console.error("Failed to fetch pending reschedule requests:", result);
        // Fallback: try fetching all candidates and filtering
        try {
          console.log("Trying fallback method...");
          const fallbackResponse = await fetch("/api/candidates?status=all&limit=1000");
          const fallbackResult = await fallbackResponse.json();
          
          if (fallbackResult.success && fallbackResult.data) {
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
            
            fallbackResult.data.forEach((candidate: Candidate) => {
              const firstRoundRequest = candidate.interviewDetails?.rescheduleRequest;
              if (firstRoundRequest && firstRoundRequest.status === "pending" && candidate.interviewDetails) {
                pendingRequests.push({
                  candidateId: candidate._id,
                  candidateName: candidate.name,
                  interviewType: "first",
                  requestedDate: firstRoundRequest.requestedDate || "",
                  requestedTime: firstRoundRequest.requestedTime || "",
                  reason: firstRoundRequest.reason,
                  currentDate: candidate.interviewDetails.scheduledDate,
                  currentTime: candidate.interviewDetails.scheduledTime,
                });
              }
              
              const secondRoundRequest = candidate.secondRoundInterviewDetails?.rescheduleRequest;
              if (secondRoundRequest && secondRoundRequest.status === "pending" && candidate.secondRoundInterviewDetails) {
                pendingRequests.push({
                  candidateId: candidate._id,
                  candidateName: candidate.name,
                  interviewType: "second",
                  requestedDate: secondRoundRequest.requestedDate || "",
                  requestedTime: secondRoundRequest.requestedTime || "",
                  reason: secondRoundRequest.reason,
                  currentDate: candidate.secondRoundInterviewDetails.scheduledDate,
                  currentTime: candidate.secondRoundInterviewDetails.scheduledTime,
                });
              }
            });
            
            console.log("Fallback found requests:", pendingRequests.length, pendingRequests);
            setPendingRescheduleRequests(pendingRequests);
          } else {
            console.log("Fallback also returned no data");
            setPendingRescheduleRequests([]);
          }
        } catch (fallbackError) {
          console.error("Fallback method also failed:", fallbackError);
          setPendingRescheduleRequests([]);
        }
      }
    } catch (error) {
      console.error("Error fetching pending reschedule requests:", error);
      setPendingRescheduleRequests([]);
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
        // Refresh candidates list first
        await fetchCandidates(search, page, activeTab, selectedRole, experienceFilter, collegeFilter);
        
        // Wait a bit for database to update, then refresh pending requests
        setTimeout(async () => {
          console.log("🔄 [Frontend] Refreshing reschedule requests after action...");
          
          // Fetch updated requests and check count
          const timestamp = Date.now();
          const refreshResponse = await fetch(`/api/candidates/reschedule-requests?t=${timestamp}`, {
            cache: "no-store",
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          });
          
          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            if (refreshResult.success) {
              setPendingRescheduleRequests(refreshResult.data || []);
              console.log("✅ [Frontend] Updated count:", refreshResult.count);
              
              // Close modal if no more pending requests
              if (refreshResult.count === 0) {
                setTimeout(() => {
                  setRescheduleModalOpen(false);
                }, 200);
              }
            }
          }
          
          // Also call the regular fetch function to ensure state is synced
          await fetchPendingRescheduleRequests();
        }, 500);
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
    // On initial mount, fetch with the saved page number
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevFilters.current = {
        search,
        activeTab,
        selectedRole,
        experienceFilter,
        collegeFilter,
      };
      // Fetch with the current page (loaded from localStorage)
      fetchCandidates(search, page, activeTab, selectedRole, experienceFilter, collegeFilter);
      return;
    }

    // Check if filters actually changed
    const filtersChanged =
      prevFilters.current.search !== search ||
      prevFilters.current.activeTab !== activeTab ||
      prevFilters.current.selectedRole !== selectedRole ||
      prevFilters.current.experienceFilter !== experienceFilter ||
      prevFilters.current.collegeFilter !== collegeFilter;

    if (filtersChanged) {
      // Only reset page to 1 if filters changed
      const timer = setTimeout(() => {
        fetchCandidates(search, 1, activeTab, selectedRole, experienceFilter, collegeFilter);
        setPage(1);
        prevFilters.current = {
          search,
          activeTab,
          selectedRole,
          experienceFilter,
          collegeFilter,
        };
      }, 500);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeTab, selectedRole, experienceFilter, collegeFilter]);

  // Reset training document filter when switching away from selected tab
  useEffect(() => {
    if (activeTab !== "selected") {
      setTrainingDocumentFilter("all");
      if (typeof window !== "undefined") {
        localStorage.setItem("candidatePortalTrainingDocumentFilter", "all");
      }
    }
  }, [activeTab]);

  // Persist search to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("candidatePortalSearch", search);
    }
  }, [search]);

  // Get stable page value from URL
  const urlPage = useMemo(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? parseInt(pageParam, 10) || 1 : 1;
  }, [searchParams]);

  // Track if we're updating URL to prevent sync loop
  const isUpdatingUrl = useRef(false);
  const lastUrlPage = useRef<number | null>(null);

  // Initialize lastUrlPage on mount
  useEffect(() => {
    lastUrlPage.current = urlPage;
  }, []);

  // Update URL when page state changes (user clicks pagination)
  useEffect(() => {
    // Skip on initial mount - page is already synced from URL
    if (isInitialMount.current) {
      lastUrlPage.current = urlPage;
      return;
    }
    
    // Skip if URL already matches
    if (urlPage === page) {
      return;
    }
    
    // Mark that we're updating URL
    isUpdatingUrl.current = true;
    lastUrlPage.current = page;
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
    
    // Reset flag after a microtask to allow URL to update
    Promise.resolve().then(() => {
      isUpdatingUrl.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pathname, router]);

  // Sync page from URL only when URL changes externally (browser back/forward)
  useEffect(() => {
    // Skip if we're currently updating URL ourselves
    if (isUpdatingUrl.current) {
      return;
    }
    
    // Only sync if URL page changed externally and is different from current page
    if (lastUrlPage.current !== null && urlPage !== lastUrlPage.current && urlPage !== page) {
      setPage(urlPage);
      lastUrlPage.current = urlPage;
    }
  }, [urlPage, page]);

  // Persist selectedRole to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("candidatePortalSelectedRole", selectedRole);
    }
  }, [selectedRole]);

  // Persist experienceFilter to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("candidatePortalExperienceFilter", experienceFilter);
    }
  }, [experienceFilter]);

  // Persist collegeFilter to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("candidatePortalCollegeFilter", collegeFilter);
    }
  }, [collegeFilter]);

  // Persist trainingDocumentFilter to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("candidatePortalTrainingDocumentFilter", trainingDocumentFilter);
    }
  }, [trainingDocumentFilter]);

  useEffect(() => {
    // Skip on initial mount - the filter useEffect handles initial fetch
    if (isInitialMount.current) {
      return;
    }
    // Only fetch when page changes (user clicks pagination)
    fetchCandidates(search, page, activeTab, selectedRole, experienceFilter, collegeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
   * Includes both first round and second round interviews.
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

    // Categorize each candidate based on their interview dates
    candidates.forEach((candidate) => {
      // Check for first round interview
      const firstRoundDate = candidate.interviewDetails?.scheduledDate;
      // Check for second round interview
      const secondRoundDate = candidate.secondRoundInterviewDetails?.scheduledDate;
      
      // Use the earliest upcoming interview date, or second round if first round doesn't exist
      let interviewDate: string | undefined;
      if (firstRoundDate && secondRoundDate) {
        // If both exist, use the earlier one
        const firstDate = new Date(firstRoundDate).getTime();
        const secondDate = new Date(secondRoundDate).getTime();
        interviewDate = firstDate <= secondDate ? firstRoundDate : secondRoundDate;
      } else if (firstRoundDate) {
        interviewDate = firstRoundDate;
      } else if (secondRoundDate) {
        interviewDate = secondRoundDate;
      }

      if (interviewDate) {
        const category = categorizeInterviewDate(interviewDate);
        categorized[category].push(candidate);
      } else {
        // Candidates without scheduled dates go to past
        categorized.past.push(candidate);
      }
    });

    // Sort within each category by scheduled date (ascending for future, descending for past)
    const sortByDate = (a: Candidate, b: Candidate) => {
      const getEarliestDate = (candidate: Candidate): number => {
        const firstDate = candidate.interviewDetails?.scheduledDate 
          ? new Date(candidate.interviewDetails.scheduledDate).getTime() 
          : Infinity;
        const secondDate = candidate.secondRoundInterviewDetails?.scheduledDate 
          ? new Date(candidate.secondRoundInterviewDetails.scheduledDate).getTime() 
          : Infinity;
        return Math.min(firstDate, secondDate);
      };
      
      const dateA = getEarliestDate(a);
      const dateB = getEarliestDate(b);
      return dateA - dateB;
    };

    categorized.today.sort(sortByDate);
    categorized.tomorrow.sort(sortByDate);
    categorized.later.sort(sortByDate);
    categorized.past.sort((a, b) => {
      const getEarliestDate = (candidate: Candidate): number => {
        const firstDate = candidate.interviewDetails?.scheduledDate 
          ? new Date(candidate.interviewDetails.scheduledDate).getTime() 
        : 0;
        const secondDate = candidate.secondRoundInterviewDetails?.scheduledDate 
          ? new Date(candidate.secondRoundInterviewDetails.scheduledDate).getTime() 
        : 0;
        return Math.max(firstDate, secondDate);
      };
      
      const dateA = getEarliestDate(a);
      const dateB = getEarliestDate(b);
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
    setInterviewRound("first"); // Default to first round
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
      
      // Determine which API endpoint to use based on interview round selection
      const apiEndpoint = interviewRound === "first" 
        ? `/api/candidates/${interviewCandidate._id}/schedule-interview`
        : `/api/candidates/${interviewCandidate._id}/schedule-second-round`;
      
      const response = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate: dateString,
          scheduledTime: time24Hour,
          notes: interviewNotes || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`${interviewRound === "first" ? "First" : "Second"} round interview scheduled successfully`);
        setScheduleInterviewDialogOpen(false);
        setInterviewDate(undefined);
        setInterviewHour("4");
        setInterviewMinute("00");
        setInterviewAmPm("PM");
        setInterviewNotes("");
        setInterviewRound("first");
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

  // Toggle important status
  const handleToggleImportant = async (candidate: Candidate) => {
    try {
      const response = await fetch(`/api/candidates/${candidate._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isImportant: !candidate.isImportant }),
      });

      const result = await response.json();
      if (result.success) {
        setCandidates((prev) =>
          prev.map((c) =>
            c._id === candidate._id
              ? { ...c, isImportant: !candidate.isImportant }
              : c
          )
        );
        toast.success(
          candidate.isImportant
            ? "Removed from important candidates"
            : "Marked as important candidate"
        );
      } else {
        toast.error(result.error || "Failed to update important status");
      }
    } catch (error) {
      console.error("Error updating important status:", error);
      toast.error("Failed to update important status");
    }
  };

  // Update interview attendance
  const handleUpdateAttendance = async (
    candidate: Candidate,
    attendance: "appeared" | "not_appeared" | null
  ) => {
    try {
      const response = await fetch(`/api/candidates/${candidate._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewAttendance: attendance }),
      });

      const result = await response.json();
      if (result.success) {
        setCandidates((prev) =>
          prev.map((c) =>
            c._id === candidate._id ? { ...c, interviewAttendance: attendance } : c
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

  const CandidateTable = () => {
    // Sort interviews by date when viewing the interview tab
    let displayCandidates = activeTab === "interview" 
      ? sortInterviewsByDate(candidates)
      : candidates;

    // Filter by training document completion when viewing selected tab
    if (activeTab === "selected" && trainingDocumentFilter !== "all") {
      displayCandidates = displayCandidates.filter((candidate) => {
        const hasCompletedTraining = candidate.trainingAgreementDetails?.agreementComplete === true;
        if (trainingDocumentFilter === "completed") {
          return hasCompletedTraining;
        } else if (trainingDocumentFilter === "pending") {
          return !hasCompletedTraining;
        }
        return true;
      });
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-center text-sm font-semibold text-foreground w-12">
                <Star className="h-4 w-4 mx-auto" />
              </th>
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
                <>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Interview Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Attendance
                  </th>
                </>
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
                <td colSpan={activeTab === "interview" ? 12 : activeTab === "pending" ? 11 : 10} className="px-6 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </td>
              </tr>
            ) : displayCandidates.length === 0 ? (
              <tr>
                <td
                  colSpan={activeTab === "interview" ? 12 : activeTab === "pending" ? 11 : 10}
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
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleToggleImportant(candidate)}
                    className="transition-colors hover:scale-110"
                    title={candidate.isImportant ? "Remove from important" : "Mark as important"}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        candidate.isImportant
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground hover:text-yellow-400"
                      } transition-colors`}
                    />
                  </button>
                </td>
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
                  <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(candidate.status)}>
                    {candidate.status === "selected"
                      ? "Selected for Training"
                      : candidate.status === "interview"
                      ? "Interview"
                      : candidate?.status?.charAt(0).toUpperCase() +
                        candidate?.status?.slice(1)}
                  </Badge>
                    {candidate.status === "selected" && 
                     candidate.trainingAgreementDetails?.agreementComplete && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center">
                              <CheckCircle2 className="h-5 w-5 text-white dark:text-white" fill="green"  />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Training Agreement Signed</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </td>
                {activeTab === "interview" && (
                  <>
                    <td className="px-6 py-4 text-sm text-foreground">
                      <div className="space-y-3">
                        {/* First Round Interview */}
                        {candidate.interviewDetails?.scheduledDate && candidate.interviewDetails?.scheduledTime && (
                        <div>
                          <div className="font-medium flex items-center gap-2 flex-wrap">
                            {formatDateForDisplay(candidate.interviewDetails.scheduledDate)}
                              <Badge variant="outline" className="text-xs font-normal bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
                                First Round
                              </Badge>
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
                        </div>
                        )}

                        {/* Second Round Interview */}
                        {candidate.secondRoundInterviewDetails?.scheduledDate && candidate.secondRoundInterviewDetails?.scheduledTime && (
                          <div className={candidate.interviewDetails?.scheduledDate ? "pt-3 border-t" : ""}>
                            <div className="font-medium flex items-center gap-2 flex-wrap">
                              {formatDateForDisplay(candidate.secondRoundInterviewDetails.scheduledDate)}
                              <Badge variant="outline" className="text-xs font-normal bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
                                Second Round
                              </Badge>
                              {(() => {
                                const category = categorizeInterviewDate(candidate.secondRoundInterviewDetails.scheduledDate);
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
                              {candidate.secondRoundInterviewDetails.scheduledTime}
                            </div>
                            {candidate.secondRoundInterviewDetails.scheduledBy && (
                              <div className="text-muted-foreground text-xs mt-1">
                                Scheduled by: {candidate.secondRoundInterviewDetails.scheduledBy}
                              </div>
                            )}
                          </div>
                        )}

                        {/* No interviews scheduled */}
                        {!candidate.interviewDetails?.scheduledDate && !candidate.secondRoundInterviewDetails?.scheduledDate && (
                        <span className="text-muted-foreground">Not scheduled</span>
                      )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={
                            candidate.interviewAttendance === "appeared"
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            handleUpdateAttendance(
                              candidate,
                              candidate.interviewAttendance === "appeared"
                                ? null
                                : "appeared"
                            )
                          }
                          className={`${
                            candidate.interviewAttendance === "appeared"
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : ""
                          }`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Appeared
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            candidate.interviewAttendance === "not_appeared"
                              ? "destructive"
                              : "outline"
                          }
                          onClick={() =>
                            handleUpdateAttendance(
                              candidate,
                              candidate.interviewAttendance === "not_appeared"
                                ? null
                                : "not_appeared"
                            )
                          }
                        >
                          <X className="h-4 w-4 mr-1" />
                          Not Appeared
                        </Button>
                      </div>
                    </td>
                  </>
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

        {/* Search Bar with Reschedule Requests */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Pending Reschedule Requests Button */}
            {canVerify && (
              <Button
                variant="outline"
                onClick={() => {
                  console.log("🔄 [Frontend] Reschedule button clicked - refreshing requests...");
                  fetchPendingRescheduleRequests(); // Refresh before opening modal
                  setRescheduleModalOpen(true);
                }}
                disabled={pendingRescheduleRequests.length === 0}
                className={`shrink-0 ${
                  pendingRescheduleRequests.length > 0
                    ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-100"
                    : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 opacity-60"
                }`}
              >
                <AlertCircle className={`w-4 h-4 mr-2 ${
                  pendingRescheduleRequests.length > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-400 dark:text-gray-500"
                }`} />
                Reschedule Requests
                {pendingRescheduleRequests.length > 0 && (
                  <Badge className="ml-2 bg-amber-600 dark:bg-amber-500 text-white">
                    {pendingRescheduleRequests.length}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Tabs and Filters */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const tabValue = value as typeof activeTab;
            setActiveTab(tabValue);
            setPage(1);
            // Save to localStorage to preserve tab selection
            if (typeof window !== "undefined") {
              localStorage.setItem("candidatePortalActiveTab", tabValue);
            }
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
            <div className="flex gap-1 w-full lg:w-auto lg:max-w-2xl flex-wrap">
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
              {activeTab === "selected" && (
                <Select
                  value={trainingDocumentFilter}
                  onValueChange={setTrainingDocumentFilter}
                >
                  <SelectTrigger className="h-10 w-full lg:w-[180px]">
                    <SelectValue placeholder="Training Document" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Candidates</SelectItem>
                    <SelectItem value="completed">Completed documetation</SelectItem>
                    <SelectItem value="pending">Pending documetation</SelectItem>
                  </SelectContent>
                </Select>
              )}
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
              <Label className="text-sm font-medium mb-2 block">
                Interview Round *
              </Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setInterviewRound("first")}
                  className={`flex-1 py-2 px-3 rounded border transition ${
                    interviewRound === "first"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted text-muted-foreground hover:border-primary"
                  }`}
                >
                  First Round
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewRound("second")}
                  className={`flex-1 py-2 px-3 rounded border transition ${
                    interviewRound === "second"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted text-muted-foreground hover:border-primary"
                  }`}
                >
                  Second Round
                </button>
              </div>
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

      {/* Reschedule Requests Modal */}
      <Dialog 
        open={rescheduleModalOpen} 
        onOpenChange={(open) => {
          setRescheduleModalOpen(open);
          // Refresh requests when modal opens
          if (open && canVerify) {
            console.log("🔄 [Frontend] Modal opened - refreshing reschedule requests...");
            // Force refresh when modal opens with a small delay to ensure state is updated
            setTimeout(() => {
              fetchPendingRescheduleRequests();
            }, 100);
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
                            href={`/dashboard/candidatePortal/${request.candidateId}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline"
                            onClick={() => setRescheduleModalOpen(false)}
                          >
                            {request.candidateName}
                          </Link>
                          <Badge variant="outline" className="text-xs">
                            {request.interviewType === "first" ? "First Round" : "Second Round"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-2">
                          {request.currentDate && request.currentTime && (
                            <div>
                              <span className="font-medium text-foreground">Current Schedule:</span>{" "}
                              {new Date(request.currentDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}{" "}
                              at {request.currentTime}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-foreground">Requested Schedule:</span>{" "}
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
                            <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-amber-200 dark:border-amber-800">
                              <span className="font-medium text-foreground text-xs">Reason:</span>
                              <p className="text-xs text-muted-foreground italic mt-1">
                                &quot;{request.reason}&quot;
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => {
                            handleRescheduleRequest(request.candidateId, "approve", request.interviewType);
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
                            handleRescheduleRequest(request.candidateId, "reject", request.interviewType);
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

    </div>
  );
}
