"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Download,
  Linkedin,
  Globe,
  AlertCircle,
  Calendar,
  Briefcase,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  GraduationCap,
  Check,
  X,
  Pencil,
  Copy,
  IndianRupee,
  Send,
  Upload,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";

import axios from "@/util/axios";
import { SelectCandidateDialog, SelectionData } from "../components/select-candidate-dialog";
import { EmploymentTypeRequiredDialog } from "../components/employment-type-required-dialog";
import { ONBOARDING_REJECTION_REASONS, RejectCandidateDialog, RejectionData } from "../components/reject-candidate-dialog";
import { CreateEmployeeDialog } from "../components/createEmployee";
import { ShortlistCandidateDialog, ShortlistData } from "../components/shortlist-candidate-dialog";
import { OnboardingDetailsView } from "../components/onboarding-details-view";
import { InterviewRemarksDialog } from "../components/interview-remarks-dialog";
import { formatDateToLocalString, isDateBeforeToday } from "@/lib/utils";
import {
  InterviewerSelect,
  type InterviewerOption,
} from "../components/interviewer-select";

// Import refactored modules
import { Candidate } from "./types";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  formatEmploymentType,
  type EmploymentType,
} from "./constants";
import { useCandidate } from "./hooks/useCandidate";
import { useCandidateActions } from "./hooks/useCandidateActions";
import { useCandidatePermissions } from "./hooks/useCandidatePermissions";
import { convertTo24Hour, formatSalary } from "./utils/time-utils";
import {
  getCandidateOfficeCity,
  getCandidateOfficePostingLocation,
} from "./utils/officeAddressFromCandidate";
import { generateUnsignedOfferLetter as requestUnsignedOfferLetter } from "./utils/pdf-generators";
import { CandidateHeader } from "./components/CandidateHeader";
import {
  hiringBackLabel,
  peopleListPath,
  safeDashboardPath,
} from "@/features/people/navigation";
import { JobIdentitySelects } from "@/components/departments/job-identity-selects";

// During transition, optionally redirect to unified page:
// redirect(`/dashboard/people/${candidateId}`);

// Candidate interface is now imported from types.ts - removed duplicate definition

/**
 * Helper function to check if 10 days have passed since candidate status changed to onboarding
 * @param updatedAt - The updatedAt timestamp from candidate
 * @returns Object with isEnabled flag and daysRemaining count
 */
