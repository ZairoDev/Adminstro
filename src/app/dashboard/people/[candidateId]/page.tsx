"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CalendarRange,
  FileText,
  UserPlus,
  LogOut,
  Pencil,
  StickyNote,
  AlertTriangle,
  Trophy,
  Target,
  Plus,
  Trash2,
  Mail,
  MailCheck,
  MailX,
  Clock,
  Building2,
  UserCheck,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Award,
  Star,
  Loader2,
} from "lucide-react";
import axios from "@/util/axios";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/AuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Loader from "@/components/loader";
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";
import { CandidateHeader } from "@/app/dashboard/candidatePortal/[id]/components/CandidateHeader";
import { useCandidate } from "@/app/dashboard/candidatePortal/[id]/hooks/useCandidate";
import { OnboardingDetailsView } from "@/app/dashboard/candidatePortal/components/onboarding-details-view";
import { NotesModal } from "@/app/dashboard/candidatePortal/components/notes-modal";
import { CreateEmployeeDialog } from "@/app/dashboard/candidatePortal/components/createEmployee";
import type { CandidateLite } from "@/app/dashboard/candidatePortal/components/new-user";
import { SeparatePersonDialog } from "@/features/people/components/SeparatePersonDialog";
import { LifecycleBadge } from "@/features/people/components/LifecycleBadge";
import { usePersonPermissions } from "@/features/people/hooks/usePersonPermissions";

import { OfficeDetailsDialog } from "@/features/people/components/OfficeDetailsDialog";
import {
  hiringWorkspacePath,
  parsePersonTab,
  peopleListPath,
  personPath,
  readRememberedPeopleListUrl,
  safeDashboardPath,
  type PersonTab,
} from "@/features/people/navigation";
import type { Candidate } from "@/app/dashboard/candidatePortal/[id]/types";
import type {
  AppreciationRecord,
  AppreciationType,
  EmployeeInterface,
  PIPRecord,
  PIPLevel,
  WarningRecord,
  WarningType,
} from "@/util/type";

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

// Motion animation variants for status toggles
const statusVariants = {
  inactive: { x: 3 },
  active: { x: 48 },
};

// Warning type labels and colors
const WARNING_TYPE_CONFIG: Record<
  WarningType,
  { label: string; color: string; icon: string }
> = {
  disciplineIssue: {
    label: "Discipline Issue",
    color: "bg-red-500/10 text-red-600 border-red-500/30",
    icon: "🚫",
  },
  lateAttendance: {
    label: "Late Attendance",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    icon: "⏰",
  },
  unplannedLeaves: {
    label: "Unplanned Leaves",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: "📅",
  },
  poshWarning: {
    label: "POSH Warning",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    icon: "⚠️",
  },
  combinedWarning: {
    label: "Combined Warning",
    color: "bg-red-700/10 text-red-700 border-red-700/30",
    icon: "🔴",
  },
};

// PIP level labels and colors
const PIP_LEVEL_CONFIG: Record<
  PIPLevel,
  { label: string; shortLabel: string; color: string; icon: string }
> = {
  forTrainees: {
    label: "For Trainees",
    shortLabel: "For Trainees",
    color: "bg-green-500/10 text-green-600 border-green-500/30",
    icon: "📘",
  },
  level1: {
    label: "Level 1 - Supportive Guidance",
    shortLabel: "Level 1",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: "📘",
  },
  level2: {
    label: "Level 2 - Strict Monitoring",
    shortLabel: "Level 2",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    icon: "📙",
  },
  level3: {
    label: "Level 3 - Final Warning",
    shortLabel: "Level 3",
    color: "bg-red-500/10 text-red-600 border-red-500/30",
    icon: "📕",
  },
};

const PIP_STATUS_CONFIG = {
  active: { label: "Active", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-600 border-red-500/30" },
};

// Appreciation type labels and colors
const APPRECIATION_TYPE_CONFIG: Record<
  AppreciationType,
  { label: string; color: string; icon: string }
> = {
  outstandingContribution: {
    label: "Outstanding Contribution",
    color: "bg-green-500/10 text-green-600 border-green-500/30",
    icon: "🌟",
  },
  outstandingAchievement: {
    label: "Outstanding Achievement",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    icon: "🏆",
  },
  excellentAttendance: {
    label: "Excellent Attendance",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: "⭐",
  },
};

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const paramReturnTo = searchParams.get("returnTo");
  const [backHref, setBackHref] = useState(() =>
    safeDashboardPath(paramReturnTo, peopleListPath())
  );
  const urlTab = parsePersonTab(searchParams.get("tab"));
  const [tab, setTabState] = useState<PersonTab>(urlTab ?? "overview");
  const [employee, setEmployee] = useState<EmployeeInterface | null>(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [createEmployeeOpen, setCreateEmployeeOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    setBackHref(
      safeDashboardPath(
        paramReturnTo ?? readRememberedPeopleListUrl(),
        peopleListPath()
      )
    );
  }, [paramReturnTo]);

  useEffect(() => {
    if (urlTab && urlTab !== tab) {
      setTabState(urlTab);
    }
  }, [urlTab, tab]);

  const setTab = (value: PersonTab) => {
    setTabState(value);
    const paramsNext = new URLSearchParams(searchParams.toString());
    if (value === "overview") {
      paramsNext.delete("tab");
    } else {
      paramsNext.set("tab", value);
    }
    const qs = paramsNext.toString();
    router.replace(
      qs
        ? `/dashboard/people/${candidateId}?${qs}`
        : `/dashboard/people/${candidateId}`,
      { scroll: false }
    );
  };

  const personHref = personPath(candidateId, {
    returnTo: backHref,
    tab: tab === "overview" ? undefined : tab,
  });
  const hiringHref = hiringWorkspacePath(candidateId, { returnTo: personHref });
  const offerLetterHref = hiringWorkspacePath(candidateId, {
    subpath: "offer-letter",
    returnTo: hiringHref,
  });
  const onboardingHref = hiringWorkspacePath(candidateId, {
    subpath: "onboarding",
    returnTo: hiringHref,
  });
  const trainingAgreementHref = hiringWorkspacePath(candidateId, {
    subpath: "training-agreement",
    returnTo: hiringHref,
  });

  const linkedEmployeeId = toEmployeeId(person?.employeeId);
  const showPipeline = phase === "applicant" || phase === "onboarding";
  const showDocuments = phase === "onboarding" || phase === "active" || phase === "exited";
  const showEmployment = Boolean(linkedEmployeeId);
  const showPerformance = phase === "active" && Boolean(linkedEmployeeId);

  // Active/Featured toggles
  const [isActive, setIsActive] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  // Warning state
  const [warnings, setWarnings] = useState<WarningRecord[]>([]);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [sendingWarning, setSendingWarning] = useState(false);
  const [deletingWarningId, setDeletingWarningId] = useState<string | null>(null);
  const [newWarning, setNewWarning] = useState({
    warningType: "" as WarningType | "",
    department: "",
    reportingManager: "",
    date: "",
    notes: "",
    sendEmail: true,
  });

  // PIP state
  const [pips, setPips] = useState<PIPRecord[]>([]);
  const [pipDialogOpen, setPipDialogOpen] = useState(false);
  const [sendingPIP, setSendingPIP] = useState(false);
  const [deletingPIPId, setDeletingPIPId] = useState<string | null>(null);
  const [newPIP, setNewPIP] = useState({
    pipLevel: "" as PIPLevel | "",
    startDate: "",
    endDate: "",
    concerns: [""],
    notes: "",
    sendEmail: true,
  });

  // Appreciation state
  const [appreciations, setAppreciations] = useState<AppreciationRecord[]>([]);
  const [appreciationDialogOpen, setAppreciationDialogOpen] = useState(false);
  const [sendingAppreciation, setSendingAppreciation] = useState(false);
  const [deletingAppreciationId, setDeletingAppreciationId] = useState<string | null>(null);
  const [newAppreciation, setNewAppreciation] = useState({
    appreciationType: "" as AppreciationType | "",
    notes: "",
    sendEmail: true,
  });

  // Email preview state
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreviewSubject, setEmailPreviewSubject] = useState("");
  const [emailPreviewHtml, setEmailPreviewHtml] = useState("");
  const [emailPreviewType, setEmailPreviewType] = useState<"warning" | "pip" | "appreciation" | "separation" | "pipCompletion" | null>(null);
  const [emailPreviewPayload, setEmailPreviewPayload] = useState<any>(null);

  // PIP action state
  const [pendingPIPAction, setPendingPIPAction] = useState<{
    pipId: string;
    action: "completed" | "failed" | "nextLevel";
    pip: PIPRecord;
  } | null>(null);

  // Separation state
  const [separationDialogOpen, setSeparationDialogOpen] = useState(false);
  const [officeDetailsDialogOpen, setOfficeDetailsDialogOpen] = useState(false);
  const [separationType, setSeparationType] = useState<"terminated" | "suspended" | "abscond" | "resigned" | "">("");
  const [separationReason, setSeparationReason] = useState("");
  const [separationDate, setSeparationDate] = useState("");
  const [sendSeparationEmail, setSendSeparationEmail] = useState(true);
  const [processingSeparation, setProcessingSeparation] = useState(false);
  const [separationEmailDialogOpen, setSeparationEmailDialogOpen] = useState(false);

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
        const employeeData = response.data?.data ?? null;
        setEmployee(employeeData);
        
        // Populate performance management data
        if (employeeData) {
          setIsActive(employeeData.isActive ?? false);
          setIsFeatured(employeeData.isfeatured ?? false);
          setWarnings(employeeData.warnings || []);
          setPips(employeeData.pips || []);
          setAppreciations(employeeData.appreciations || []);
        }
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

  // Helper function to reload employee data after updates
  const reloadEmployee = async () => {
    if (!linkedEmployeeId) return;
    try {
      const response = await axios.post("/api/employee/getEmployeeDetails", {
        userId: linkedEmployeeId,
      });
      const employeeData = response.data?.data ?? null;
      setEmployee(employeeData);
      if (employeeData) {
        setIsActive(employeeData.isActive ?? false);
        setIsFeatured(employeeData.isfeatured ?? false);
        setWarnings(employeeData.warnings || []);
        setPips(employeeData.pips || []);
        setAppreciations(employeeData.appreciations || []);
      }
    } catch (err) {
      console.error("Failed to reload employee details:", err);
    }
  };

  // Handler Functions
  const handleStatusChange = async (active: boolean) => {
    if (!active) {
      // When making inactive, show separation dialog
      setSeparationDialogOpen(true);
      setSeparationType("");
      setSeparationReason("");
      setSeparationDate(new Date().toISOString().split("T")[0]);
      setSendSeparationEmail(true);
      return;
    }
    
    // When making active, directly update
    setIsActive(active);
    try {
      await axios.put("/api/employee/editEmployee", {
        _id: employee?._id,
        isActive: active,
        inactiveReason: null,
        inactiveDate: null,
      });
      toast.success("Employee has been activated successfully.");
    } catch (error) {
      setIsActive(!active);
      toast.error("Failed to update status.");
    }
  };

  const handleSeparationSubmit = async () => {
    if (!separationType) {
      toast.error("Please select whether the employee is terminated or suspended.");
      return;
    }

    if (sendSeparationEmail && employee?.email) {
      // Show email preview dialog
      try {
        setProcessingSeparation(true);
        const formattedDate = separationDate
          ? new Date(separationDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            });

        const response = await axios.get(
          `/api/employee/separation?employeeId=${linkedEmployeeId}&separationType=${separationType}&reason=${encodeURIComponent(separationReason)}&effectiveDate=${encodeURIComponent(formattedDate)}`
        );

        if (response.data.success) {
          setEmailPreviewSubject(response.data.template.subject);
          setEmailPreviewHtml(response.data.template.html);
          setEmailPreviewType("separation");
          setEmailPreviewPayload({
            separationType,
            reason: separationReason,
            effectiveDate: formattedDate,
          });
          setSeparationDialogOpen(false);
          setSeparationEmailDialogOpen(true);
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Failed to generate email template.");
      } finally {
        setProcessingSeparation(false);
      }
    } else {
      // No email, directly process separation
      await processSeparation();
    }
  };

  const processSeparation = async (customSubject?: string, customHtml?: string) => {
    try {
      setProcessingSeparation(true);
      const formattedDate = separationDate
        ? new Date(separationDate).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })
        : new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          });

      const response = await axios.post("/api/employee/separation", {
        employeeId: linkedEmployeeId,
        separationType,
        reason: separationReason,
        effectiveDate: formattedDate,
        sendEmail: sendSeparationEmail && !!employee?.email,
        customEmailSubject: customSubject,
        customEmailHtml: customHtml,
      });

      if (response.data.success) {
        setIsActive(false);
        setSeparationDialogOpen(false);
        setSeparationEmailDialogOpen(false);
        setEmailPreviewOpen(false);
        toast.success(`Employee has been ${separationType} successfully.${response.data.emailSent ? " Email sent." : ""}`);
        await reloadEmployee();
        await refreshCandidate(); // Also refresh candidate data
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to process separation.");
    } finally {
      setProcessingSeparation(false);
    }
  };

  // Make inactive without any reason or email
  const handleInactiveAnyway = async () => {
    try {
      setProcessingSeparation(true);
      await axios.put("/api/employee/editEmployee", {
        _id: employee?._id,
        isActive: false,
        inactiveReason: null,
        inactiveDate: new Date(),
      });
      setIsActive(false);
      setSeparationDialogOpen(false);
      toast.success("Employee has been marked as inactive.");
      await reloadEmployee();
    } catch (error: any) {
      toast.error("Failed to update status.");
    } finally {
      setProcessingSeparation(false);
    }
  };

  const handleFeaturedChange = async (featured: boolean) => {
    setIsFeatured(featured);
    try {
      await axios.put("/api/employee/editEmployee", {
        _id: employee?._id,
        isfeatured: featured,
      });
    } catch (error) {
      setIsFeatured(!featured);
      toast.error("Featured cannot be changed");
    }
  };

  const resetWarningForm = () => {
    setNewWarning({
      warningType: "",
      department: "",
      reportingManager: "",
      date: "",
      notes: "",
      sendEmail: true,
    });
  };

  const handleSendWarning = async () => {
    if (
      !newWarning.warningType ||
      !newWarning.department ||
      !newWarning.reportingManager ||
      !newWarning.date
    ) {
      toast.error("Please fill all required fields (Warning Type, Department, Reporting Manager, Date).");
      return;
    }

    if (!newWarning.sendEmail || !employee?.email) {
      // If email is not to be sent, directly save without preview
      try {
        setSendingWarning(true);
        const response = await axios.post("/api/employee/warnings", {
          employeeId: linkedEmployeeId,
          warningType: newWarning.warningType,
          department: newWarning.department,
          reportingManager: newWarning.reportingManager,
          date: newWarning.date,
          issuedBy: "Admin",
          notes: newWarning.notes,
          sendEmail: false,
        });

        if (response?.data?.success) {
          await reloadEmployee();
          resetWarningForm();
          setWarningDialogOpen(false);
          toast.success("Warning has been recorded without sending email.");
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Failed to record warning");
      } finally {
        setSendingWarning(false);
      }
      return;
    }

    // Generate email template and show preview
    try {
      setSendingWarning(true);
      const templateResponse = await axios.post("/api/email/generateTemplate", {
        type: "warning",
        payload: {
          to: employee?.email,
          employeeName: employee?.name,
          warningType: newWarning.warningType,
          department: newWarning.department,
          reportingManager: newWarning.reportingManager,
          date: newWarning.date,
          dateTime: newWarning.date,
          companyName: "Zairo International",
        },
      });

      if (templateResponse?.data?.success) {
        setEmailPreviewSubject(templateResponse.data.subject);
        setEmailPreviewHtml(templateResponse.data.html);
        setEmailPreviewType("warning");
        setEmailPreviewPayload({
          employeeId: linkedEmployeeId,
          warningType: newWarning.warningType,
          department: newWarning.department,
          reportingManager: newWarning.reportingManager,
          date: newWarning.date,
          issuedBy: "Admin",
          notes: newWarning.notes,
          sendEmail: true,
        });
        setWarningDialogOpen(false);
        setEmailPreviewOpen(true);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to generate email template");
    } finally {
      setSendingWarning(false);
    }
  };

  const handleSendWarningWithCustomEmail = async (subject: string, html: string) => {
    try {
      setSendingWarning(true);
      const response = await axios.post("/api/employee/warnings", {
        ...emailPreviewPayload,
        customEmailSubject: subject,
        customEmailHtml: html,
      });

      if (response?.data?.success) {
        await reloadEmployee();
        resetWarningForm();
        setEmailPreviewOpen(false);
        toast.success(response?.data?.emailSent
          ? `Warning email has been sent to ${employee?.email}`
          : "Warning has been recorded without sending email.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to send warning");
    } finally {
      setSendingWarning(false);
    }
  };

  const handleDeleteWarning = async (warningId: string) => {
    try {
      setDeletingWarningId(warningId);
      const response = await axios.delete("/api/employee/warnings", {
        data: { employeeId: linkedEmployeeId, warningId },
      });

      if (response?.data?.success) {
        await reloadEmployee();
        toast.success("The warning has been removed from the record.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete warning.");
    } finally {
      setDeletingWarningId(null);
    }
  };

  // PIP Functions
  const resetPIPForm = () => {
    setNewPIP({
      pipLevel: "",
      startDate: "",
      endDate: "",
      concerns: [""],
      notes: "",
      sendEmail: true,
    });
    // Clear pending action when form is reset
    setPendingPIPAction(null);
  };

  const addConcern = () => {
    setNewPIP({ ...newPIP, concerns: [...newPIP.concerns, ""] });
  };

  const removeConcern = (index: number) => {
    const updatedConcerns = newPIP.concerns.filter((_, i) => i !== index);
    setNewPIP({ ...newPIP, concerns: updatedConcerns.length ? updatedConcerns : [""] });
  };

  const updateConcern = (index: number, value: string) => {
    const updatedConcerns = [...newPIP.concerns];
    updatedConcerns[index] = value;
    setNewPIP({ ...newPIP, concerns: updatedConcerns });
  };

  const handleSendPIP = async () => {
    if (!newPIP.pipLevel || !newPIP.startDate || !newPIP.endDate) {
      toast.error("Please fill all required fields (PIP Level, Start Date, End Date).");
      return;
    }

    const validConcerns = newPIP.concerns.filter((c) => c.trim() !== "");
    if (validConcerns.length === 0) {
      toast.error("Please add at least one concern or issue.");
      return;
    }

    // If this is a next level PIP, mark the previous PIP as failed first
    if (pendingPIPAction?.action === "nextLevel" && pendingPIPAction.pipId) {
      try {
        await axios.put("/api/employee/pip", {
          employeeId: linkedEmployeeId,
          pipId: pendingPIPAction.pipId,
          status: "failed",
        });
      } catch (error: any) {
        console.error("Failed to mark previous PIP as failed:", error);
        // Continue anyway
      }
    }

    if (!newPIP.sendEmail || !employee?.email) {
      // If email is not to be sent, directly save without preview
      try {
        setSendingPIP(true);
        const response = await axios.post("/api/employee/pip", {
          employeeId: linkedEmployeeId,
          pipLevel: newPIP.pipLevel,
          startDate: newPIP.startDate,
          endDate: newPIP.endDate,
          concerns: validConcerns,
          issuedBy: "Admin",
          notes: newPIP.notes,
          sendEmail: false,
        });

        if (response?.data?.success) {
          await reloadEmployee();
          resetPIPForm();
          setPipDialogOpen(false);
          
          // Clear pending action if it was next level PIP
          if (pendingPIPAction?.action === "nextLevel") {
            const levelLabel = pendingPIPAction.pip.pipLevel === "level1" || pendingPIPAction.pip.pipLevel === "forTrainees" 
              ? "Level 2" 
              : "Level 3";
            toast.success(`${levelLabel} PIP has been recorded. Previous PIP has been marked as failed.`);
            setPendingPIPAction(null);
          } else {
            toast.success("PIP has been recorded without sending email.");
          }
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Failed to record PIP");
      } finally {
        setSendingPIP(false);
      }
      return;
    }

    // Generate email template and show preview
    try {
      setSendingPIP(true);
      const templateResponse = await axios.post("/api/email/generateTemplate", {
        type: "pip",
        payload: {
          to: employee?.email,
          employeeName: employee?.name,
          pipLevel: newPIP.pipLevel,
          startDate: newPIP.startDate,
          endDate: newPIP.endDate,
          concerns: (newPIP.pipLevel === "level1" || newPIP.pipLevel === "forTrainees") ? validConcerns : undefined,
          issues: newPIP.pipLevel === "level2" ? validConcerns : undefined,
          criticalIssues: newPIP.pipLevel === "level3" ? validConcerns : undefined,
          companyName: "Zairo International",
        },
      });

      if (templateResponse?.data?.success) {
        setEmailPreviewSubject(templateResponse.data.subject);
        setEmailPreviewHtml(templateResponse.data.html);
        setEmailPreviewType("pip");
        setEmailPreviewPayload({
          employeeId: linkedEmployeeId,
          pipLevel: newPIP.pipLevel,
          startDate: newPIP.startDate,
          endDate: newPIP.endDate,
          concerns: validConcerns,
          issuedBy: "Admin",
          notes: newPIP.notes,
          sendEmail: true,
          // Store current PIP ID if this is next level PIP
          currentPipId: pendingPIPAction?.action === "nextLevel" ? pendingPIPAction.pipId : undefined,
        });
        setPipDialogOpen(false);
        setEmailPreviewOpen(true);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to generate email template");
    } finally {
      setSendingPIP(false);
    }
  };

  const handleSendPIPWithCustomEmail = async (subject: string, html: string) => {
    try {
      setSendingPIP(true);
      
      // If this is a next level PIP, mark current PIP as failed first (if not already done)
      if (emailPreviewPayload?.currentPipId || pendingPIPAction?.action === "nextLevel") {
        const pipIdToFail = emailPreviewPayload?.currentPipId || pendingPIPAction?.pipId;
        if (pipIdToFail) {
          try {
            await axios.put("/api/employee/pip", {
              employeeId: linkedEmployeeId,
              pipId: pipIdToFail,
              status: "failed",
            });
          } catch (error: any) {
            console.error("Failed to mark current PIP as failed:", error);
            // Continue anyway
          }
        }
      }

      const response = await axios.post("/api/employee/pip", {
        ...emailPreviewPayload,
        customEmailSubject: subject,
        customEmailHtml: html,
      });

      if (response?.data?.success) {
        await reloadEmployee();
        resetPIPForm();
        setEmailPreviewOpen(false);
        
        // Clear pending action if it was a next level PIP
        if (pendingPIPAction?.action === "nextLevel" || emailPreviewPayload?.currentPipId) {
          const nextLevel = pendingPIPAction?.pip?.pipLevel === "level1" || pendingPIPAction?.pip?.pipLevel === "forTrainees" 
            ? "Level 2" 
            : "Level 3";
          toast.success(response?.data?.emailSent
            ? `${nextLevel} PIP email has been sent to ${employee?.email}. Previous PIP has been marked as failed.`
            : "PIP has been recorded without sending email.");
          setPendingPIPAction(null);
        } else {
          toast.success(response?.data?.emailSent
            ? `PIP email has been sent to ${employee?.email}`
            : "PIP has been recorded without sending email.");
        }
        
        setEmailPreviewPayload(null);
        setEmailPreviewType(null);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to send PIP");
    } finally {
      setSendingPIP(false);
    }
  };

  // Show email preview for PIP completion
  const handlePIPCompletionPreview = async (pip: PIPRecord) => {
    try {
      setSendingPIP(true);
      const templateResponse = await axios.post("/api/email/generateTemplate", {
        type: "pipCompletion",
        payload: {
          employeeName: employee?.name,
          pipLevel: pip.pipLevel,
          startDate: pip.startDate,
          endDate: pip.endDate,
          companyName: "Zairo International",
        },
      });

      if (templateResponse?.data?.success) {
        setEmailPreviewSubject(templateResponse.data.subject);
        setEmailPreviewHtml(templateResponse.data.html);
        setEmailPreviewType("pipCompletion");
        setEmailPreviewPayload({
          employeeId: linkedEmployeeId,
          pipId: pip._id,
          status: "completed",
        });
        setEmailPreviewOpen(true);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to generate completion email template");
    } finally {
      setSendingPIP(false);
    }
  };

  // Handle sending PIP completion email with custom content
  const handleSendPIPCompletionWithCustomEmail = async (subject: string, html: string) => {
    try {
      setSendingPIP(true);
      const response = await axios.put("/api/employee/pip", {
        employeeId: linkedEmployeeId,
        pipId: emailPreviewPayload.pipId,
        status: "completed",
        customCompletionEmailSubject: subject,
        customCompletionEmailHtml: html,
      });

      if (response?.data?.success) {
        await reloadEmployee();
        setEmailPreviewOpen(false);
        setEmailPreviewPayload(null);
        setEmailPreviewType(null);
        toast.success(response?.data?.emailSent
          ? `PIP has been marked as completed and completion email has been sent to ${employee?.email}`
          : "PIP has been marked as completed.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to complete PIP");
    } finally {
      setSendingPIP(false);
    }
  };

  const handlePIPAction = async (pipId: string, action: "completed" | "failed") => {
    const pip = pips.find((p) => p._id === pipId);
    if (!pip) return;

    setPendingPIPAction({
      pipId,
      action,
      pip,
    });

    // For completed status, show email preview first
    if (action === "completed") {
      await handlePIPCompletionPreview(pip);
      return;
    }

    // For failed status, proceed directly (will trigger next level PIP flow)
    try {
      const response = await axios.put("/api/employee/pip", {
        employeeId: linkedEmployeeId,
        pipId,
        status: action,
      });

      if (response?.data?.success) {
        await reloadEmployee();
        toast.success(`PIP has been marked as ${action}.`);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to update PIP status.");
    }
  };

  // Handle sending next level PIP when current PIP fails - opens PIP dialog with pre-filled data
  const handleSendNextLevelPIP = (currentPip: PIPRecord) => {
    // Determine next level
    let nextLevel: PIPLevel;
    if (currentPip.pipLevel === "level1" || currentPip.pipLevel === "forTrainees") {
      nextLevel = "level2";
    } else if (currentPip.pipLevel === "level2") {
      nextLevel = "level3";
    } else {
      toast.error("Cannot send next level PIP. Maximum level reached.");
      return;
    }

    // Store pending action to mark current PIP as failed after new PIP is sent
    setPendingPIPAction({
      pipId: currentPip._id || "",
      action: "nextLevel",
      pip: currentPip,
    });

    // Calculate dates for next PIP (default: 10 days from today)
    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 10);
    const endDateStr = endDate.toISOString().split("T")[0];

    // Use the same concerns/issues from current PIP
    const concerns = currentPip.concerns || [];
    if (concerns.length === 0) {
      toast.error("Cannot send next level PIP. No concerns found in current PIP.");
      setPendingPIPAction(null);
      return;
    }

    // Pre-fill the PIP form with next level data
    setNewPIP({
      pipLevel: nextLevel,
      startDate,
      endDate: endDateStr,
      concerns: concerns,
      notes: `Automatically issued after ${currentPip.pipLevel} PIP was not cleared.`,
      sendEmail: true,
    });

    // Open the PIP dialog so admin can review/edit before sending
    setPipDialogOpen(true);
  };

  const handleDeletePIP = async (pipId: string) => {
    try {
      setDeletingPIPId(pipId);
      const response = await axios.delete("/api/employee/pip", {
        data: { employeeId: linkedEmployeeId, pipId },
      });

      if (response?.data?.success) {
        await reloadEmployee();
        toast.success("The PIP has been removed from the record.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete PIP.");
    } finally {
      setDeletingPIPId(null);
    }
  };

  // Appreciation Functions
  const resetAppreciationForm = () => {
    setNewAppreciation({
      appreciationType: "",
      notes: "",
      sendEmail: true,
    });
  };

  const handleSendAppreciation = async () => {
    if (!newAppreciation.appreciationType) {
      toast.error("Please select an appreciation type.");
      return;
    }

    if (!newAppreciation.sendEmail || !employee?.email) {
      // If email is not to be sent, directly save without preview
      try {
        setSendingAppreciation(true);
        const response = await axios.post("/api/employee/appreciations", {
          employeeId: linkedEmployeeId,
          appreciationType: newAppreciation.appreciationType,
          issuedBy: "Admin",
          notes: newAppreciation.notes,
          sendEmail: false,
        });

        if (response?.data?.success) {
          await reloadEmployee();
          resetAppreciationForm();
          setAppreciationDialogOpen(false);
          toast.success("Appreciation has been recorded without sending email.");
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Failed to record appreciation");
      } finally {
        setSendingAppreciation(false);
      }
      return;
    }

    // Generate email template and show preview
    try {
      setSendingAppreciation(true);
      const templateResponse = await axios.post("/api/email/generateTemplate", {
        type: "appreciation",
        payload: {
          to: employee?.email,
          employeeName: employee?.name,
          appreciationType: newAppreciation.appreciationType,
          companyName: "Zairo International",
        },
      });

      if (templateResponse?.data?.success) {
        setEmailPreviewSubject(templateResponse.data.subject);
        setEmailPreviewHtml(templateResponse.data.html);
        setEmailPreviewType("appreciation");
        setEmailPreviewPayload({
          employeeId: linkedEmployeeId,
          appreciationType: newAppreciation.appreciationType,
          issuedBy: "Admin",
          notes: newAppreciation.notes,
          sendEmail: true,
        });
        setAppreciationDialogOpen(false);
        setEmailPreviewOpen(true);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to generate email template");
    } finally {
      setSendingAppreciation(false);
    }
  };

  const handleSendAppreciationWithCustomEmail = async (subject: string, html: string) => {
    try {
      setSendingAppreciation(true);
      const response = await axios.post("/api/employee/appreciations", {
        ...emailPreviewPayload,
        customEmailSubject: subject,
        customEmailHtml: html,
      });

      if (response?.data?.success) {
        await reloadEmployee();
        resetAppreciationForm();
        setEmailPreviewOpen(false);
        toast.success(response?.data?.emailSent
          ? `Appreciation email has been sent to ${employee?.email}`
          : "Appreciation has been recorded without sending email.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to send appreciation");
    } finally {
      setSendingAppreciation(false);
    }
  };

  const handleDeleteAppreciation = async (appreciationId: string) => {
    try {
      setDeletingAppreciationId(appreciationId);
      const response = await axios.delete("/api/employee/appreciations", {
        data: { employeeId: linkedEmployeeId, appreciationId },
      });

      if (response?.data?.success) {
        await reloadEmployee();
        toast.success("The appreciation has been removed from the record.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete appreciation.");
    } finally {
      setDeletingAppreciationId(null);
    }
  };

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

  // Check for overdue active PIPs
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const activeOverduePIP = pips?.find(
    (p) => p.status === "active" && new Date(p.endDate) < startOfToday
  );

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
          <Link href={backHref}>Back to People</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="-mx-8 -mt-8">
      <div className="px-8 pt-4 pb-2">
        <Button variant="ghost" size="sm" className="gap-1.5 h-8" asChild>
          <Link href={backHref}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to People
          </Link>
        </Button>
      </div>

      <CandidateHeader candidate={person} showBack={false} />

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
                  <Link href={hiringHref}>
                    <Calendar className="h-4 w-4 mr-2" />
                    {canScheduleInterview() ? "Schedule" : "Hiring actions"}
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={hiringHref}>
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
                  <Link href={offerLetterHref}>
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

        {/* Overdue PIP Warning Banner - Only for active phase */}
        {phase === "active" && activeOverduePIP && (
          <div className="mt-4 p-4 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200">
            <p className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              PIP duration has ended – profile is locked
            </p>
            <p className="text-sm mt-1">
              Clear this PIP or raise the next level PIP to unlock the employee profile.
              {activeOverduePIP.pipLevel === "level3" && (
                <> For Level 3: Clear PIP or Terminate employee.</>
              )}
            </p>
          </div>
        )}

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
                  <Link href={hiringHref}>
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
                    <Link href={hiringHref}>
                      Open hiring workspace
                    </Link>
                  </Button>
                  {canStartOnboarding() && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={onboardingHref}>
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
                  <Link href={trainingAgreementHref}>
                    Training agreement
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={offerLetterHref}>
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
                <>
                  {/* Active/Featured Toggle Card - Only for active phase */}
                  {phase === "active" && (
                    <Card className="p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold mb-1">Employee Status</h3>
                          <p className="text-xs text-muted-foreground">Control active status and featured flag</p>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <Label className="text-xs mb-1 block">Active Status</Label>
                            <div
                              className="h-8 w-20 border rounded-3xl flex items-center cursor-pointer relative"
                              onClick={() => handleStatusChange(!isActive)}
                            >
                              <motion.div
                                className={`${isActive ? "bg-green-600" : "bg-red-600"} h-7 w-7 rounded-full flex items-center justify-center font-bold text-lg text-white`}
                                variants={statusVariants}
                                initial={isActive ? "active" : "inactive"}
                                animate={isActive ? "active" : "inactive"}
                              >
                                {isActive ? "A" : "I"}
                              </motion.div>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">Featured</Label>
                            <div
                              className="h-8 w-20 border rounded-3xl flex items-center cursor-pointer relative"
                              onClick={() => handleFeaturedChange(!isFeatured)}
                            >
                              <motion.div
                                className={`${isFeatured ? "bg-green-600" : "bg-red-600"} h-7 w-7 rounded-full flex items-center justify-center font-bold text-base text-white`}
                                variants={statusVariants}
                                initial={isFeatured ? "active" : "inactive"}
                                animate={isFeatured ? "active" : "inactive"}
                              >
                                {isFeatured ? "F" : "NF"}
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Employee Profile Card */}
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

                  <Card className="p-4 space-y-4 mt-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wide">
                        Office Details
                      </h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOfficeDetailsDialogOpen(true)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                     
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Location: </span>
                        {employee.officeDetails?.officeAddressId &&
                        typeof employee.officeDetails.officeAddressId === "object"
                          ? employee.officeDetails.officeAddressId.name
                          : "Not set"}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Assigned Email: </span>
                        {employee.officeDetails?.assignedEmail || "Not set"}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Assigned Number: </span>
                        {employee.officeDetails?.assignedNumber || "Not set"}
                      </p>
                    </div>
                  </Card>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Employee profile not found.</p>
              )}
            </TabsContent>
          )}

          {showPerformance && (
            <TabsContent value="performance" className="mt-4 space-y-6">
              {/* Warning Card */}
              <Card className="bg-background border-orange-500/20">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold flex items-center gap-2">
                        Employee Warnings
                        {warnings?.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-orange-500/10 text-orange-600 border-orange-500/30"
                          >
                            {warnings?.length}
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Send formal warnings and view history
                      </p>
                    </div>
                  </div>
                  <Button
                    className="gap-2 bg-orange-500 hover:bg-orange-600"
                    onClick={() => setWarningDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Send Warning
                  </Button>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="popLayout">
                    {warnings?.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                          <AlertTriangle className="h-8 w-8 opacity-40" />
                        </div>
                        <p className="font-medium">No warnings issued</p>
                        <p className="text-sm mt-1">
                          This employee has a clean record
                        </p>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        {warnings.map((warning, index) => (
                          <motion.div
                            key={warning._id || index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className={`relative p-4 rounded-lg border ${
                              WARNING_TYPE_CONFIG[warning.warningType]?.color ||
                              "bg-gray-500/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <Badge
                                    variant="outline"
                                    className={
                                      WARNING_TYPE_CONFIG[warning.warningType]
                                        ?.color || ""
                                    }
                                  >
                                    <span className="mr-1">
                                      {WARNING_TYPE_CONFIG[warning.warningType]
                                        ?.icon || "⚠️"}
                                    </span>
                                    {WARNING_TYPE_CONFIG[warning.warningType]
                                      ?.label || warning.warningType}
                                  </Badge>
                                  {warning.emailSent ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-green-500/10 text-green-600 border-green-500/30"
                                    >
                                      <MailCheck className="h-3 w-3 mr-1" />
                                      Email Sent
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="bg-gray-500/10 text-gray-600 border-gray-500/30"
                                    >
                                      <MailX className="h-3 w-3 mr-1" />
                                      No Email
                                    </Badge>
                                  )}
                                </div>

                                <p className="font-medium text-sm">
                                  {warning.reason}
                                </p>

                                <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {warning.department}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <UserCheck className="h-3 w-3" />
                                    {warning.reportingManager}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {warning.issuedAt
                                      ? format(
                                          new Date(warning.issuedAt),
                                          "MMM dd, yyyy"
                                        )
                                      : "N/A"}
                                  </span>
                                </div>

                                {warning.notes && (
                                  <p className="text-xs text-muted-foreground mt-2 italic">
                                    Note: {warning.notes}
                                  </p>
                                )}

                                <p className="text-xs text-muted-foreground mt-2">
                                  Issued by: {warning.issuedBy}
                                </p>
                              </div>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                                    disabled={deletingWarningId === warning._id}
                                  >
                                    {deletingWarningId === warning._id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Warning Record
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this warning
                                      record? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteWarning(warning._id || "")
                                      }
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent> 
                              </AlertDialog>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* PIP Card */}
              <Card className="bg-background border-blue-500/20">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold flex items-center gap-2">
                        Performance Improvement Plans
                        {pips?.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-500/10 text-blue-600 border-blue-500/30"
                          >
                            {pips?.length}
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Issue PIP notices and track progress
                      </p>
                    </div>
                  </div>
                  <Button
                    className="gap-2 bg-blue-500 hover:bg-blue-600"
                    onClick={() => setPipDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Issue PIP
                  </Button>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="popLayout">
                    {pips?.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                          <TrendingUp className="h-8 w-8 opacity-40" />
                        </div>
                        <p className="font-medium">No PIPs issued</p>
                        <p className="text-sm mt-1">
                          No performance improvement plans on record
                        </p>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        {pips?.map((pip, index) => (
                          <motion.div
                            key={pip._id || index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className={`relative p-4 rounded-lg border ${
                              PIP_LEVEL_CONFIG[pip.pipLevel]?.color || "bg-gray-500/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <Badge
                                    variant="outline"
                                    className={PIP_LEVEL_CONFIG[pip.pipLevel]?.color || ""}
                                  >
                                    <span className="mr-1">
                                      {PIP_LEVEL_CONFIG[pip.pipLevel]?.icon || "📋"}
                                    </span>
                                    {PIP_LEVEL_CONFIG[pip.pipLevel]?.shortLabel || pip.pipLevel}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={PIP_STATUS_CONFIG[pip.status]?.color || ""}
                                  >
                                    {pip.status === "active" && <Target className="h-3 w-3 mr-1" />}
                                    {pip.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                    {pip.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                                    {PIP_STATUS_CONFIG[pip.status]?.label || pip.status}
                                  </Badge>
                                  {pip.emailSent ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-green-500/10 text-green-600 border-green-500/30"
                                    >
                                      <MailCheck className="h-3 w-3 mr-1" />
                                      Email Sent
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="bg-gray-500/10 text-gray-600 border-gray-500/30"
                                    >
                                      <MailX className="h-3 w-3 mr-1" />
                                      No Email
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                                  <span className="flex items-center gap-1">
                                    <CalendarRange className="h-3 w-3" />
                                    {pip.startDate} to {pip.endDate}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Target className="h-3 w-3" />
                                    {(() => {
                                      const startDateObj = new Date(pip.startDate);
                                      const endDateObj = new Date(pip.endDate);
                                      const timeDiff = endDateObj.getTime() - startDateObj.getTime();
                                      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
                                      return `${daysDiff} day${daysDiff !== 1 ? 's' : ''}`;
                                    })()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Issued: {pip.issuedAt
                                      ? format(new Date(pip.issuedAt), "MMM dd, yyyy")
                                      : "N/A"}
                                  </span>
                                </div>

                                <div className="mb-2">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Concerns:
                                  </p>
                                  <ul className="list-disc list-inside text-sm space-y-1">
                                    {pip.concerns?.map((concern, i) => (
                                      <li key={i}>{concern}</li>
                                    ))}
                                  </ul>
                                </div>

                                {pip.notes && (
                                  <p className="text-xs text-muted-foreground mt-2 italic">
                                    Note: {pip.notes}
                                  </p>
                                )}

                                <p className="text-xs text-muted-foreground mt-2">
                                  Issued by: {pip.issuedBy}
                                </p>

                                {/* Status Update Buttons */}
                                {pip.status === "active" && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20"
                                      onClick={() => handlePIPAction(pip._id || "", "completed")}
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Clear PIP (Completed)
                                    </Button>
                                    
                                    {/* Level 1 or For Trainees: Show "Send PIP Level 2" instead of "Failed" */}
                                    {(pip.pipLevel === "level1" || pip.pipLevel === "forTrainees") && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
                                        onClick={() => handleSendNextLevelPIP(pip)}
                                      >
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        Send PIP Level 2
                                      </Button>
                                    )}

                                    {/* Level 2: Show "Send PIP Level 3" instead of "Failed" */}
                                    {pip.pipLevel === "level2" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs bg-orange-500/10 text-orange-600 border-orange-500/30 hover:bg-orange-500/20"
                                        onClick={() => handleSendNextLevelPIP(pip)}
                                      >
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        Send PIP Level 3
                                      </Button>
                                    )}

                                    {/* Level 3: Show "Terminate employee" instead of "Failed" */}
                                    {pip.pipLevel === "level3" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs bg-red-700/10 text-red-700 border-red-700/30 hover:bg-red-700/20"
                                        onClick={() => {
                                          setSeparationType("terminated");
                                          setSeparationReason("PIP Level 3 not cleared");
                                          setSeparationDate(new Date().toISOString().split("T")[0]);
                                          setSendSeparationEmail(true);
                                          setSeparationDialogOpen(true);
                                        }}
                                      >
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Terminate employee
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                                    disabled={deletingPIPId === pip._id}
                                  >
                                    {deletingPIPId === pip._id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete PIP Record</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this PIP record? This
                                      action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeletePIP(pip._id || "")}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Appreciation Card */}
              <Card className="bg-background border-green-500/20">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Award className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold flex items-center gap-2">
                        Employee Appreciations
                        {appreciations?.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-green-500/10 text-green-600 border-green-500/30"
                          >
                            {appreciations?.length}
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Send appreciation emails and view history
                      </p>
                    </div>
                  </div>
                  <Button
                    className="gap-2 bg-green-500 hover:bg-green-600"
                    onClick={() => setAppreciationDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Send Appreciation
                  </Button>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="popLayout">
                    {appreciations?.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                          <Award className="h-8 w-8 opacity-40" />
                        </div>
                        <p className="font-medium">No appreciations sent</p>
                        <p className="text-sm mt-1">
                          No appreciation emails on record
                        </p>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        {appreciations?.map((appreciation, index) => (
                          <motion.div
                            key={appreciation._id || index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className={`relative p-4 rounded-lg border ${
                              APPRECIATION_TYPE_CONFIG[appreciation.appreciationType]
                                ?.color || "bg-gray-500/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <Badge
                                    variant="outline"
                                    className={
                                      APPRECIATION_TYPE_CONFIG[
                                        appreciation.appreciationType
                                      ]?.color || ""
                                    }
                                  >
                                    <span className="mr-1">
                                      {
                                        APPRECIATION_TYPE_CONFIG[
                                          appreciation.appreciationType
                                        ]?.icon || "⭐"
                                      }
                                    </span>
                                    {
                                      APPRECIATION_TYPE_CONFIG[
                                        appreciation.appreciationType
                                      ]?.label || appreciation.appreciationType
                                    }
                                  </Badge>
                                  {appreciation.emailSent ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-green-500/10 text-green-600 border-green-500/30"
                                    >
                                      <MailCheck className="h-3 w-3 mr-1" />
                                      Email Sent
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="bg-gray-500/10 text-gray-600 border-gray-500/30"
                                    >
                                      <MailX className="h-3 w-3 mr-1" />
                                      No Email
                                    </Badge>
                                  )}
                                </div>

                                <p className="font-medium text-sm">
                                  {appreciation.reason}
                                </p>

                                <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {appreciation.issuedAt
                                      ? format(
                                          new Date(appreciation.issuedAt),
                                          "MMM dd, yyyy"
                                        )
                                      : "N/A"}
                                  </span>
                                </div>

                                {appreciation.notes && (
                                  <p className="text-xs text-muted-foreground mt-2 italic">
                                    Note: {appreciation.notes}
                                  </p>
                                )}

                                <p className="text-xs text-muted-foreground mt-2">
                                  Issued by: {appreciation.issuedBy}
                                </p>
                              </div>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                                    disabled={deletingAppreciationId === appreciation._id}
                                  >
                                    {deletingAppreciationId === appreciation._id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Appreciation Record
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this appreciation
                                      record? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteAppreciation(appreciation._id || "")
                                      }
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </CardContent>
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

      {employee && (
        <OfficeDetailsDialog
          open={officeDetailsDialogOpen}
          onOpenChange={setOfficeDetailsDialogOpen}
          employeeId={employee._id}
          onSaved={reloadEmployee}
        />
      )}

      {/* PIP Management Dialogs - Only for active phase */}
      {phase === "active" && linkedEmployeeId && (
        <>
          {/* Warning Dialog */}
          <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Send Formal Warning
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="warningType">Warning Type *</Label>
                  <Select
                    value={newWarning.warningType}
                    onValueChange={(value: WarningType) =>
                      setNewWarning({ ...newWarning, warningType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select warning type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(WARNING_TYPE_CONFIG).map(
                        ([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <span>{config.icon}</span>
                              {config.label}
                            </span>
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    placeholder="e.g., Sales, HR, Development"
                    value={newWarning.department}
                    onChange={(e) =>
                      setNewWarning({
                        ...newWarning,
                        department: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reportingManager">
                    Reporting Manager *
                  </Label>
                  <Input
                    id="reportingManager"
                    placeholder="Manager name"
                    value={newWarning.reportingManager}
                    onChange={(e) =>
                      setNewWarning({
                        ...newWarning,
                        reportingManager: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="date">
                    Acknowledgement/Meeting Date *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={newWarning.date}
                    onChange={(e) =>
                      setNewWarning({ ...newWarning, date: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes or context..."
                    value={newWarning.notes}
                    onChange={(e) =>
                      setNewWarning({ ...newWarning, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="sendEmail"
                    checked={newWarning.sendEmail}
                    onCheckedChange={(checked) =>
                      setNewWarning({
                        ...newWarning,
                        sendEmail: checked as boolean,
                      })
                    }
                  />
                  <label
                    htmlFor="sendEmail"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Send warning email to {employee?.email}
                  </label>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleSendWarning}
                  disabled={sendingWarning}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {sendingWarning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Warning
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* PIP Dialog */}
          <Dialog open={pipDialogOpen} onOpenChange={setPipDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Issue Performance Improvement Plan
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="pipLevel">PIP Level *</Label>
                  <Select
                    value={newPIP.pipLevel}
                    onValueChange={(value: PIPLevel) =>
                      setNewPIP({ ...newPIP, pipLevel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select PIP level" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PIP_LEVEL_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            {config.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newPIP.startDate}
                      onChange={(e) =>
                        setNewPIP({ ...newPIP, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newPIP.endDate}
                      onChange={(e) =>
                        setNewPIP({ ...newPIP, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Concerns / Issues *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addConcern}
                      className="h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {newPIP.concerns.map((concern, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Concern ${index + 1}`}
                        value={concern}
                        onChange={(e) => updateConcern(index, e.target.value)}
                      />
                      {newPIP.concerns.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeConcern(index)}
                          className="shrink-0 h-10 w-10 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="pipNotes">Additional Notes</Label>
                  <Textarea
                    id="pipNotes"
                    placeholder="Any additional notes or context..."
                    value={newPIP.notes}
                    onChange={(e) =>
                      setNewPIP({ ...newPIP, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="sendPIPEmail"
                    checked={newPIP.sendEmail}
                    onCheckedChange={(checked) =>
                      setNewPIP({ ...newPIP, sendEmail: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="sendPIPEmail"
                    className="text-sm font-medium leading-none flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Send PIP email to {employee?.email}
                  </label>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleSendPIP}
                  disabled={sendingPIP}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {sendingPIP ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Issue PIP
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Appreciation Dialog */}
          <Dialog
            open={appreciationDialogOpen}
            onOpenChange={setAppreciationDialogOpen}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-500" />
                  Send Appreciation
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="appreciationType">Appreciation Type *</Label>
                  <Select
                    value={newAppreciation.appreciationType}
                    onValueChange={(value: AppreciationType) =>
                      setNewAppreciation({
                        ...newAppreciation,
                        appreciationType: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select appreciation type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(APPRECIATION_TYPE_CONFIG).map(
                        ([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <span>{config.icon}</span>
                              {config.label}
                            </span>
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="appreciationNotes">Additional Notes</Label>
                  <Textarea
                    id="appreciationNotes"
                    placeholder="Any additional notes or context..."
                    value={newAppreciation.notes}
                    onChange={(e) =>
                      setNewAppreciation({
                        ...newAppreciation,
                        notes: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="sendAppreciationEmail"
                    checked={newAppreciation.sendEmail}
                    onCheckedChange={(checked) =>
                      setNewAppreciation({
                        ...newAppreciation,
                        sendEmail: checked as boolean,
                      })
                    }
                  />
                  <label
                    htmlFor="sendAppreciationEmail"
                    className="text-sm font-medium leading-none flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Send appreciation email to {employee?.email}
                  </label>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleSendAppreciation}
                  disabled={sendingAppreciation}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {sendingAppreciation ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Appreciation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Separation Dialog (Termination/Suspension) */}
          <Dialog open={separationDialogOpen} onOpenChange={setSeparationDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Deactivate Employee
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Select Reason for Deactivation <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={separationType}
                    onValueChange={(value) => setSeparationType(value as "terminated" | "suspended" | "abscond" | "resigned")}
                    className="flex flex-col space-y-3"
                  >
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="resigned" id="resigned" />
                      <Label htmlFor="resigned" className="flex-1 cursor-pointer">
                        <div className="font-medium text-slate-700">Resigned</div>
                        <div className="text-xs text-muted-foreground">
                          Employee voluntarily left the organization
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="terminated" id="terminated" />
                      <Label htmlFor="terminated" className="flex-1 cursor-pointer">
                        <div className="font-medium text-red-600">Terminated</div>
                        <div className="text-xs text-muted-foreground">
                          Permanent separation from employment
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="suspended" id="suspended" />
                      <Label htmlFor="suspended" className="flex-1 cursor-pointer">
                        <div className="font-medium text-amber-600">Suspended</div>
                        <div className="text-xs text-muted-foreground">
                          Temporary suspension pending review
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="abscond" id="abscond" />
                      <Label htmlFor="abscond" className="flex-1 cursor-pointer">
                        <div className="font-medium text-purple-600">Abscond</div>
                        <div className="text-xs text-muted-foreground">
                          Left without any information or notice period
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="separation-date">Effective Date</Label>
                  <Input
                    id="separation-date"
                    type="date"
                    value={separationDate}
                    onChange={(e) => setSeparationDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="separation-reason">Reason (Optional)</Label>
                  <Textarea
                    id="separation-reason"
                    placeholder="Enter the reason for termination/suspension..."
                    value={separationReason}
                    onChange={(e) => setSeparationReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                {employee?.email && (
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="send-separation-email"
                      checked={sendSeparationEmail}
                      onCheckedChange={(checked) => setSendSeparationEmail(checked as boolean)}
                    />
                    <Label htmlFor="send-separation-email" className="text-sm cursor-pointer">
                      Send {separationType || "notification"} email to employee
                    </Label>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="ghost"
                  onClick={handleInactiveAnyway}
                  disabled={processingSeparation}
                  className="text-muted-foreground hover:text-foreground sm:mr-auto"
                >
                  Inactive Anyway
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSeparationDialogOpen(false)}
                    disabled={processingSeparation}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleSeparationSubmit}
                    disabled={!separationType || processingSeparation}
                  >
                    {processingSeparation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Confirm ${separationType === "terminated" ? "Termination" : separationType === "suspended" ? "Suspension" : separationType === "abscond" ? "Absconding" : separationType === "resigned" ? "Resignation" : "Deactivation"}`
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Separation Email Preview Dialog */}
          <EmailPreviewDialog
            open={separationEmailDialogOpen}
            onOpenChange={setSeparationEmailDialogOpen}
            subject={emailPreviewSubject}
            html={emailPreviewHtml}
            onSend={async (subject: string, html: string) => {
              await processSeparation(subject, html);
            }}
            sending={processingSeparation}
            recipientEmail={employee?.email || ""}
          />

          {/* Email Preview Dialog */}
          <EmailPreviewDialog
            open={emailPreviewOpen}
            onOpenChange={setEmailPreviewOpen}
            subject={emailPreviewSubject}
            html={emailPreviewHtml}
            onSend={async (subject: string, html: string) => {
              if (emailPreviewType === "warning") {
                await handleSendWarningWithCustomEmail(subject, html);
              } else if (emailPreviewType === "pip") {
                await handleSendPIPWithCustomEmail(subject, html);
              } else if (emailPreviewType === "appreciation") {
                await handleSendAppreciationWithCustomEmail(subject, html);
              } else if (emailPreviewType === "pipCompletion") {
                await handleSendPIPCompletionWithCustomEmail(subject, html);
              }
            }}
            sending={sendingWarning || sendingPIP || sendingAppreciation}
            recipientEmail={employee?.email || ""}
          />
        </>
      )}
    </div>
  );
}