function checkOfferLetterAvailability(updatedAt: string | undefined): {
  isEnabled: boolean;
  daysRemaining: number | null;
} {
  if (!updatedAt) {
    return { isEnabled: false, daysRemaining: null };
  }
  
  const statusChangedDate = new Date(updatedAt);
  const tenDaysLater = new Date(statusChangedDate);
  tenDaysLater.setDate(tenDaysLater.getDate() + 10);
  const now = new Date();
  
  if (now < tenDaysLater) {
    const daysRemaining = Math.ceil(
      (tenDaysLater.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return { isEnabled: false, daysRemaining };
  }
  
  return { isEnabled: true, daysRemaining: 0 };
}

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const candidateId = params?.id as string;
  const hiringReturnTo = safeDashboardPath(
    searchParams.get("returnTo"),
    peopleListPath()
  );

  // Use refactored hooks
  const { candidate, loading, error: candidateError, refreshCandidate, setCandidate } = useCandidate(candidateId);
  const { actionLoading, error: actionError, handleSelectCandidate, handleShortlistCandidate, handleRejectCandidate, handleRejectFromOnboarding, handleDiscontinueTraining, handleOnboarding } = useCandidateActions(candidateId, (updatedCandidate) => {
    setCandidate(updatedCandidate);
  });
  const { canShortlist, canSelect, canReject, canRejectFromOnboarding, canDiscontinueTraining, canStartOnboarding, canCreateEmployee, canScheduleInterview, canScheduleSecondRound, hasInterviewRemarks, hasAnyInterviewScheduled, hasEmploymentType } = useCandidatePermissions(candidate);
  
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  
  // Combine errors
  useEffect(() => {
    setError(candidateError || actionError || null);
  }, [candidateError, actionError]);

  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [employmentTypeRequiredDialogOpen, setEmploymentTypeRequiredDialogOpen] =
    useState(false);
  const [shortlistDialogOpen, setShortlistDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectAfterTrainingDialogOpen, setRejectAfterTrainingDialogOpen] = useState(false);
  const [rejectFromOnboardingDialogOpen, setRejectFromOnboardingDialogOpen] = useState(false);
  const [createEmployeeDialogOpen, setCreateEmployeeDialogOpen] =
    useState(false);
  const [scheduleInterviewDialogOpen, setScheduleInterviewDialogOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(undefined);
  const [interviewHour, setInterviewHour] = useState<string>("4");
  const [interviewMinute, setInterviewMinute] = useState<string>("00");
  const [interviewAmPm, setInterviewAmPm] = useState<"AM" | "PM">("PM");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [interviewMode, setInterviewMode] = useState<"physical" | "virtual" | "">(
    ""
  );
  const [interviewOfficeId, setInterviewOfficeId] = useState<string>("");
  const [interviewerEmployeeId, setInterviewerEmployeeId] = useState("");
  const [schedulingInterview, setSchedulingInterview] = useState(false);

  // Second Round Interview states
  const [scheduleSecondRoundDialogOpen, setScheduleSecondRoundDialogOpen] = useState(false);
  const [showSecondRoundConfirmation, setShowSecondRoundConfirmation] = useState(false);
  const [secondRoundDate, setSecondRoundDate] = useState<Date | undefined>(undefined);
  const [secondRoundHour, setSecondRoundHour] = useState<string>("4");
  const [secondRoundMinute, setSecondRoundMinute] = useState<string>("00");
  const [secondRoundAmPm, setSecondRoundAmPm] = useState<"AM" | "PM">("PM");
  const [secondRoundNotes, setSecondRoundNotes] = useState("");
  const [secondRoundInterviewMode, setSecondRoundInterviewMode] = useState<
    "physical" | "virtual" | ""
  >("");
  const [secondRoundOfficeId, setSecondRoundOfficeId] = useState<string>("");
  const [secondRoundInterviewerEmployeeId, setSecondRoundInterviewerEmployeeId] =
    useState("");
  const [schedulingSecondRound, setSchedulingSecondRound] = useState(false);
  const [interviewers, setInterviewers] = useState<InterviewerOption[]>([]);
  const [interviewersLoading, setInterviewersLoading] = useState(false);

  useEffect(() => {
    if (!scheduleInterviewDialogOpen && !scheduleSecondRoundDialogOpen) return;
    let cancelled = false;
    const loadInterviewers = async () => {
      setInterviewersLoading(true);
      try {
        const response = await fetch("/api/employee/interviewers");
        const result = (await response.json()) as {
          success?: boolean;
          data?: InterviewerOption[];
        };
        if (!cancelled && result.success && Array.isArray(result.data)) {
          setInterviewers(result.data);
        }
      } catch (loadError) {
        console.error("Failed to load interviewers", loadError);
      } finally {
        if (!cancelled) setInterviewersLoading(false);
      }
    };
    void loadInterviewers();
    return () => {
      cancelled = true;
    };
  }, [scheduleInterviewDialogOpen, scheduleSecondRoundDialogOpen]);

  // convertTo24Hour is now imported from utils/time-utils
  const [interviewRemarksDialogOpen, setInterviewRemarksDialogOpen] = useState(false);
  const [remarksExpanded, setRemarksExpanded] = useState(true);
  const [resumeExpanded, setResumeExpanded] = useState(true);
  const [trainingAgreementExpanded, setTrainingAgreementExpanded] = useState(true);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editJobPositionId, setEditJobPositionId] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [updatingEmploymentType, setUpdatingEmploymentType] = useState(false);
  const [updatingOfficeAddress, setUpdatingOfficeAddress] = useState(false);
  const [officeOptions, setOfficeOptions] = useState<
    { _id: string; name: string; city: string }[]
  >([]);
  const [unsignedTrainingAgreementUrl, setUnsignedTrainingAgreementUrl] = useState<string | null>(null);
  const [generatingUnsignedPdf, setGeneratingUnsignedPdf] = useState(false);
  const [showSignedPdfDialog, setShowSignedPdfDialog] = useState(false);
  const [showUnsignedPdfDialog, setShowUnsignedPdfDialog] = useState(false);
  const [onboardingAgreementExpanded, setOnboardingAgreementExpanded] = useState(false);
  const [unsignedOnboardingAgreementUrl, setUnsignedOnboardingAgreementUrl] = useState<string | null>(null);
  const [generatingUnsignedOnboardingPdf, setGeneratingUnsignedOnboardingPdf] = useState(false);
  const [showSignedOnboardingPdfDialog, setShowSignedOnboardingPdfDialog] = useState(false);
  const [showUnsignedOnboardingPdfDialog, setShowUnsignedOnboardingPdfDialog] = useState(false);
  
  // HR Policies and Letter of Intent states
  const [hrPoliciesExpanded, setHrPoliciesExpanded] = useState(false);
  const [letterOfIntentExpanded, setLetterOfIntentExpanded] = useState(false);
  const [unsignedHrPoliciesUrl, setUnsignedHrPoliciesUrl] = useState<string | null>(null);
  const [unsignedLetterOfIntentUrl, setUnsignedLetterOfIntentUrl] = useState<string | null>(null);
  const [generatingHrPoliciesPdf, setGeneratingHrPoliciesPdf] = useState(false);
  const [generatingLetterOfIntentPdf, setGeneratingLetterOfIntentPdf] = useState(false);
  const [showSignedHrPoliciesDialog, setShowSignedHrPoliciesDialog] = useState(false);
  const [showUnsignedHrPoliciesDialog, setShowUnsignedHrPoliciesDialog] = useState(false);
  const [showSignedLetterOfIntentDialog, setShowSignedLetterOfIntentDialog] = useState(false);
  const [showUnsignedLetterOfIntentDialog, setShowUnsignedLetterOfIntentDialog] = useState(false);
  
  // Re-signature request states
  const [resignatureDialogOpen, setResignatureDialogOpen] = useState(false);
  const [resignatureAgreementType, setResignatureAgreementType] = useState<"training" | "onboarding" | null>(null);
  const [resignatureReason, setResignatureReason] = useState("");
  const [requestingResignature, setRequestingResignature] = useState(false);
  const [resignatureLink, setResignatureLink] = useState<string | null>(null);
  
  // Send Offer Letter state
  const [sendingOfferLetter, setSendingOfferLetter] = useState(false);
  
  // Offer Letter PDF states
  const [offerLetterExpanded, setOfferLetterExpanded] = useState(false);
  const [unsignedOfferLetterUrl, setUnsignedOfferLetterUrl] = useState<string | null>(null);
  const [generatingUnsignedOfferLetterPdf, setGeneratingUnsignedOfferLetterPdf] = useState(false);
  const [showSignedOfferLetterPdfDialog, setShowSignedOfferLetterPdfDialog] = useState(false);
  const [showUnsignedOfferLetterPdfDialog, setShowUnsignedOfferLetterPdfDialog] = useState(false);
  
  // Additional Documents states
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [additionalDocumentsExpanded, setAdditionalDocumentsExpanded] = useState(false);
  const { uploadFiles } = useBunnyUpload();

  const generateUnsignedTrainingAgreement = async () => {
    if (!candidate || !candidate.name || !candidate.position) return;
    
    setGeneratingUnsignedPdf(true);
    try {
      // Use ISO date string format for proper parsing
      const agreementDate = new Date().toISOString();
      const agreementPayload = {
        candidateName: candidate.name,
        position: candidate.position,
        date: agreementDate,
          candidateId: candidate._id,
        // No signature for unsigned PDF
      };

      const pdfResponse = await axios.post(
        "/api/candidates/trainingAgreement",
        agreementPayload,
        {
          responseType: "arraybuffer",
          headers: { "Content-Type": "application/json" },
        }
      );

      const pdfBlob = new Blob([pdfResponse.data], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(pdfBlob);
      setUnsignedTrainingAgreementUrl(url);
    } catch (error: any) {
      console.error("Error generating unsigned training agreement PDF:", error);
    } finally {
      setGeneratingUnsignedPdf(false);
    }
  };

  const generateUnsignedHrPolicies = async () => {
    if (!candidate || !candidate.name || !candidate.position) return;
    
    setGeneratingHrPoliciesPdf(true);
    try {
      // Use ISO date string format for proper parsing
      const agreementDate = new Date().toISOString();
      const hrPoliciesPayload = {
        candidateName: candidate.name,
        position: candidate.position,
        date: agreementDate,
        // No signature for unsigned PDF
      };

      const pdfResponse = await axios.post(
        "/api/candidates/hrPolicies",
        hrPoliciesPayload,
        {
          responseType: "arraybuffer",
          headers: { "Content-Type": "application/json" },
        }
      );

      const pdfBlob = new Blob([pdfResponse.data], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(pdfBlob);
      setUnsignedHrPoliciesUrl(url);
    } catch (error: any) {
      console.error("Error generating unsigned HR Policies PDF:", error);
      toast.error("Failed to generate HR Policies PDF");
      } finally {
      setGeneratingHrPoliciesPdf(false);
    }
  };

  const generateUnsignedLetterOfIntent = async () => {
    if (!candidate || !candidate.name || !candidate.position) return;
    
    setGeneratingLetterOfIntentPdf(true);
    try {
      // Use ISO date string format for proper parsing
      const agreementDate = new Date().toISOString();
      const letterOfIntentPayload = {
        candidateName: candidate.name,
        position: candidate.position,
        date: agreementDate,
        salary: candidate.selectionDetails?.salary?.toString() || undefined,
        candidateId: candidate._id,
        employmentType: candidate.employmentType ?? candidate.selectionDetails?.positionType,
      };

      const pdfResponse = await axios.post(
        "/api/candidates/letterOfIntent",
        letterOfIntentPayload,
        {
          responseType: "arraybuffer",
          headers: { "Content-Type": "application/json" },
        }
      );

      const pdfBlob = new Blob([pdfResponse.data], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(pdfBlob);
      setUnsignedLetterOfIntentUrl(url);
    } catch (error: any) {
      console.error("Error generating unsigned Letter of Intent PDF:", error);
      toast.error("Failed to generate Letter of Intent PDF");
    } finally {
      setGeneratingLetterOfIntentPdf(false);
    }
  };

  // Candidate fetching is now handled by useCandidate hook
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

  // Fetch active office addresses for HR assignment
  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const response = await fetch("/api/office-addresses?active=1");
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setOfficeOptions(
            result.data.map((o: { _id: string; name: string; city: string }) => ({
              _id: o._id,
              name: o.name,
              city: o.city,
            })),
          );
        }
      } catch (error) {
        console.error("Error fetching office addresses:", error);
      }
    };
    fetchOffices();
  }, []);

  const generateUnsignedOfferLetter = async () => {
    if (!candidate?.name) {
      toast.error("Candidate name is required to generate the offer letter");
      return;
    }

    if (!candidate.officeAddressId && !candidate.officeLocation) {
      toast.error("Assign an office address before generating the offer letter");
      return;
    }

    setGeneratingUnsignedOfferLetterPdf(true);
    try {
      const url = await requestUnsignedOfferLetter(candidate);
      setUnsignedOfferLetterUrl(url);
      setShowUnsignedOfferLetterPdfDialog(true);
    } catch (error: unknown) {
      console.error("Error generating unsigned offer letter PDF:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate offer letter PDF",
      );
    } finally {
      setGeneratingUnsignedOfferLetterPdf(false);
    }
  };

  const generateUnsignedOnboardingAgreement = async () => {
    if (!candidate || !candidate.name || !candidate.position) {
      console.log("Cannot generate unsigned onboarding PDF: missing candidate data");
      return;
    }
    
    setGeneratingUnsignedOnboardingPdf(true);
    try {
      const agreementPayload = {
        agreementDate: new Date().toISOString(),
        agreementCity: getCandidateOfficeCity(candidate),
        employeeName: candidate.name,
        fatherName: candidate.onboardingDetails?.personalDetails?.fatherName || "",
        employeeAddress: candidate.address || "",
        designation: candidate.position,
        effectiveFrom: new Date().toISOString(),
        postingLocation: getCandidateOfficePostingLocation(candidate),
        salaryINR: candidate.selectionDetails?.salary 
          ? `${candidate.selectionDetails.salary} per month`
          : "As per employment terms",
        witness1: "____________________",
        witness2: "____________________",
        candidateId: candidate._id, // Pass candidateId so API can fetch stored onboardingStartedAt date
        employmentType:
          candidate.employmentType ?? candidate.selectionDetails?.positionType,
        // No signature for unsigned PDF - this is the key difference
      };

      console.log("Generating unsigned onboarding PDF with payload:", agreementPayload);

      const pdfResponse = await axios.post(
        "/api/candidates/onboardingDocument",
        agreementPayload,
        {
          responseType: "arraybuffer",
          headers: { "Content-Type": "application/json" },
        }
      );

      const pdfBlob = new Blob([pdfResponse.data], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(pdfBlob);
      setUnsignedOnboardingAgreementUrl(url);
      console.log("Unsigned onboarding PDF generated successfully");
    } catch (error: any) {
      console.error("Error generating unsigned onboarding agreement PDF:", error);
      console.error("Error details:", error.response?.data || error.message);
    } finally {
      setGeneratingUnsignedOnboardingPdf(false);
    }
  };

  // Generate unsigned PDF when candidate is loaded and status is selected
  useEffect(() => {
    if (candidate && candidate.status === "selected" && candidate.name && candidate.position && !unsignedTrainingAgreementUrl && !generatingUnsignedPdf) {
      generateUnsignedTrainingAgreement();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate]);

  // Generate unsigned onboarding PDF if candidate is in onboarding or has completed onboarding
  useEffect(() => {
    if (candidate && (candidate.status === "onboarding" || candidate.onboardingDetails?.onboardingComplete) && candidate.name && candidate.position && !unsignedOnboardingAgreementUrl && !generatingUnsignedOnboardingPdf) {
      console.log("Triggering unsigned onboarding PDF generation");
      generateUnsignedOnboardingAgreement();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate]);


  // refreshCandidate, handleSelectCandidate, handleShortlistCandidate, etc. are now from hooks
  const refreshCandidateWrapper = async () => {
    await refreshCandidate();
  };

  const canVerify = userRole === "HR" || userRole === "SuperAdmin";

  // Wrapper functions to close dialogs after actions
  const handleSelectCandidateWrapper = async (data: SelectionData) => {
    const result = await handleSelectCandidate(data);
    if (result.success) {
      setSelectDialogOpen(false);
    }
  };

  const handleShortlistCandidateWrapper = async (data: ShortlistData) => {
    const result = await handleShortlistCandidate(data);
      if (result.success) {
      setShortlistDialogOpen(false);
    }
  };

  const handleRejectCandidateWrapper = async (data: RejectionData) => {
    const result = await handleRejectCandidate(data);
    if (result.success) {
      setRejectDialogOpen(false);
    }
  };

  const handleDiscontinueTrainingWrapper = async (data: RejectionData) => {
    const result = await handleDiscontinueTraining(data);
      if (result.success) {
      setRejectAfterTrainingDialogOpen(false);
    }
  };

  const handleRejectFromOnboardingWrapper = async (data: RejectionData) => {
    const result = await handleRejectFromOnboarding(data);
    if (result.success) {
      setRejectFromOnboardingDialogOpen(false);
    }
  };

  const handleOnboardingWrapper = async () => {
    await handleOnboarding();
  };

  const saveEmploymentType = async (
    employmentType: EmploymentType | null,
    options?: { silent?: boolean }
  ): Promise<boolean> => {
    if (!candidate) return false;

    setUpdatingEmploymentType(true);
    try {
      const response = await fetch(`/api/candidates/${candidate._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employmentType }),
      });

      const result = await response.json();
      if (result.success) {
        setCandidate((prev) =>
          prev ? { ...prev, employmentType } : null
        );
        if (!options?.silent) {
          toast.success("Employment type updated");
        }
        return true;
      }
      toast.error(result.error || "Failed to update employment type");
      return false;
    } catch (error) {
      console.error("Error updating employment type:", error);
      toast.error("Failed to update employment type");
      return false;
    } finally {
      setUpdatingEmploymentType(false);
    }
  };

  const handleEmploymentTypeChange = async (value: string) => {
    const employmentType: EmploymentType | null =
      value === "fulltime" || value === "intern" ? value : null;
    await saveEmploymentType(employmentType);
  };

  const handleOfficeAddressChange = async (value: string) => {
    if (!candidate || value === "unset") return;
    setUpdatingOfficeAddress(true);
    try {
      const res = await axios.patch(`/api/candidates/${candidateId}`, {
        officeAddressId: value,
      });
      if (res.data?.success && res.data?.data) {
        setCandidate(res.data.data);
        toast.success("Office address updated");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error || "Failed to update office address",
      );
    } finally {
      setUpdatingOfficeAddress(false);
    }
  };

  const handleSelectForTrainingClick = () => {
    if (!candidate || !canSelect()) return;

    if (hasEmploymentType()) {
      setSelectDialogOpen(true);
      return;
    }

    setEmploymentTypeRequiredDialogOpen(true);
  };

  const handleEmploymentTypeRequiredConfirm = async (
    employmentType: EmploymentType
  ) => {
    const saved = await saveEmploymentType(employmentType, { silent: true });
    if (!saved) return;

    setEmploymentTypeRequiredDialogOpen(false);
    setSelectDialogOpen(true);
  };

  // Handle edit role
  const handleEditRole = () => {
    if (!candidate) return;
    setEditDepartmentId(candidate.departmentId ? String(candidate.departmentId) : "");
    setEditJobPositionId(candidate.jobPositionId ? String(candidate.jobPositionId) : "");
    setEditRoleDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!candidate || !editDepartmentId || !editJobPositionId) return;

    setUpdatingRole(true);
    try {
      const response = await fetch(`/api/candidates/${candidate._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: editDepartmentId,
          jobPositionId: editJobPositionId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        const updatedCandidate = result.data as Candidate | undefined;
        setCandidate((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            position: updatedCandidate?.position || prev.position,
            department: updatedCandidate?.department || prev.department,
            departmentId: editDepartmentId,
            jobPositionId: editJobPositionId,
            selectionDetails: prev.selectionDetails
              ? {
                  ...prev.selectionDetails,
                  role: updatedCandidate?.position || prev.selectionDetails.role,
                }
              : prev.selectionDetails,
          };
        });
        toast.success("Job title updated");
        setEditRoleDialogOpen(false);
      } else {
        toast.error(result.error || "Failed to update job title");
      }
    } catch (error) {
      console.error("Error updating job title:", error);
      toast.error("Failed to update job title");
    } finally {
      setUpdatingRole(false);
    }
  };

  // Handle request re-signature
  const handleRequestResignature = async () => {
    if (!candidate || !resignatureAgreementType) return;

    setRequestingResignature(true);
    try {
      const response = await fetch(`/api/candidates/${candidate._id}/request-resignature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementType: resignatureAgreementType,
          reason: resignatureReason || null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setResignatureLink(result.data.resignatureLink);
        toast.success("Re-signature request sent to candidate");
        await refreshCandidate();
      } else {
        toast.error(result.error || "Failed to request re-signature");
      }
    } catch (error) {
      console.error("Error requesting re-signature:", error);
      toast.error("Failed to request re-signature");
    } finally {
      setRequestingResignature(false);
    }
  };

  // Handle cancel re-signature request
  const handleCancelResignature = async (agreementType: "training" | "onboarding") => {
    if (!candidate) return;

    try {
      const response = await fetch(`/api/candidates/${candidate._id}/request-resignature?agreementType=${agreementType}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Re-signature request cancelled");
        await refreshCandidate();
      } else {
        toast.error(result.error || "Failed to cancel re-signature request");
      }
    } catch (error) {
      console.error("Error cancelling re-signature request:", error);
      toast.error("Failed to cancel re-signature request");
    }
  };

  // Copy link to clipboard
  const copyResignatureLink = () => {
    if (resignatureLink) {
      navigator.clipboard.writeText(resignatureLink);
      toast.success("Link copied to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="-m-2 flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-white dark:bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-[#636366] dark:text-[#aeaeb2]" aria-hidden />
        <p className="text-sm text-[#636366] dark:text-[#aeaeb2]">Loading candidate</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="-m-2 min-h-[50vh] bg-white p-8 dark:bg-background">
        <div className="space-y-3">
          <p className="text-base text-[#1d1d1f] dark:text-[#f5f5f7]">
            This candidate record is not available.
          </p>
          <Link
            href={hiringReturnTo}
            className="inline-flex min-h-9 items-center text-sm text-[#0040dd] underline decoration-[#0040dd]/40 underline-offset-2 dark:text-[#64b5ff]"
          >
            {hiringBackLabel(hiringReturnTo)}
          </Link>
        </div>
      </div>
    );
  }

  const nextAction = canCreateEmployee()
    ? "employee"
    : canStartOnboarding()
      ? "onboarding"
      : canSelect() && candidate.status !== "pending"
        ? "select"
        : hasAnyInterviewScheduled() && canVerify && !hasInterviewRemarks()
          ? "remarks"
          : canScheduleInterview()
            ? "interview"
            : null;

  const handleScheduleInterview = async () => {
    if (!candidate || !interviewDate) {
      toast.error("Please select an interview date");
      return;
    }
    if (!interviewMode) {
      toast.error("Please select Physical or Virtual interview");
      return;
    }
    if (interviewMode === "physical" && !interviewOfficeId) {
      toast.error("Please select an office for the physical interview");
      return;
    }
    if (!interviewerEmployeeId) {
      toast.error("Please select an interviewer");
      return;
    }

    setSchedulingInterview(true);
    setError(null);
    try {
      // Use local date components to prevent timezone shifts
      // This ensures the selected calendar date is preserved exactly as chosen
      const dateString = formatDateToLocalString(interviewDate);
      const time24Hour = convertTo24Hour(interviewHour, interviewMinute, interviewAmPm);

      const response = await fetch(
        `/api/candidates/${candidate._id}/schedule-interview`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledDate: dateString,
            scheduledTime: time24Hour,
            interviewMode,
            officeAddressId:
              interviewMode === "physical" ? interviewOfficeId : undefined,
            notes: interviewNotes || undefined,
            interviewerEmployeeId,
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
        setInterviewMode("");
        setInterviewOfficeId("");
        setInterviewerEmployeeId("");
        // Refresh candidate data
        await refreshCandidate();
      } else {
        setError(result.error || "Failed to schedule interview");
        toast.error(result.error || "Failed to schedule interview");
      }
    } catch (error) {
      console.error("Error scheduling interview:", error);
      setError("Failed to schedule interview");
      toast.error("Failed to schedule interview");
    } finally {
      setSchedulingInterview(false);
    }
  };

  const handleScheduleSecondRound = async () => {
    if (!candidate || !secondRoundDate) {
      toast.error("Please select an interview date");
      return;
    }
    if (!secondRoundInterviewMode) {
      toast.error("Please select Physical or Virtual interview");
      return;
    }
    if (secondRoundInterviewMode === "physical" && !secondRoundOfficeId) {
      toast.error("Please select an office for the physical interview");
      return;
    }
    if (!secondRoundInterviewerEmployeeId) {
      toast.error("Please select an interviewer");
      return;
    }

    // Final check before scheduling
    if (!canScheduleSecondRound()) {
      toast.error("Second round interview is already scheduled");
      setScheduleSecondRoundDialogOpen(false);
      return;
    }

    setSchedulingSecondRound(true);
    setError(null);
    try {
      const dateString = formatDateToLocalString(secondRoundDate);
      const time24Hour = convertTo24Hour(secondRoundHour, secondRoundMinute, secondRoundAmPm);

      const response = await fetch(
        `/api/candidates/${candidate._id}/schedule-second-round`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledDate: dateString,
            scheduledTime: time24Hour,
            interviewMode: secondRoundInterviewMode,
            officeAddressId:
              secondRoundInterviewMode === "physical"
                ? secondRoundOfficeId
                : undefined,
            notes: secondRoundNotes || undefined,
            interviewerEmployeeId: secondRoundInterviewerEmployeeId,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success("Second round interview scheduled successfully");
        setScheduleSecondRoundDialogOpen(false);
        setSecondRoundDate(undefined);
        setSecondRoundHour("4");
        setSecondRoundMinute("00");
        setSecondRoundAmPm("PM");
        setSecondRoundNotes("");
        setSecondRoundInterviewMode("");
        setSecondRoundOfficeId("");
        setSecondRoundInterviewerEmployeeId("");
        setShowSecondRoundConfirmation(false);
        await refreshCandidate();
      } else {
        setError(result.error || "Failed to schedule second round interview");
        toast.error(result.error || "Failed to schedule second round interview");
      }
    } catch (error) {
      console.error("Error scheduling second round interview:", error);
      setError("Failed to schedule second round interview");
      toast.error("Failed to schedule second round interview");
    } finally {
      setSchedulingSecondRound(false);
    }
  };

  const handleRescheduleRequest = async (action: "approve" | "reject", interviewType: "first" | "second") => {
    if (!candidate) return;

    // rescheduleLoading state is declared at component top level
    setRescheduleLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/candidates/${candidate._id}/approve-reschedule`,
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
        await refreshCandidate();
      } else {
        setError(result.error || `Failed to ${action} reschedule request`);
        toast.error(result.error || `Failed to ${action} reschedule request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing reschedule request:`, error);
      setError(`Failed to ${action} reschedule request`);
      toast.error(`Failed to ${action} reschedule request`);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const openSecondRoundDialog = () => {
    // Check if second round can be scheduled
    if (!canScheduleSecondRound()) {
      toast.error("Second round interview is already scheduled");
      return;
    }
    setShowSecondRoundConfirmation(true);
  };

  const confirmSecondRound = () => {
    // Double-check if second round can be scheduled
    if (!canScheduleSecondRound()) {
      toast.error("Second round interview is already scheduled");
      setShowSecondRoundConfirmation(false);
      return;
    }
    setShowSecondRoundConfirmation(false);
    setSecondRoundInterviewMode("");
    setSecondRoundOfficeId("");
    setScheduleSecondRoundDialogOpen(true);
  };

  const getButtonTooltip = (action: string) => {
    if (!candidate) return "";

    switch (action) {
      case "shortlist":
        if (candidate.status === "shortlisted") return "Candidate is already shortlisted";
        if (candidate.status === "selected") return "Cannot shortlist a selected candidate";
        if (candidate.status === "rejected") return "Cannot shortlist a rejected candidate";
        if (candidate.status === "onboarding") return "Cannot shortlist during onboarding";
        return "Shortlist this candidate";
      
      case "select":
        if (candidate.status === "selected") return "Candidate is already selected for training";
        if (candidate.status === "rejected") return "Cannot select a rejected candidate";
        if (candidate.status === "onboarding") return "Candidate is already in onboarding";
        if (candidate.status === "interview" && !hasInterviewRemarks()) return "Interview remarks must be completed before selecting";
        if (!hasEmploymentType()) return "Set employment type (Intern or Full Time) before selecting for training";
        return "Select this candidate for training";
      
      case "discontinue":
        if (candidate.status !== "selected") return "Can only discontinue training for candidates selected for training";
        return "Discontinue training for this candidate";
      
      case "reject":
        if (candidate.status === "rejected") return "Candidate is already rejected";
        if (candidate.status === "onboarding") {
          return candidate.employeeId
            ? "Employed people cannot be rejected. Mark them as exited instead."
            : "Use Reject from onboarding";
        }
        if (candidate.status === "interview" && !hasInterviewRemarks()) return "Interview remarks must be completed before rejecting";
        return "Reject this candidate";

      case "rejectFromOnboarding":
        if (!canRejectFromOnboarding()) return "Only available for onboarding candidates who are not employed";
        return "Reject from onboarding. This is recorded separately from a hiring rejection.";
      
      case "onboarding":
        if (candidate.status === "onboarding") return candidate.onboardingDetails?.onboardingComplete ? "Onboarding completed" : "Onboarding in progress";
        if (candidate.status !== "selected") return "Can only start onboarding for selected candidates";
        return "Send onboarding link to candidate";
      
      case "employee":
        if (candidate.status !== "onboarding") return "Can only create employee after selection";
        if (!candidate.onboardingDetails?.onboardingComplete) return "Candidate must complete onboarding first";
        return "Create employee profile";
      
      default:
        return "";
    }
  };

  return (
    <div className="-m-2 min-h-screen bg-white text-[#1d1d1f] dark:bg-background dark:text-foreground">
      <CandidateHeader
        candidate={candidate}
        backHref={hiringReturnTo}
        backLabel={hiringBackLabel(hiringReturnTo)}
      />

      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-[#fdecec] px-4 py-3 text-sm text-[#8b1e1e] sm:mb-4 dark:bg-[#3a1010] dark:text-[#ffb4b4]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <div className="grid items-start gap-3 sm:gap-4 xl:grid-cols-[minmax(0,3.5fr)_minmax(0,8.5fr)] xl:gap-5">
          <div className="order-2 min-w-0 space-y-3 sm:space-y-4 xl:order-1">
            {/* Contact Information */}
            <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
              <h3 className="text-sm font-medium text-[#636366] dark:text-[#aeaeb2]">
                Reach {candidate.name.split(" ")[0]}
              </h3>
              <a
                href={`tel:${candidate?.phone}`}
                className="mt-2 block text-lg font-semibold tracking-tight text-[#1d1d1f] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] dark:text-[#f5f5f7]"
              >
                {candidate.phone}
              </a>
              <a
                href={`mailto:${candidate?.email}`}
                className="mt-1 block break-all text-base text-[#0040dd] underline decoration-[#0040dd]/30 underline-offset-4 hover:decoration-[#0040dd] dark:text-[#64b5ff]"
              >
                {candidate.email}
              </a>
              {candidate.address ? (
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#3a3a3c] dark:text-[#d1d1d6]">
                  {candidate.address}
                </p>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#636366] dark:text-[#aeaeb2]">
                    Office
                  </Label>
                  <Select
                    value={
                      typeof candidate.officeAddressId === "object" &&
                      candidate.officeAddressId?._id
                        ? candidate.officeAddressId._id
                        : typeof candidate.officeAddressId === "string"
                          ? candidate.officeAddressId
                          : "unset"
                    }
                    onValueChange={handleOfficeAddressChange}
                    disabled={updatingOfficeAddress}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select office address" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset" disabled>
                        Not set
                      </SelectItem>
                      {officeOptions.map((opt) => (
                        <SelectItem key={opt._id} value={opt._id}>
                          {opt.name} ({opt.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!candidate.officeAddressId && (
                    <p className="rounded-lg bg-[#fff4d4] px-3 py-2 text-sm text-[#7a4e00] dark:bg-[#3a2a08] dark:text-[#ffd60a]">
                      Set an office before generating training, onboarding, or offer letter PDFs.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#636366] dark:text-[#aeaeb2]">
                    Employment
                  </Label>
                  <Select
                    value={candidate.employmentType ?? "unset"}
                    onValueChange={handleEmploymentTypeChange}
                    disabled={updatingEmploymentType}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not set</SelectItem>
                      {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {candidate.selectionDetails?.positionType &&
                    candidate.selectionDetails.positionType !== candidate.employmentType && (
                      <p className="text-sm text-[#636366] dark:text-[#aeaeb2]">
                        Selected for training as{" "}
                        {formatEmploymentType(candidate.selectionDetails.positionType)}
                      </p>
                    )}
                </div>
              </div>
            </Card>

            {/* Interview Schedule */}
            {candidate.status === "interview" && candidate.interviewDetails && (
              <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
                <h3 className="mb-3 text-sm font-semibold text-[#636366] dark:text-[#aeaeb2]">
                  Interview
                </h3>
                <div className="space-y-2 text-sm">
                  {candidate.interviewDetails.scheduledDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="text-foreground font-medium">
                        {new Date(candidate.interviewDetails.scheduledDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  {candidate.interviewDetails.scheduledTime && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="text-foreground font-medium">
                        {candidate.interviewDetails.scheduledTime}
                      </span>
                    </div>
                  )}
                  {candidate.interviewDetails.interviewMode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode</span>
                      <span className="text-foreground font-medium capitalize">
                        {candidate.interviewDetails.interviewMode}
                      </span>
                    </div>
                  )}
                  {candidate.interviewDetails.interviewMode === "physical" &&
                    candidate.interviewDetails.officeName && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground shrink-0">Office</span>
                      <span className="text-foreground font-medium text-right">
                        {candidate.interviewDetails.officeName}
                      </span>
                    </div>
                  )}
                  {candidate.interviewDetails.interviewerName && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Interviewer</span>
                      <span className="text-foreground font-medium text-right">
                        {candidate.interviewDetails.interviewerName}
                      </span>
                    </div>
                  )}
                  {candidate.interviewDetails.googleMeetLink && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Meet</span>
                      <a
                        href={candidate.interviewDetails.googleMeetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary font-medium underline-offset-4 hover:underline"
                      >
                        Join
                      </a>
                    </div>
                  )}
                  {candidate.interviewDetails.calendarSyncError && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Calendar was not updated: {candidate.interviewDetails.calendarSyncError}
                    </p>
                  )}
                  {candidate.interviewDetails.scheduledBy && (
                    <div className="pt-2 mt-2 border-t text-sm text-[#636366] dark:text-[#aeaeb2]">
                      Scheduled by {candidate.interviewDetails.scheduledBy}
                    </div>
                  )}
                </div>
                {/* Reschedule Request */}
                {candidate.interviewDetails.rescheduleRequest?.status === "pending" && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="border-transparent bg-[#fff4d4] text-sm font-medium text-[#7a4e00] dark:bg-[#3a2a08] dark:text-[#ffd60a]">
                            Reschedule requested
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">Requested Date: </span>
                            <span className="font-medium text-foreground">
                              {candidate.interviewDetails.rescheduleRequest.requestedDate
                                ? new Date(candidate.interviewDetails.rescheduleRequest.requestedDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Requested Time: </span>
                            <span className="font-medium text-foreground">
                              {candidate.interviewDetails.rescheduleRequest.requestedTime || "N/A"}
                            </span>
                          </div>
                          {candidate.interviewDetails.rescheduleRequest.reason && (
                            <div>
                              <span className="text-muted-foreground">Reason: </span>
                              <span className="text-foreground">{candidate.interviewDetails.rescheduleRequest.reason}</span>
                            </div>
                          )}
                          {candidate.interviewDetails.rescheduleRequest.requestedAt && (
                            <div className="text-sm text-[#636366] dark:text-[#aeaeb2] mt-2">
                              Requested on {new Date(candidate.interviewDetails.rescheduleRequest.requestedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      {canVerify && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRescheduleRequest("approve", "first")}
                            disabled={rescheduleLoading}
                            className="h-9"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRescheduleRequest("reject", "first")}
                            disabled={rescheduleLoading}
                            className="h-9 bg-[#8b1e1e] text-white hover:bg-[#6f1818]"
                          >
                            <X className="w-4 h-4 mr-1" aria-hidden />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Second Round Interview Schedule */}
            {candidate.secondRoundInterviewDetails?.scheduledDate && (
              <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
                <h3 className="mb-3 text-sm font-semibold text-[#636366] dark:text-[#aeaeb2]">
                  Second Round Interview
                </h3>
                <div className="space-y-2 text-sm">
                  {candidate.secondRoundInterviewDetails.scheduledDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="text-foreground font-medium">
                        {new Date(candidate.secondRoundInterviewDetails.scheduledDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  {candidate.secondRoundInterviewDetails.scheduledTime && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="text-foreground font-medium">
                        {candidate.secondRoundInterviewDetails.scheduledTime}
                      </span>
                    </div>
                  )}
                  {candidate.secondRoundInterviewDetails.interviewMode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode</span>
                      <span className="text-foreground font-medium capitalize">
                        {candidate.secondRoundInterviewDetails.interviewMode}
                      </span>
                    </div>
                  )}
                  {candidate.secondRoundInterviewDetails.interviewMode ===
                    "physical" &&
                    candidate.secondRoundInterviewDetails.officeName && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground shrink-0">Office</span>
                      <span className="text-foreground font-medium text-right">
                        {candidate.secondRoundInterviewDetails.officeName}
                      </span>
                    </div>
                  )}
                  {candidate.secondRoundInterviewDetails.interviewerName && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Interviewer</span>
                      <span className="text-foreground font-medium text-right">
                        {candidate.secondRoundInterviewDetails.interviewerName}
                      </span>
                    </div>
                  )}
                  {candidate.secondRoundInterviewDetails.googleMeetLink && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Meet</span>
                      <a
                        href={candidate.secondRoundInterviewDetails.googleMeetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary font-medium underline-offset-4 hover:underline"
                      >
                        Join
                      </a>
                    </div>
                  )}
                  {candidate.secondRoundInterviewDetails.calendarSyncError && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Calendar was not updated: {candidate.secondRoundInterviewDetails.calendarSyncError}
                    </p>
                  )}
                  {candidate.secondRoundInterviewDetails.scheduledBy && (
                    <div className="pt-2 mt-2 border-t text-sm text-[#636366] dark:text-[#aeaeb2]">
                      Scheduled by {candidate.secondRoundInterviewDetails.scheduledBy}
                    </div>
                  )}
                </div>
                {/* Reschedule Request */}
                {candidate.secondRoundInterviewDetails.rescheduleRequest?.status === "pending" && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="border-transparent bg-[#fff4d4] text-sm font-medium text-[#7a4e00] dark:bg-[#3a2a08] dark:text-[#ffd60a]">
                            Reschedule requested
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">Requested Date: </span>
                            <span className="font-medium text-foreground">
                              {candidate.secondRoundInterviewDetails.rescheduleRequest.requestedDate
                                ? new Date(candidate.secondRoundInterviewDetails.rescheduleRequest.requestedDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Requested Time: </span>
                            <span className="font-medium text-foreground">
                              {candidate.secondRoundInterviewDetails.rescheduleRequest.requestedTime || "N/A"}
                            </span>
                          </div>
                          {candidate.secondRoundInterviewDetails.rescheduleRequest.reason && (
                            <div>
                              <span className="text-muted-foreground">Reason: </span>
                              <span className="text-foreground">{candidate.secondRoundInterviewDetails.rescheduleRequest.reason}</span>
                            </div>
                          )}
                          {candidate.secondRoundInterviewDetails.rescheduleRequest.requestedAt && (
                            <div className="text-sm text-[#636366] dark:text-[#aeaeb2] mt-2">
                              Requested on {new Date(candidate.secondRoundInterviewDetails.rescheduleRequest.requestedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      {canVerify && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRescheduleRequest("approve", "second")}
                            disabled={rescheduleLoading}
                            className="h-9"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRescheduleRequest("reject", "second")}
                            disabled={rescheduleLoading}
                            className="h-9 bg-[#8b1e1e] text-white hover:bg-[#6f1818]"
                          >
                            <X className="w-4 h-4 mr-1" aria-hidden />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Actions */}
            <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
              <h3 className="mb-3 text-sm font-medium text-[#636366] dark:text-[#aeaeb2]">
                What you can do
              </h3>
              <TooltipProvider>
                <div className="flex flex-wrap gap-2 [&>div]:w-fit">
                  {/* Schedule Interview Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={(e) => {
                            if (!canScheduleInterview()) {
                              e.preventDefault();
                              e.stopPropagation();
                              toast.error("Interview is already scheduled");
                              return;
                            }
                            setScheduleInterviewDialogOpen(true);
                            setInterviewDate(undefined);
                            setInterviewHour("4");
                            setInterviewMinute("00");
                            setInterviewAmPm("PM");
                            setInterviewNotes("");
                            setInterviewMode("");
                            setInterviewOfficeId("");
                          }}
                          disabled={actionLoading || !canScheduleInterview()}
                          variant={nextAction === "interview" ? "default" : "outline"}
                          size="sm"
                          className="h-9 justify-start px-3 text-sm font-medium"
                        >
                          <Calendar className="mr-1.5 h-4 w-4" aria-hidden />
                          {canScheduleInterview() ? "Schedule Interview" : "Interview Scheduled"}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{candidate.status === "interview" ? "Interview already scheduled" : "Schedule interview"}</p></TooltipContent>
                  </Tooltip>

                  {/* Interview Remarks Button */}
                  {/* Show remarks button if any interview (first or second round) is scheduled */}
                  {hasAnyInterviewScheduled() && canVerify && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            onClick={() => setInterviewRemarksDialogOpen(true)}
                            variant={nextAction === "remarks" ? "default" : "outline"}
                            size="sm"
                            className="h-9 justify-start px-3 text-sm font-medium"
                          >
                            <FileText className="mr-1.5 h-4 w-4" aria-hidden />
                            {candidate.interviewDetails?.remarks?.evaluatedBy ? "Remarks Added" : "Add Remarks"}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p>{candidate.interviewDetails?.remarks?.evaluatedBy ? "Edit remarks" : "Add interview remarks"}</p></TooltipContent>
                    </Tooltip>
                  )}

                  {/* Edit Role Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={handleEditRole}
                          variant="outline"
                          size="sm"
                          className="h-9 justify-start px-3 text-sm font-medium"
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit job title
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>Edit department and job title</p></TooltipContent>
                  </Tooltip>

                  {/* Schedule Second Round Interview Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={(e) => {
                            if (!canScheduleSecondRound()) {
                              e.preventDefault();
                              e.stopPropagation();
                              return;
                            }
                            openSecondRoundDialog();
                          }}
                          disabled={actionLoading || !canScheduleSecondRound()}
                          variant="outline"
                          size="sm"
                          className="h-9 justify-start px-3 text-sm font-medium"
                        >
                          <Calendar className="mr-1.5 h-4 w-4" aria-hidden />
                          {candidate.secondRoundInterviewDetails?.scheduledDate ? "Second Round Scheduled" : "Schedule Second Round"}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{candidate.secondRoundInterviewDetails?.scheduledDate ? "Second round already scheduled" : "Schedule second round interview"}</p></TooltipContent>
                  </Tooltip>

                  {/* Shortlist Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={() => setShortlistDialogOpen(true)}
                          disabled={actionLoading || !canShortlist()}
                          variant="outline"
                          size="sm"
                          className="h-9 justify-start px-3 text-sm font-medium"
                        >
                          {candidate.status === "shortlisted" ? "Shortlisted" : "Shortlist"}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{getButtonTooltip("shortlist")}</p></TooltipContent>
                  </Tooltip>

                  {/* Select for Training Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={handleSelectForTrainingClick}
                          disabled={actionLoading || !canSelect()}
                          variant={nextAction === "select" ? "default" : "outline"}
                          size="sm"
                          className="h-9 justify-start px-3 text-sm font-medium"
                        >
                          {candidate.status === "selected" ? "Selected for Training" : "Select for Training"}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{getButtonTooltip("select")}</p></TooltipContent>
                  </Tooltip>

                  {/* Reject Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={() => setRejectDialogOpen(true)}
                          disabled={actionLoading || !canReject()}
                          variant={canReject() ? "destructive" : "outline"}
                          size="sm"
                          className={
                            canReject()
                              ? "h-9 w-full justify-start bg-[#8b1e1e] px-3 text-sm font-medium text-white hover:bg-[#6f1818]"
                              : "h-9 w-full justify-start px-3 text-sm font-medium"
                          }
                        >
                          {candidate.status === "rejected" ? "Rejected" : "Reject"}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{getButtonTooltip("reject")}</p></TooltipContent>
                  </Tooltip>

                  {(canStartOnboarding() || candidate.status === "onboarding") && (
                    <div className="my-2 border-t" />
                  )}

                  {/* Start Onboarding Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={handleOnboardingWrapper}
                          disabled={actionLoading || !canStartOnboarding()}
                          variant={nextAction === "onboarding" ? "default" : "outline"}
                          size="sm"
                          className="h-9 justify-start px-3 text-sm font-medium"
                        >
                          {candidate.status === "onboarding"
                            ? candidate.onboardingDetails?.onboardingComplete
                              ? "Onboarding Complete"
                              : "Onboarding in Progress"
                            : "Start Onboarding"}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{getButtonTooltip("onboarding")}</p></TooltipContent>
                  </Tooltip>

                  {/* Send Offer Letter Button - Only visible when onboarding */}
                  {candidate.status === "onboarding" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            onClick={async () => {
                              if (!candidate) return;
                              setSendingOfferLetter(true);
                              try {
                                const response = await axios.post(
                                  `/api/candidates/${candidateId}/send-offer-letter`
                                );
                                if (response.data.success) {
                                  toast.success("Offer letter sent successfully");
                                  refreshCandidate();
                                } else {
                                  throw new Error(response.data.error || "Failed to send offer letter");
                                }
                              } catch (error: any) {
                                console.error("Error sending offer letter:", error);
                                toast.error(
                                  error.response?.data?.error ||
                                  error.message ||
                                  "Failed to send offer letter"
                                );
                              } finally {
                                setSendingOfferLetter(false);
                              }
                            }}
                            disabled={
                              sendingOfferLetter ||
                              !checkOfferLetterAvailability((candidate as any).updatedAt).isEnabled
                            }
                            variant="outline"
                            size="sm"
                            className="h-9 justify-start px-3 text-sm font-medium"
                          >
                            {sendingOfferLetter ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Offer Letter
                              </>
                            )}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {(() => {
                            const { isEnabled, daysRemaining } = checkOfferLetterAvailability(
                              (candidate as any).updatedAt
                            );
                            if (!isEnabled) {
                              if (daysRemaining === null) {
                                return "Offer letter can be sent 10 days after onboarding status";
                              }
                              return `Offer letter will be enabled in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`;
                            }
                            return "Send offer letter to candidate via email";
                          })()}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {canRejectFromOnboarding() && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            onClick={() => setRejectFromOnboardingDialogOpen(true)}
                            disabled={actionLoading}
                            variant="destructive"
                            size="sm"
                            className="h-9 w-full justify-start bg-[#8b1e1e] px-3 text-sm font-medium text-white hover:bg-[#6f1818]"
                          >
                            Reject from Onboarding
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getButtonTooltip("rejectFromOnboarding")}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Discontinue Training Button */}
                  {candidate.status === "selected" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            onClick={() => setRejectAfterTrainingDialogOpen(true)}
                            disabled={actionLoading || !canDiscontinueTraining()}
                            variant="destructive"
                            size="sm"
                            className="h-9 w-full justify-start bg-[#8b1e1e] px-3 text-sm font-medium text-white hover:bg-[#6f1818]"
                          >
                            Discontinue Training
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p>{getButtonTooltip("discontinue")}</p></TooltipContent>
                    </Tooltip>
                  )}

                  {/* Create Employee Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={() => setCreateEmployeeDialogOpen(true)}
                          disabled={actionLoading || !canCreateEmployee()}
                          variant={nextAction === "employee" ? "default" : "outline"}
                          size="sm"
                          className="h-9 justify-start px-3 text-sm font-medium"
                        >
                          Create Employee
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{getButtonTooltip("employee")}</p></TooltipContent>
                  </Tooltip>

                  {candidate.employeeId && (
                    <Link href={`/dashboard/employeedetails/${candidate.employeeId}`}>
                      <Button variant="outline" size="sm" className="h-9 justify-start px-3 text-sm font-medium">
                        <Briefcase className="h-4 w-4 mr-2" />
                        View Employee Profile
                      </Button>
                    </Link>
                  )}
                </div>
              </TooltipProvider>
            </Card>


            {/* Training Agreement */}
            {(candidate.status === "selected" || candidate.status === "onboarding") && (
              <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
                <button
                  aria-expanded={trainingAgreementExpanded}
                  onClick={() => setTrainingAgreementExpanded(!trainingAgreementExpanded)}
                  type="button"
                  className="flex min-h-9 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]"
                >
                  <h3 className="text-sm font-semibold text-[#636366] dark:text-[#aeaeb2]">
                    Training Agreement
                  </h3>
                  {trainingAgreementExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {trainingAgreementExpanded && (
                  <div className="flex items-start gap-3 mt-3">
                    {/* Signed PDF Preview */}
                    {candidate.trainingAgreementDetails?.signedPdfUrl && (
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium text-foreground">Signed</p>
                        <button type="button" onClick={() => setShowSignedPdfDialog(true)} className="relative w-32 h-32 bg-muted rounded-lg border-2 border-green-500 dark:border-green-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]">
                          <div className="absolute inset-0 flex items-center justify-center bg-green-50 dark:bg-green-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-1" />
                              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Signed</p>
                            </div>
                          </div>
                          
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = candidate.trainingAgreementDetails!.signedPdfUrl!;
                            a.download = `Pre-Employment-Training-Agreement-${candidate._id}-Signed.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="w-full gap-1.5 h-9 text-sm"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                        {canVerify && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResignatureAgreementType("training");
                              setResignatureDialogOpen(true);
                            }}
                            className="w-full gap-1.5 h-9 text-sm border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/20"
                          >
                            <Pencil className="w-3 h-3" />
                            Request Re-signature
                          </Button>
                        )}
                      </div>
                    )}
                    {/* Active Re-signature Request Banner */}
                    {candidate.trainingAgreementDetails?.resignatureRequest?.isActive && (
                      <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                              Re-signature Request Active
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              Requested by {candidate.trainingAgreementDetails.resignatureRequest.requestedBy} on{" "}
                              {new Date(candidate.trainingAgreementDetails.resignatureRequest.requestedAt).toLocaleDateString()}
                            </p>
                            {candidate.trainingAgreementDetails.resignatureRequest.reason && (
                              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                Reason: {candidate.trainingAgreementDetails.resignatureRequest.reason}
                              </p>
                            )}
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                              ⏰ Expires: {new Date(candidate.trainingAgreementDetails.resignatureRequest.tokenExpiresAt).toLocaleDateString()}
                            </p>
                          </div>
                          {canVerify && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelResignature("training")}
                              className="h-9 text-sm text-[#7a4e00] hover:text-[#5c3b00] dark:text-[#ffd60a] dark:hover:text-[#ffe38a]"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Unsigned PDF Preview */}
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-foreground">Unsigned</p>
                      {generatingUnsignedPdf ? (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-sm text-[#636366] dark:text-[#aeaeb2]">Loading</p>
                          </div>
                        </div>
                      ) : unsignedTrainingAgreementUrl ? (
                        <button type="button" onClick={() => setShowUnsignedPdfDialog(true)} className="relative w-32 h-32 bg-muted rounded-lg border-2 border-blue-500 dark:border-blue-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]">
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Preview</p>
                            </div>
                          </div>
                        
                        </button>
                      ) : (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <p className="text-sm text-[#636366] dark:text-[#aeaeb2] text-center px-2">PDF preview</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!trainingAgreementExpanded && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-[#636366] dark:text-[#aeaeb2]">
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {candidate.trainingAgreementDetails?.signedPdfUrl 
                        ? "Signed agreement available - Click to view" 
                        : "Click to preview training agreement documents"}
                    </span>
                  </div>
                )}
              </Card>
            )}

            {/* HR Policies */}
            {(candidate.status === "selected" || candidate.status === "onboarding") && (
              <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
                <button
                  aria-expanded={hrPoliciesExpanded}
                  onClick={() => setHrPoliciesExpanded(!hrPoliciesExpanded)}
                  type="button"
                  className="flex min-h-9 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]"
                >
                  <h3 className="text-sm font-semibold text-[#636366] dark:text-[#aeaeb2]">
                    HR Policies
                  </h3>
                  {hrPoliciesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {hrPoliciesExpanded && (
                  <div className="flex items-start gap-3 mt-3">
                    {/* Signed PDF Preview */}
                    {candidate.trainingAgreementDetails?.signedHrPoliciesPdfUrl && (
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium text-foreground">Signed</p>
                        <button type="button" onClick={() => setShowSignedHrPoliciesDialog(true)} className="relative w-32 h-32 bg-muted rounded-lg border-2 border-green-500 dark:border-green-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]">
                          <div className="absolute inset-0 flex items-center justify-center bg-green-50 dark:bg-green-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-1" />
                              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Signed</p>
                            </div>
                          </div>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = candidate.trainingAgreementDetails!.signedHrPoliciesPdfUrl!;
                            a.download = `HR-Policies-${candidate._id}-Signed.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="w-full gap-1.5 h-9 text-sm"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </div>
                    )}
                    
                    {/* Unsigned PDF Preview */}
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-foreground">Unsigned</p>
                      {generatingHrPoliciesPdf ? (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-sm text-[#636366] dark:text-[#aeaeb2]">Loading</p>
                          </div>
                        </div>
                      ) : unsignedHrPoliciesUrl ? (
                        <button type="button" onClick={() => setShowUnsignedHrPoliciesDialog(true)} className="relative w-32 h-32 bg-muted rounded-lg border-2 border-blue-500 dark:border-blue-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]">
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Preview</p>
                            </div>
                          </div>
                        </button>
                      ) : (
                        <div 
                          onClick={generateUnsignedHrPolicies}
                          className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                        >
                          <p className="text-sm text-[#636366] dark:text-[#aeaeb2] text-center px-2">Click to generate</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!hrPoliciesExpanded && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-[#636366] dark:text-[#aeaeb2]">
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {candidate.trainingAgreementDetails?.signedHrPoliciesPdfUrl 
                        ? "Signed HR Policies available - Click to view" 
                        : "Click to preview HR Policies documents"}
                    </span>
                  </div>
                )}
              </Card>
            )}

            {/* Letter of Intent */}
            {(candidate.status === "selected" || candidate.status === "onboarding") && (
              <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
                <button
                  aria-expanded={letterOfIntentExpanded}
                  onClick={() => setLetterOfIntentExpanded(!letterOfIntentExpanded)}
                  type="button"
                  className="flex min-h-9 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]"
                >
                  <h3 className="text-sm font-semibold text-[#636366] dark:text-[#aeaeb2]">
                    Letter of Intent
                  </h3>
                  {letterOfIntentExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {letterOfIntentExpanded && (
                  <div className="flex items-start gap-3 mt-3">
                    {/* Signed PDF Preview */}
                    {candidate.trainingAgreementDetails?.signedLetterOfIntentPdfUrl && (
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium text-foreground">Signed</p>
                        <button type="button" onClick={() => setShowSignedLetterOfIntentDialog(true)} className="relative w-32 h-32 bg-muted rounded-lg border-2 border-green-500 dark:border-green-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]">
                          <div className="absolute inset-0 flex items-center justify-center bg-green-50 dark:bg-green-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-1" />
                              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Signed</p>
                            </div>
                          </div>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = candidate.trainingAgreementDetails!.signedLetterOfIntentPdfUrl!;
                            a.download = `Letter-of-Intent-${candidate._id}-Signed.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="w-full gap-1.5 h-9 text-sm"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </div>
                    )}
                    
                    {/* Unsigned PDF Preview */}
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-foreground">Unsigned</p>
                      {generatingLetterOfIntentPdf ? (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-sm text-[#636366] dark:text-[#aeaeb2]">Loading</p>
                          </div>
                        </div>
                      ) : unsignedLetterOfIntentUrl ? (
                        <button type="button" onClick={() => setShowUnsignedLetterOfIntentDialog(true)} className="relative w-32 h-32 bg-muted rounded-lg border-2 border-blue-500 dark:border-blue-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]">
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Preview</p>
                            </div>
                          </div>
                        </button>
                      ) : (
                        <div 
                          onClick={generateUnsignedLetterOfIntent}
                          className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                        >
                          <p className="text-sm text-[#636366] dark:text-[#aeaeb2] text-center px-2">Click to generate</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!letterOfIntentExpanded && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-[#636366] dark:text-[#aeaeb2]">
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {candidate.trainingAgreementDetails?.signedLetterOfIntentPdfUrl 
                        ? "Signed Letter of Intent available - Click to view" 
                        : "Click to preview Letter of Intent documents"}
                    </span>
                  </div>
                )}
              </Card>
            )}

            {/* Onboarding Agreement */}
            {(candidate.status === "onboarding" || candidate.onboardingDetails?.onboardingComplete) && (
              <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
                <button
                  aria-expanded={onboardingAgreementExpanded}
                  onClick={() => setOnboardingAgreementExpanded(!onboardingAgreementExpanded)}
                  type="button"
                  className="flex min-h-9 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]"
                >
                  <h3 className="text-sm font-semibold text-[#636366] dark:text-[#aeaeb2]">
                    Onboarding Agreement
                  </h3>
                  {onboardingAgreementExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {onboardingAgreementExpanded && (
                  <div className="flex items-start gap-3 mt-3">
                    {/* Signed PDF Preview */}
                    {candidate.onboardingDetails?.signedPdfUrl && (
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium text-foreground">Signed</p>
                        <button type="button" onClick={() => setShowSignedOnboardingPdfDialog(true)} className="relative w-32 h-32 bg-muted rounded-lg border-2 border-green-500 dark:border-green-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]">
                          <div className="absolute inset-0 flex items-center justify-center bg-green-50 dark:bg-green-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-1" />
                              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Signed</p>
                            </div>
                          </div>
                          
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = candidate.onboardingDetails!.signedPdfUrl!;
                            a.download = `Onboarding-Agreement-${candidate._id}-Signed.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="w-full gap-1.5 h-9 text-sm"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                        {canVerify && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResignatureAgreementType("onboarding");
                              setResignatureDialogOpen(true);
                            }}
                            disabled={actionLoading || candidate.onboardingDetails?.resignatureRequest?.isActive}
                            className="w-full gap-1.5 h-9 text-sm border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/20"
                          >
                            <Pencil className="w-3 h-3" />
                            Request Re-signature
                          </Button>
                        )}
                      </div>
                    )}
                    {/* Active Re-signature Request Banner */}
                    {candidate.onboardingDetails?.resignatureRequest?.isActive && (
                      <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                              Re-signature Request Active
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              Requested by {candidate.onboardingDetails.resignatureRequest.requestedBy} on{" "}
                              {new Date(candidate.onboardingDetails.resignatureRequest.requestedAt).toLocaleDateString()}
                            </p>
                            {candidate.onboardingDetails.resignatureRequest.reason && (
                              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                Reason: {candidate.onboardingDetails.resignatureRequest.reason}
                              </p>
                            )}
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                              ⏰ Expires: {new Date(candidate.onboardingDetails.resignatureRequest.tokenExpiresAt).toLocaleDateString()}
                            </p>
                          </div>
                          {canVerify && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelResignature("onboarding")}
                              className="h-9 text-sm text-[#7a4e00] hover:text-[#5c3b00] dark:text-[#ffd60a] dark:hover:text-[#ffe38a]"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Unsigned PDF Preview */}
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-foreground">Unsigned</p>
                      {generatingUnsignedOnboardingPdf ? (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-sm text-[#636366] dark:text-[#aeaeb2]">Loading</p>
                          </div>
                        </div>
                      ) : unsignedOnboardingAgreementUrl ? (
                        <button type="button" onClick={() => setShowUnsignedOnboardingPdfDialog(true)} className="relative w-32 h-32 bg-muted rounded-lg border-2 border-blue-500 dark:border-blue-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]">
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Preview</p>
                            </div>
                          </div>
                        
                        </button>
                      ) : (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateUnsignedOnboardingAgreement()}
                            className="h-9 px-3 text-sm"
                          >
                            Generate Preview
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!onboardingAgreementExpanded && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-[#636366] dark:text-[#aeaeb2]">
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {candidate.onboardingDetails?.signedPdfUrl 
                        ? "Signed agreement available - Click to view" 
                        : "Click to preview onboarding agreement documents"}
                    </span>
                  </div>
                )}
              </Card>
            )}

            {candidate.resumeUrl ? (
              <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none dark:border-white/10 dark:bg-[#1c1c1e] sm:p-5">
                <button
                  aria-expanded={resumeExpanded}
                  onClick={() => setResumeExpanded(!resumeExpanded)}
                  type="button"
                  className="flex min-h-9 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]"
                >
                  <h3 className="text-sm font-semibold text-[#636366] dark:text-[#aeaeb2]">Resume</h3>
                  {resumeExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {resumeExpanded && (
                  <>
                    <div className="mt-3 overflow-hidden rounded-md border bg-muted">
                      <iframe
                        src={`${candidate.resumeUrl}#toolbar=0`}
                        className="h-[420px] w-full border-0 sm:h-[560px] lg:h-[640px]"
                        title="Resume Preview"
                      />
                    </div>
                    <p className="mt-2 text-sm text-[#636366] dark:text-[#aeaeb2]">
                      If preview doesn&apos;t load,{" "}
                      <a href={candidate.resumeUrl} className="text-primary hover:underline">
                        download resume
                      </a>
                    </p>
                  </>
                )}
              </Card>
            ) : null}
          </div>

          {/* Main Content Area */}
          <div className="order-1 min-w-0 space-y-3 sm:space-y-4 xl:order-2">
            <div className="space-y-3 sm:space-y-4">
            {/* Selection Details - Show when candidate is selected or in onboarding */}
            {(candidate.status === "selected" || candidate.status === "onboarding") && candidate.selectionDetails && (
              <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
                <p className="text-sm font-medium text-[#636366] dark:text-[#aeaeb2]">The offer</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {[
                    candidate.selectionDetails.role,
                    candidate.selectionDetails.positionType
                      ? formatEmploymentType(candidate.selectionDetails.positionType)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </h2>
                {candidate.selectionDetails.salary ? (
                  <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {formatSalary(candidate.selectionDetails.salary)}
                  </p>
                ) : null}
                <p className="mt-2 max-w-prose text-sm leading-6 text-[#3a3a3c] dark:text-[#d1d1d6]">
                  {[
                    candidate.selectionDetails.duration
                      ? `Training runs ${candidate.selectionDetails.duration}.`
                      : null,
                    candidate.selectionDetails.trainingPeriod
                      ? `The training period is ${candidate.selectionDetails.trainingPeriod}.`
                      : null,
                    candidate.selectionDetails.internDuration
                      ? `The internship lasts ${candidate.selectionDetails.internDuration}.`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              </Card>
            )}

            {/* Interview Remarks - Prominent Section */}
            {/* Show remarks if status is interview, selected, or onboarding and remarks exist */}
            {(candidate.status === "interview" || candidate.status === "selected" || candidate.status === "onboarding") && candidate.interviewDetails?.remarks && (
              <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
                <button
                  aria-expanded={remarksExpanded}
                  onClick={() => setRemarksExpanded(!remarksExpanded)}
                  type="button"
                  className="flex min-h-9 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]"
                >
                  <h3 className="text-sm font-medium text-[#636366] dark:text-[#aeaeb2]">How the interview went</h3>
                  {remarksExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {remarksExpanded && (
                  <div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {[
                        ["Experience", candidate.interviewDetails.remarks.experienceValidation],
                        ["Mother tongue", candidate.interviewDetails.remarks.motherTongueInfluence],
                        ["English", candidate.interviewDetails.remarks.englishSpeaking],
                        ["Understanding", candidate.interviewDetails.remarks.understandingScale],
                        ["Listening", candidate.interviewDetails.remarks.listeningSkills],
                        ["Professionalism", candidate.interviewDetails.remarks.basicProfessionalism],
                        ["Stability", candidate.interviewDetails.remarks.stabilitySignals],
                        ["Pay expectations", candidate.interviewDetails.remarks.salaryExpectations],
                      ]
                        .filter((entry): entry is [string, string] => Boolean(entry[1]))
                        .map(([label, note]) => (
                          <article
                            key={label}
                            className="rounded-xl bg-[#f5f5f5] p-3 dark:bg-white/5"
                          >
                            <p className="text-sm text-[#636366] dark:text-[#aeaeb2]">{label}</p>
                            <p className="mt-1 text-sm leading-6 text-[#1d1d1f] dark:text-[#f5f5f7]">
                              {note}
                            </p>
                          </article>
                        ))}
                      {candidate.interviewDetails.remarks.hrNotes ? (
                        <article className="rounded-xl bg-[#f5f5f5] p-3 sm:col-span-2 dark:bg-white/5">
                          <p className="text-sm text-[#636366] dark:text-[#aeaeb2]">From HR</p>
                          <p className="mt-1 text-sm leading-6 text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {candidate.interviewDetails.remarks.hrNotes}
                          </p>
                        </article>
                      ) : null}
                    </div>
                    <div className="mt-3 pt-3 border-t text-sm text-[#636366] dark:text-[#aeaeb2]">
                      Evaluated by {candidate.interviewDetails.remarks.evaluatedBy}
                      {candidate.interviewDetails.remarks.evaluatedAt && (
                        <> • {new Date(candidate.interviewDetails.remarks.evaluatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}</>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )}
            </div>

            {/* Offer Letter */}
            {candidate.status === "onboarding" && (
              <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
                <button
                  aria-expanded={offerLetterExpanded}
                  onClick={() => setOfferLetterExpanded(!offerLetterExpanded)}
                  type="button"
                  className="flex min-h-9 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]"
                >
                  <h3 className="text-sm font-semibold text-[#636366] dark:text-[#aeaeb2]">
                    Offer Letter
                  </h3>
                  {offerLetterExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {offerLetterExpanded && (
                  <div className="flex items-start gap-3 mt-3">
                    {/* Signed PDF Preview */}
                    {candidate.selectionDetails?.signedOfferLetterPdfUrl && (
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium text-foreground">Signed</p>
                        <button type="button" onClick={() => setShowSignedOfferLetterPdfDialog(true)} className="relative w-32 h-32 bg-muted rounded-lg border-2 border-green-500 dark:border-green-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]">
                          <div className="absolute inset-0 flex items-center justify-center bg-green-50 dark:bg-green-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-1" />
                              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Signed</p>
                            </div>
                          </div>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = candidate.selectionDetails!.signedOfferLetterPdfUrl!;
                            a.download = `Offer-Letter-${candidate._id}-Signed.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="w-full gap-1.5 h-9 text-sm"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </div>
                    )}
                    
                    {/* Unsigned PDF Preview */}
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-foreground">Unsigned</p>
                      {generatingUnsignedOfferLetterPdf ? (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-sm text-[#636366] dark:text-[#aeaeb2]">Loading</p>
                          </div>
                        </div>
                      ) : unsignedOfferLetterUrl ? (
                        <button type="button" onClick={() => setShowUnsignedOfferLetterPdfDialog(true)} className="relative w-32 h-32 bg-muted rounded-lg border-2 border-blue-500 dark:border-blue-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]">
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Preview</p>
                            </div>
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={generateUnsignedOfferLetter}
                          disabled={generatingUnsignedOfferLetterPdf}
                          className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary transition-colors disabled:cursor-wait"
                        >
                          <p className="text-sm text-[#636366] dark:text-[#aeaeb2] text-center px-2">Click to generate</p>
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {!offerLetterExpanded && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-[#636366] dark:text-[#aeaeb2]">
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {candidate.selectionDetails?.signedOfferLetterPdfUrl 
                        ? "Signed Offer Letter available - Click to view" 
                        : "Click to preview Offer Letter documents"}
                    </span>
                  </div>
                )}
              </Card>
            )}

            {/* Onboarding Details */}
            {(candidate.status === "onboarding" || candidate.onboardingDetails?.onboardingComplete) && (
              <OnboardingDetailsView
                onboardingDetails={candidate.onboardingDetails}
                selectionDetails={candidate.selectionDetails ? {
                  ...candidate.selectionDetails,
                  salary: candidate.selectionDetails.salary?.toString()
                } : undefined}
                candidateId={candidate._id}
                canVerify={canVerify}
                onUpdate={refreshCandidate}
              />
            )}

            {/* Signed PDF Dialog */}
            {candidate.trainingAgreementDetails?.signedPdfUrl && (
              <Dialog open={showSignedPdfDialog} onOpenChange={setShowSignedPdfDialog}>
                <DialogContent className="max-w-6xl max-h-[95vh] bg-white dark:bg-gray-800 flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Signed Training Agreement</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      View and download the signed training agreement document
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 flex-1 min-h-0">
                    <iframe
                      src={`${candidate.trainingAgreementDetails.signedPdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      className="w-full h-full min-h-[75vh] border-0"
                      title="Signed Training Agreement"
                      style={{ minHeight: '75vh' }}
                    />
                  </div>
                  <DialogFooter className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowSignedPdfDialog(false)}
                      className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = candidate.trainingAgreementDetails!.signedPdfUrl!;
                        a.download = `Pre-Employment-Training-Agreement-${candidate._id}-Signed.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Unsigned PDF Dialog */}
            {unsignedTrainingAgreementUrl && (
              <Dialog open={showUnsignedPdfDialog} onOpenChange={setShowUnsignedPdfDialog}>
                <DialogContent className="max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Unsigned Training Agreement Preview</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Preview of the unsigned training agreement document
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <iframe
                      src={unsignedTrainingAgreementUrl}
                      className="w-full h-[70vh] border-0"
                      title="Unsigned Training Agreement Preview"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowUnsignedPdfDialog(false)}
                      className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Signed Onboarding PDF Dialog */}
            {candidate?.onboardingDetails?.signedPdfUrl && (
              <Dialog open={showSignedOnboardingPdfDialog} onOpenChange={setShowSignedOnboardingPdfDialog}>
                <DialogContent className="max-w-6xl max-h-[95vh] bg-white dark:bg-gray-800 flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Signed Onboarding Agreement</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      View and download the signed onboarding agreement document
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 flex-1 min-h-0">
                    <iframe
                      src={`${candidate.onboardingDetails.signedPdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      className="w-full h-full min-h-[75vh] border-0"
                      title="Signed Onboarding Agreement"
                      style={{ minHeight: '75vh' }}
                    />
                  </div>
                  <DialogFooter className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowSignedOnboardingPdfDialog(false)}
                      className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = candidate.onboardingDetails!.signedPdfUrl!;
                        a.download = `Onboarding-Agreement-${candidate._id}-Signed.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Unsigned Onboarding PDF Dialog */}
            {unsignedOnboardingAgreementUrl && (
              <Dialog open={showUnsignedOnboardingPdfDialog} onOpenChange={setShowUnsignedOnboardingPdfDialog}>
                <DialogContent className="max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Unsigned Onboarding Agreement Preview</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Preview of the unsigned onboarding agreement document
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <iframe
                      src={unsignedOnboardingAgreementUrl}
                      className="w-full h-[70vh] border-0"
                      title="Unsigned Onboarding Agreement Preview"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowUnsignedOnboardingPdfDialog(false)}
                      className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Signed HR Policies PDF Dialog */}
            {candidate.trainingAgreementDetails?.signedHrPoliciesPdfUrl && (
              <Dialog open={showSignedHrPoliciesDialog} onOpenChange={setShowSignedHrPoliciesDialog}>
                <DialogContent className="max-w-6xl max-h-[95vh] bg-white dark:bg-gray-800 flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Signed HR Policies</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      View and download the signed HR Policies document
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 flex-1 min-h-0">
                    <iframe
                      src={`${candidate.trainingAgreementDetails.signedHrPoliciesPdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      className="w-full h-full min-h-[75vh] border-0"
                      title="Signed HR Policies"
                      style={{ minHeight: '75vh' }}
                    />
                  </div>
                  <DialogFooter className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowSignedHrPoliciesDialog(false)}
                      className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = candidate.trainingAgreementDetails!.signedHrPoliciesPdfUrl!;
                        a.download = `HR-Policies-${candidate._id}-Signed.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Unsigned HR Policies PDF Dialog */}
            {unsignedHrPoliciesUrl && (
              <Dialog open={showUnsignedHrPoliciesDialog} onOpenChange={setShowUnsignedHrPoliciesDialog}>
                <DialogContent className="max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Unsigned HR Policies Preview</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Preview of the unsigned HR Policies document
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <iframe
                      src={unsignedHrPoliciesUrl}
                      className="w-full h-[70vh] border-0"
                      title="Unsigned HR Policies Preview"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowUnsignedHrPoliciesDialog(false)}
                      className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Signed Letter of Intent PDF Dialog */}
            {candidate.trainingAgreementDetails?.signedLetterOfIntentPdfUrl && (
              <Dialog open={showSignedLetterOfIntentDialog} onOpenChange={setShowSignedLetterOfIntentDialog}>
                <DialogContent className="max-w-6xl max-h-[95vh] bg-white dark:bg-gray-800 flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Signed Letter of Intent</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      View and download the signed Letter of Intent document
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 flex-1 min-h-0">
                    <iframe
                      src={`${candidate.trainingAgreementDetails.signedLetterOfIntentPdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      className="w-full h-full min-h-[75vh] border-0"
                      title="Signed Letter of Intent"
                      style={{ minHeight: '75vh' }}
                    />
                  </div>
                  <DialogFooter className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowSignedLetterOfIntentDialog(false)}
                      className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = candidate.trainingAgreementDetails!.signedLetterOfIntentPdfUrl!;
                        a.download = `Letter-of-Intent-${candidate._id}-Signed.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Unsigned Letter of Intent PDF Dialog */}
            {unsignedLetterOfIntentUrl && (
              <Dialog open={showUnsignedLetterOfIntentDialog} onOpenChange={setShowUnsignedLetterOfIntentDialog}>
                <DialogContent className="max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Unsigned Letter of Intent Preview</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Preview of the unsigned Letter of Intent document
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <iframe
                      src={unsignedLetterOfIntentUrl || undefined}
                      className="w-full h-[70vh] border-0"
                      title="Unsigned Letter of Intent Preview"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowUnsignedLetterOfIntentDialog(false)}
                      className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Signed Offer Letter PDF Dialog */}
            {candidate.selectionDetails?.signedOfferLetterPdfUrl && (
              <Dialog open={showSignedOfferLetterPdfDialog} onOpenChange={setShowSignedOfferLetterPdfDialog}>
                <DialogContent className="max-w-6xl max-h-[95vh] bg-white dark:bg-gray-800 flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Signed Offer Letter</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      View and download the signed offer letter document
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 flex-1 min-h-0">
                    <iframe
                      src={`${candidate.selectionDetails.signedOfferLetterPdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      className="w-full h-full min-h-[75vh] border-0"
                      title="Signed Offer Letter"
                      style={{ minHeight: '75vh' }}
                    />
                  </div>
                  <DialogFooter className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowSignedOfferLetterPdfDialog(false)}
                      className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = candidate.selectionDetails!.signedOfferLetterPdfUrl!;
                        a.download = `Offer-Letter-${candidate._id}-Signed.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Unsigned Offer Letter PDF Dialog */}
            {unsignedOfferLetterUrl && (
              <Dialog open={showUnsignedOfferLetterPdfDialog} onOpenChange={setShowUnsignedOfferLetterPdfDialog}>
                <DialogContent className="max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Unsigned Offer Letter Preview</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Preview of the unsigned offer letter document
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <iframe
                      src={unsignedOfferLetterUrl || undefined}
                      className="w-full h-[70vh] border-0"
                      title="Unsigned Offer Letter Preview"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowUnsignedOfferLetterPdfDialog(false)}
                      className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Cover Letter */}
            {candidate.coverLetter && (
              <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
                <h3 className="mb-3 text-sm font-semibold text-[#636366] dark:text-[#aeaeb2]">Cover Letter</h3>
                <div className="max-w-prose whitespace-pre-wrap text-base leading-7 text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {candidate.coverLetter}
                </div>
              </Card>
            )}

            {/* Additional Documents */}
            <Card className="rounded-xl border-black/10 bg-white p-4 shadow-none sm:p-5 dark:border-white/10 dark:bg-[#1c1c1e]">
              <button
                aria-expanded={additionalDocumentsExpanded}
                onClick={() => setAdditionalDocumentsExpanded(!additionalDocumentsExpanded)}
                type="button"
                  className="flex min-h-9 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:focus-visible:ring-[#f5f5f7]"
              >
                <h3 className="text-sm font-semibold text-[#636366] dark:text-[#aeaeb2]">Additional Documents</h3>
                {additionalDocumentsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {additionalDocumentsExpanded && (
                <div className="space-y-4 mt-3">
                  {/* Upload Button */}
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="additional-document-upload"
                      className="hidden"
                      multiple
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0 || !candidate) return;

                        const fileArray = Array.from(files);
                        e.target.value = "";

                        try {
                          setUploadingDocuments(true);

                          const { imageUrls, error } = await uploadFiles(
                            fileArray,
                            `Documents/AdditionalDocuments/${candidate._id}`
                          );

                          if (error || !imageUrls?.length) {
                            toast.error(error || "Failed to upload documents");
                            return;
                          }

                          // Save documents to database
                          const documentsToSave = fileArray.map((file, index) => ({
                            name: file.name,
                            url: imageUrls[index],
                            uploadedAt: new Date().toISOString(),
                            uploadedBy: null, // Can be enhanced to track user
                          }));

                          const response = await axios.patch(`/api/candidates/${candidateId}`, {
                            additionalDocuments: [
                              ...((candidate as any).additionalDocuments || []),
                              ...documentsToSave,
                            ],
                          });

                          if (response.data.success) {
                            toast.success(`${fileArray.length} document(s) uploaded successfully`);
                            refreshCandidate();
                          } else {
                            throw new Error(response.data.error || "Failed to save documents");
                          }
                        } catch (err: any) {
                          console.error("Error uploading documents:", err);
                          toast.error(
                            err.response?.data?.error ||
                            err.message ||
                            "Failed to upload documents"
                          );
                        } finally {
                          setUploadingDocuments(false);
                        }
                      }}
                      disabled={uploadingDocuments}
                    />
                    <label
                      htmlFor="additional-document-upload"
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                        uploadingDocuments
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-accent border-border"
                      }`}
                    >
                      {uploadingDocuments ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">Upload Documents</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Display Uploaded Documents */}
                  {(candidate as any).additionalDocuments && (candidate as any).additionalDocuments.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Uploaded Documents ({(candidate as any).additionalDocuments.length})
                      </p>
                      <div className="space-y-2">
                        {(candidate as any).additionalDocuments.map((doc: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {doc.name}
                                </p>
                                {doc.uploadedAt && (
                                  <p className="text-sm text-[#636366] dark:text-[#aeaeb2]">
                                    Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const a = document.createElement("a");
                                  a.href = doc.url;
                                  a.download = doc.name;
                                  a.target = "_blank";
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (!confirm(`Are you sure you want to delete "${doc.name}"?`)) {
                                    return;
                                  }

                                  try {
                                    const updatedDocs = (candidate as any).additionalDocuments.filter(
                                      (_: any, i: number) => i !== index
                                    );
                                    const response = await axios.patch(`/api/candidates/${candidateId}`, {
                                      additionalDocuments: updatedDocs,
                                    });

                                    if (response.data.success) {
                                      toast.success("Document deleted successfully");
                                      refreshCandidate();
                                    } else {
                                      throw new Error(response.data.error || "Failed to delete document");
                                    }
                                  } catch (err: any) {
                                    console.error("Error deleting document:", err);
                                    toast.error(
                                      err.response?.data?.error ||
                                      err.message ||
                                      "Failed to delete document"
                                    );
                                  }
                                }}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No additional documents uploaded yet
                    </p>
                  )}
                </div>
              )}
            </Card>

          </div>
        </div>
      </div>

      <CreateEmployeeDialog
        open={createEmployeeDialogOpen}
        onClose={() => setCreateEmployeeDialogOpen(false)}
        candidate={{
          _id: candidate._id,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          
          experience: candidate.experience,
          address: candidate.address,
          city: candidate.city,
          country: candidate.country,
          position: candidate.position,
          resumeUrl: candidate.resumeUrl,
          photoUrl: candidate.photoUrl,
          college: candidate.college,
          linkedin: candidate.linkedin,
          portfolio: candidate.portfolio,
          onboardingDetails: candidate.onboardingDetails ? {
            personalDetails: candidate.onboardingDetails.personalDetails ? {
              dateOfBirth: candidate.onboardingDetails.personalDetails.dateOfBirth,
              gender: candidate.onboardingDetails.personalDetails.gender,
              nationality: candidate.onboardingDetails.personalDetails.nationality,
              fatherName: candidate.onboardingDetails.personalDetails.fatherName,
              aadhaarNumber: candidate.onboardingDetails.personalDetails.aadhaarNumber,
              panNumber: candidate.onboardingDetails.personalDetails.panNumber,
            } : undefined,
            bankDetails: candidate.onboardingDetails.bankDetails ? {
              hasBankAccount: candidate.onboardingDetails.bankDetails.hasBankAccount,
              accountNumber: candidate.onboardingDetails.bankDetails.accountNumber,
              ifscCode: candidate.onboardingDetails.bankDetails.ifscCode,
              bankName: candidate.onboardingDetails.bankDetails.bankName,
              accountHolderName: candidate.onboardingDetails.bankDetails.accountHolderName,
            } : undefined,
            documents: candidate.onboardingDetails.documents ? {
              aadharCard: candidate.onboardingDetails.documents.aadharCard,
            } : undefined,
          } : undefined,
          employmentType: candidate.employmentType,
          selectionDetails: candidate.selectionDetails ? {
            salary: candidate.selectionDetails.salary,
            role: candidate.selectionDetails.role,
            positionType: candidate.selectionDetails.positionType,
          } : undefined,
        }}
        onCreated={async () => {
          setCreateEmployeeDialogOpen(false);
          await refreshCandidate();
          toast.success("Employee created successfully");
        }}
      />

      <EmploymentTypeRequiredDialog
        open={employmentTypeRequiredDialogOpen}
        onClose={() => setEmploymentTypeRequiredDialogOpen(false)}
        onConfirm={handleEmploymentTypeRequiredConfirm}
        loading={updatingEmploymentType}
        initialValue={candidate?.employmentType}
      />

      <SelectCandidateDialog
        open={selectDialogOpen}
        onClose={() => setSelectDialogOpen(false)}
        onSubmit={handleSelectCandidateWrapper}
        loading={actionLoading}
        candidatePosition={candidate?.position}
        candidateEmploymentType={candidate?.employmentType}
      />
      <ShortlistCandidateDialog
        open={shortlistDialogOpen}
        onClose={() => setShortlistDialogOpen(false)}
        onSubmit={handleShortlistCandidateWrapper}
        loading={actionLoading}
        candidatePosition={candidate?.position}
      />
      <RejectCandidateDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onSubmit={handleRejectCandidateWrapper}
        loading={actionLoading}
      />
      <RejectCandidateDialog
        open={rejectAfterTrainingDialogOpen}
        onClose={() => setRejectAfterTrainingDialogOpen(false)}
        onSubmit={handleDiscontinueTrainingWrapper}
        loading={actionLoading}
        title="Discontinue Training"
        submitButtonText="Discontinue"
      />
      <RejectCandidateDialog
        open={rejectFromOnboardingDialogOpen}
        onClose={() => setRejectFromOnboardingDialogOpen(false)}
        onSubmit={handleRejectFromOnboardingWrapper}
        loading={actionLoading}
        title="Reject from onboarding"
        description="This person is in onboarding and is not employed. The rejection is categorised as rejected from onboarding."
        reasons={ONBOARDING_REJECTION_REASONS}
      />

      {/* Confirmation Dialog for Second Round */}
      <Dialog open={showSecondRoundConfirmation} onOpenChange={setShowSecondRoundConfirmation}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Schedule Second Round Interview</DialogTitle>
            <DialogDescription>
              Are you sure you want to schedule a second round interview? This can be done even if the first interview hasn&apos;t been scheduled yet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSecondRoundConfirmation(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmSecondRound}>
              Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={scheduleInterviewDialogOpen} onOpenChange={setScheduleInterviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Candidate: {candidate?.name}
              </Label>
            </div>
            <InterviewerSelect
              value={interviewerEmployeeId}
              onChange={setInterviewerEmployeeId}
              options={interviewers}
              loading={interviewersLoading}
            />
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Interview Mode *
              </Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setInterviewMode("physical");
                    if (!interviewOfficeId && candidate) {
                      const assigned =
                        typeof candidate.officeAddressId === "object" &&
                        candidate.officeAddressId?._id
                          ? candidate.officeAddressId._id
                          : typeof candidate.officeAddressId === "string"
                            ? candidate.officeAddressId
                            : "";
                      if (assigned) setInterviewOfficeId(assigned);
                    }
                  }}
                  className={`flex-1 py-2 px-3 rounded border transition ${
                    interviewMode === "physical"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted text-muted-foreground hover:border-primary"
                  }`}
                >
                  Physical
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInterviewMode("virtual");
                    setInterviewOfficeId("");
                  }}
                  className={`flex-1 py-2 px-3 rounded border transition ${
                    interviewMode === "virtual"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted text-muted-foreground hover:border-primary"
                  }`}
                >
                  Virtual
                </button>
              </div>
            </div>
            {interviewMode === "physical" ? (
              <div>
                <Label className="text-sm font-medium mb-2 block">Office *</Label>
                <Select
                  value={interviewOfficeId || undefined}
                  onValueChange={setInterviewOfficeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select office for interview" />
                  </SelectTrigger>
                  <SelectContent>
                    {officeOptions.map((opt) => (
                      <SelectItem key={opt._id} value={opt._id}>
                        {opt.name} ({opt.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
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
            <Button
              onClick={handleScheduleInterview}
              disabled={
                schedulingInterview ||
                !interviewDate ||
                !interviewMode ||
                !interviewerEmployeeId ||
                (interviewMode === "physical" && !interviewOfficeId)
              }
            >
              {schedulingInterview ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Second Round Interview Dialog */}
      <Dialog open={scheduleSecondRoundDialogOpen} onOpenChange={setScheduleSecondRoundDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Second Round Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Candidate: {candidate?.name}
              </Label>
            </div>
            <InterviewerSelect
              value={secondRoundInterviewerEmployeeId}
              onChange={setSecondRoundInterviewerEmployeeId}
              options={interviewers}
              loading={interviewersLoading}
            />
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Interview Mode *
              </Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSecondRoundInterviewMode("physical");
                    if (!secondRoundOfficeId && candidate) {
                      const assigned =
                        typeof candidate.officeAddressId === "object" &&
                        candidate.officeAddressId?._id
                          ? candidate.officeAddressId._id
                          : typeof candidate.officeAddressId === "string"
                            ? candidate.officeAddressId
                            : "";
                      if (assigned) setSecondRoundOfficeId(assigned);
                    }
                  }}
                  className={`flex-1 py-2 px-3 rounded border transition ${
                    secondRoundInterviewMode === "physical"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted text-muted-foreground hover:border-primary"
                  }`}
                >
                  Physical
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSecondRoundInterviewMode("virtual");
                    setSecondRoundOfficeId("");
                  }}
                  className={`flex-1 py-2 px-3 rounded border transition ${
                    secondRoundInterviewMode === "virtual"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted text-muted-foreground hover:border-primary"
                  }`}
                >
                  Virtual
                </button>
              </div>
            </div>
            {secondRoundInterviewMode === "physical" ? (
              <div>
                <Label className="text-sm font-medium mb-2 block">Office *</Label>
                <Select
                  value={secondRoundOfficeId || undefined}
                  onValueChange={setSecondRoundOfficeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select office for interview" />
                  </SelectTrigger>
                  <SelectContent>
                    {officeOptions.map((opt) => (
                      <SelectItem key={opt._id} value={opt._id}>
                        {opt.name} ({opt.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Select Date
              </Label>
              <CalendarComponent
                mode="single"
                selected={secondRoundDate}
                onSelect={setSecondRoundDate}
                disabled={(date) => isDateBeforeToday(date)}
                className="rounded-md border"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Select Time
              </Label>
              <div className="flex gap-2">
                <Select value={secondRoundHour} onValueChange={setSecondRoundHour}>
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
                <Select value={secondRoundMinute} onValueChange={setSecondRoundMinute}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Minute" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="00">00</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={secondRoundAmPm} onValueChange={(value: "AM" | "PM") => setSecondRoundAmPm(value)}>
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
              <Label htmlFor="second-round-notes" className="text-sm font-medium mb-2 block">
                Notes (Optional)
              </Label>
              <Textarea
                id="second-round-notes"
                value={secondRoundNotes}
                onChange={(e) => setSecondRoundNotes(e.target.value)}
                placeholder="Add any additional notes about the second round interview..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleSecondRoundDialogOpen(false)}
              disabled={schedulingSecondRound}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleSecondRound}
              disabled={
                schedulingSecondRound ||
                !secondRoundDate ||
                !secondRoundInterviewMode ||
                !secondRoundInterviewerEmployeeId ||
                (secondRoundInterviewMode === "physical" && !secondRoundOfficeId)
              }
            >
              {schedulingSecondRound ? "Scheduling..." : "Schedule Second Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview Remarks Dialog */}
      {/* Show remarks dialog if any interview (first or second round) is scheduled */}
      {hasAnyInterviewScheduled() && candidate && (
        <InterviewRemarksDialog
          open={interviewRemarksDialogOpen}
          onOpenChange={setInterviewRemarksDialogOpen}
          candidateId={candidate._id}
          candidateName={candidate.name}
          existingRemarks={candidate.interviewDetails?.remarks}
          onSuccess={refreshCandidateWrapper}
        />
      )}

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit job title</DialogTitle>
            <DialogDescription>
              Choose the department and job title for {candidate?.name}. This does not change a login role.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <JobIdentitySelects
              departmentId={editDepartmentId}
              jobPositionId={editJobPositionId}
              onDepartmentChange={(departmentId) => {
                setEditDepartmentId(departmentId);
                setEditJobPositionId("");
              }}
              onPositionChange={setEditJobPositionId}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditRoleDialogOpen(false)}
              disabled={updatingRole}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={updatingRole || !editDepartmentId || !editJobPositionId}
            >
              {updatingRole ? "Updating..." : "Update job title"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Re-signature Dialog */}
      <Dialog open={resignatureDialogOpen} onOpenChange={(open) => {
        setResignatureDialogOpen(open);
        if (!open) {
          setResignatureReason("");
          setResignatureLink(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Re-signature</DialogTitle>
            <DialogDescription>
              Request {candidate?.name} to re-sign their {resignatureAgreementType === "training" ? "Training Agreement" : "Onboarding Agreement"}
            </DialogDescription>
          </DialogHeader>
          
          {!resignatureLink ? (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="resignature-reason" className="text-sm">Reason for Re-signature (Optional)</Label>
                <Textarea
                  id="resignature-reason"
                  value={resignatureReason}
                  onChange={(e) => setResignatureReason(e.target.value)}
                  placeholder="e.g., Signature not clear, needs to be on plain background, etc."
                  rows={3}
                  className="mt-2"
                />
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> An email will be sent to the candidate with a secure link to re-sign the agreement. 
                  The link will expire in 7 days.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                  Re-signature request sent successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                  The candidate has been notified via email.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={resignatureLink}
                    readOnly
                    className="flex-1 text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyResignatureLink}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {resignatureLink ? (
              <Button onClick={() => {
                setResignatureDialogOpen(false);
                setResignatureLink(null);
                setResignatureReason("");
              }}>
                Close
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResignatureDialogOpen(false);
                    setResignatureReason("");
                  }}
                  disabled={requestingResignature}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestResignature}
                  disabled={requestingResignature}
                >
                  {requestingResignature ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Request"
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
