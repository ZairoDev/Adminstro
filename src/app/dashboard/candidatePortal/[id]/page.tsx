"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Download,
  Linkedin,
  Globe,
  AlertCircle,
  Calendar,
  Mail,
  Phone,
  MapPin,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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



import axios from "axios";
import { SelectCandidateDialog, SelectionData } from "../components/select-candidate-dialog";
import { RejectCandidateDialog, RejectionData } from "../components/reject-candidate-dialog";
import { CreateEmployeeDialog } from "../components/createEmployee";
import { ShortlistCandidateDialog, ShortlistData } from "../components/shortlist-candidate-dialog";
import { OnboardingDetailsView } from "../components/onboarding-details-view";
import { InterviewRemarksDialog } from "../components/interview-remarks-dialog";
import { formatDateToLocalString, isDateBeforeToday } from "@/lib/utils";

// Import refactored modules
import { Candidate } from "./types";
import { ROLE_OPTIONS, getStatusColor, getStatusLabel } from "./constants";
import { useCandidate } from "./hooks/useCandidate";
import { useCandidateActions } from "./hooks/useCandidateActions";
import { useCandidatePermissions } from "./hooks/useCandidatePermissions";
import { convertTo24Hour, formatSalary } from "./utils/time-utils";
import { CandidateHeader } from "./components/CandidateHeader";

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
  const candidateId = params?.id as string;

  // Use refactored hooks
  const { candidate, loading, error: candidateError, refreshCandidate, setCandidate } = useCandidate(candidateId);
  const { actionLoading, error: actionError, handleSelectCandidate, handleShortlistCandidate, handleRejectCandidate, handleDiscontinueTraining, handleOnboarding } = useCandidateActions(candidateId, (updatedCandidate) => {
    setCandidate(updatedCandidate);
  });
  const { canShortlist, canSelect, canReject, canDiscontinueTraining, canStartOnboarding, canCreateEmployee, canScheduleInterview, canScheduleSecondRound, hasInterviewRemarks, hasAnyInterviewScheduled } = useCandidatePermissions(candidate);
  
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  
  // Combine errors
  useEffect(() => {
    setError(candidateError || actionError || null);
  }, [candidateError, actionError]);

  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [shortlistDialogOpen, setShortlistDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectAfterTrainingDialogOpen, setRejectAfterTrainingDialogOpen] = useState(false);
  const [createEmployeeDialogOpen, setCreateEmployeeDialogOpen] =
    useState(false);
  const [scheduleInterviewDialogOpen, setScheduleInterviewDialogOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(undefined);
  const [interviewHour, setInterviewHour] = useState<string>("4");
  const [interviewMinute, setInterviewMinute] = useState<string>("00");
  const [interviewAmPm, setInterviewAmPm] = useState<"AM" | "PM">("PM");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [schedulingInterview, setSchedulingInterview] = useState(false);

  // Second Round Interview states
  const [scheduleSecondRoundDialogOpen, setScheduleSecondRoundDialogOpen] = useState(false);
  const [showSecondRoundConfirmation, setShowSecondRoundConfirmation] = useState(false);
  const [secondRoundDate, setSecondRoundDate] = useState<Date | undefined>(undefined);
  const [secondRoundHour, setSecondRoundHour] = useState<string>("4");
  const [secondRoundMinute, setSecondRoundMinute] = useState<string>("00");
  const [secondRoundAmPm, setSecondRoundAmPm] = useState<"AM" | "PM">("PM");
  const [secondRoundNotes, setSecondRoundNotes] = useState("");
  const [schedulingSecondRound, setSchedulingSecondRound] = useState(false);

  // convertTo24Hour is now imported from utils/time-utils
  const [interviewRemarksDialogOpen, setInterviewRemarksDialogOpen] = useState(false);
  const [remarksExpanded, setRemarksExpanded] = useState(true);
  const [resumeExpanded, setResumeExpanded] = useState(true);
  const [trainingAgreementExpanded, setTrainingAgreementExpanded] = useState(true);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [unsignedTrainingAgreementUrl, setUnsignedTrainingAgreementUrl] = useState<string | null>(null);
  const [generatingUnsignedPdf, setGeneratingUnsignedPdf] = useState(false);
  const [showSignedPdfDialog, setShowSignedPdfDialog] = useState(false);
  const [showUnsignedPdfDialog, setShowUnsignedPdfDialog] = useState(false);
  const [onboardingAgreementExpanded, setOnboardingAgreementExpanded] = useState(true);
  const [unsignedOnboardingAgreementUrl, setUnsignedOnboardingAgreementUrl] = useState<string | null>(null);
  const [generatingUnsignedOnboardingPdf, setGeneratingUnsignedOnboardingPdf] = useState(false);
  const [showSignedOnboardingPdfDialog, setShowSignedOnboardingPdfDialog] = useState(false);
  const [showUnsignedOnboardingPdfDialog, setShowUnsignedOnboardingPdfDialog] = useState(false);
  
  // HR Policies and Letter of Intent states
  const [hrPoliciesExpanded, setHrPoliciesExpanded] = useState(true);
  const [letterOfIntentExpanded, setLetterOfIntentExpanded] = useState(true);
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
  const [offerLetterExpanded, setOfferLetterExpanded] = useState(true);
  const [unsignedOfferLetterUrl, setUnsignedOfferLetterUrl] = useState<string | null>(null);
  const [generatingUnsignedOfferLetterPdf, setGeneratingUnsignedOfferLetterPdf] = useState(false);
  const [showSignedOfferLetterPdfDialog, setShowSignedOfferLetterPdfDialog] = useState(false);
  const [showUnsignedOfferLetterPdfDialog, setShowUnsignedOfferLetterPdfDialog] = useState(false);

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
        designation: candidate.selectionDetails?.role || candidate.position,
        department: candidate.selectionDetails?.role || candidate.position,
        candidateId: candidate._id,
        // No signature for unsigned PDF
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

  const generateUnsignedOfferLetter = async () => {
    if (!candidate || !candidate.name || !candidate.position) return;
    
    setGeneratingUnsignedOfferLetterPdf(true);
    try {
      // Use ISO date string format for proper parsing
      const agreementDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const offerLetterPayload = {
        candidateName: candidate.name,
        position: candidate.position,
        date: agreementDate,
        candidateId: candidate._id,
        // No signature for unsigned PDF
      };

      const pdfResponse = await axios.post(
        "/api/candidates/offerLetter",
        offerLetterPayload,
        {
          responseType: "arraybuffer",
          headers: { "Content-Type": "application/json" },
        }
      );

      const pdfBlob = new Blob([pdfResponse.data], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(pdfBlob);
      setUnsignedOfferLetterUrl(url);
    } catch (error: any) {
      console.error("Error generating unsigned offer letter PDF:", error);
      toast.error("Failed to generate offer letter PDF");
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
        agreementCity: candidate.city ?? "Kanpur",
        employeeName: candidate.name,
        fatherName: candidate.onboardingDetails?.personalDetails?.fatherName || "",
        employeeAddress: candidate.address || "",
        designation: candidate.position,
        effectiveFrom: new Date().toISOString(),
        postingLocation: candidate.city || "Kanpur",
        salaryINR: candidate.selectionDetails?.salary 
          ? `${candidate.selectionDetails.salary.toLocaleString("en-IN")} per month`
          : "As per employment terms",
        witness1: "____________________",
        witness2: "____________________",
        candidateId: candidate._id, // Pass candidateId so API can fetch stored onboardingStartedAt date
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

  const handleOnboardingWrapper = async () => {
    await handleOnboarding();
  };

  // Handle edit role
  const handleEditRole = () => {
    if (!candidate) return;
    setNewRole(candidate.position);
    setEditRoleDialogOpen(true);
  };

  // Update role
  const handleUpdateRole = async () => {
    if (!candidate || !newRole) return;

    setUpdatingRole(true);
    try {
      const response = await fetch(`/api/candidates/${candidate._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: newRole }),
      });

      const result = await response.json();
      if (result.success) {
        setCandidate((prev) =>
          prev ? { ...prev, position: newRole } : null
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-muted-foreground">Candidate not found</p>
        </div>
      </div>
    );
  }

  // getStatusColor and permission checks are now from hooks/constants

  const handleScheduleInterview = async () => {
    if (!candidate || !interviewDate) {
      toast.error("Please select both date and time");
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
      toast.error("Please select both date and time");
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
            notes: secondRoundNotes || undefined,
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
        return "Select this candidate for training";
      
      case "discontinue":
        if (candidate.status !== "selected") return "Can only discontinue training for candidates selected for training";
        return "Discontinue training for this candidate";
      
      case "reject":
        if (candidate.status === "rejected") return "Candidate is already rejected";
        if (candidate.status === "onboarding") return "Cannot reject during onboarding";
        if (candidate.status === "interview" && !hasInterviewRemarks()) return "Interview remarks must be completed before rejecting";
        return "Reject this candidate";
      
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
    <div className="min-h-screen bg-background">
      {/* Compact Header - Now using CandidateHeader component */}
      <CandidateHeader candidate={candidate} />

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        {error && (
          <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-12 gap-4">
          {/* Left Sidebar - Contact & Actions */}
          <div className="col-span-12 lg:col-span-3 space-y-3">
            {/* Contact Information */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                Contact
              </h3>
              <div className="space-y-2.5">
                <a
                  href={`mailto:${candidate?.email}`}
                  className="flex items-start gap-2 text-sm group"
                >
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-primary group-hover:underline break-all">
                    {candidate.email}
                  </span>
                </a>
                <a
                  href={`tel:${candidate?.phone}`}
                  className="flex items-center gap-2 text-sm group"
                >
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-primary group-hover:underline">
                    {candidate.phone}
                  </span>
                </a>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{candidate?.address}</span>
                </div>
              </div>
            </Card>

            {/* Interview Schedule */}
            {candidate.status === "interview" && candidate.interviewDetails && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
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
                  {candidate.interviewDetails.scheduledBy && (
                    <div className="pt-2 mt-2 border-t text-xs text-muted-foreground">
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
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                            Reschedule Request Pending
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
                            <div className="text-xs text-muted-foreground mt-2">
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
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRescheduleRequest("reject", "first")}
                            disabled={rescheduleLoading}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
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
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
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
                  {candidate.secondRoundInterviewDetails.scheduledBy && (
                    <div className="pt-2 mt-2 border-t text-xs text-muted-foreground">
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
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                            Reschedule Request Pending
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
                            <div className="text-xs text-muted-foreground mt-2">
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
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRescheduleRequest("reject", "second")}
                            disabled={rescheduleLoading}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Actions */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                Actions
              </h3>
              <TooltipProvider>
                <div className="space-y-1.5">
                  {/* Schedule Interview Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={(e) => {
                            if (!canScheduleInterview) {
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
                          }}
                          disabled={actionLoading || !canScheduleInterview}
                          variant={candidate.status === "interview" ? "default" : "outline"}
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                        >
                          <Calendar className="mr-1.5 h-3.5 w-3.5" />
                          {candidate.status === "interview" ? "✓ Interview" : "Schedule Interview"}
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
                            variant={candidate.interviewDetails?.remarks?.evaluatedBy ? "default" : "outline"}
                            size="sm"
                            className="w-full justify-start h-8 text-xs"
                          >
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            {candidate.interviewDetails?.remarks?.evaluatedBy ? "✓ Remarks" : "Add Remarks"}
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
                          className="w-full justify-start h-8 text-xs"
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit Role
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>Edit candidate role/position</p></TooltipContent>
                  </Tooltip>

                  {/* Schedule Second Round Interview Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={(e) => {
                            if (!canScheduleSecondRound) {
                              e.preventDefault();
                              e.stopPropagation();
                              return;
                            }
                            openSecondRoundDialog();
                          }}
                          disabled={actionLoading || !canScheduleSecondRound}
                          variant={candidate.secondRoundInterviewDetails?.scheduledDate ? "default" : "outline"}
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                        >
                          <Calendar className="mr-1.5 h-3.5 w-3.5" />
                          {candidate.secondRoundInterviewDetails?.scheduledDate ? "✓ Second Round" : "Schedule Second Round"}
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
                          disabled={actionLoading || !canShortlist}
                          variant={candidate.status === "shortlisted" ? "default" : "outline"}
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                        >
                          {candidate.status === "shortlisted" ? "✓ Shortlisted" : "Shortlist"}
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
                          onClick={() => setSelectDialogOpen(true)}
                          disabled={actionLoading || !canSelect}
                          variant={candidate.status === "selected" ? "default" : "outline"}
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                        >
                          {candidate.status === "selected" ? "✓ Selected" : "Select for Training"}
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
                          disabled={actionLoading || !canReject}
                          variant={candidate.status === "rejected" ? "destructive" : "outline"}
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                        >
                          {candidate.status === "rejected" ? "✗ Rejected" : "Reject"}
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
                          disabled={actionLoading || !canStartOnboarding}
                          variant={
                            candidate.status === "onboarding"
                              ? candidate.onboardingDetails?.onboardingComplete
                                ? "secondary"
                                : "default"
                              : "outline"
                          }
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                        >
                          {candidate.status === "onboarding"
                            ? candidate.onboardingDetails?.onboardingComplete
                              ? "✓ Onboarding"
                              : "⏳ Onboarding"
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
                            className="w-full justify-start h-8 text-xs"
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

                  {/* Discontinue Training Button */}
                  {candidate.status === "selected" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            onClick={() => setRejectAfterTrainingDialogOpen(true)}
                            disabled={actionLoading || !canDiscontinueTraining}
                            variant="destructive"
                            size="sm"
                            className="w-full justify-start h-8 text-xs"
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
                          variant={canCreateEmployee() ? "default" : "outline"}
                          size="sm"
                          className="w-full justify-start h-8 text-xs"
                        >
                          Create Employee
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{getButtonTooltip("employee")}</p></TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </Card>


            {/* Training Agreement */}
            {(candidate.status === "selected" || candidate.status === "onboarding") && (
              <Card className="p-4">
                <button
                  onClick={() => setTrainingAgreementExpanded(!trainingAgreementExpanded)}
                  className="w-full flex items-center justify-between mb-2"
                >
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Training Agreement
                  </h3>
                  {trainingAgreementExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {trainingAgreementExpanded && (
                  <div className="flex items-start gap-3 mt-3">
                    {/* Signed PDF Preview */}
                    {candidate.trainingAgreementDetails?.signedPdfUrl && (
                      <div className="flex-1 space-y-2">
                        <p className="text-xs font-medium text-foreground">Signed</p>
                        <div 
                          onClick={() => setShowSignedPdfDialog(true)}
                          className="relative w-32 h-32 bg-muted rounded-lg border-2 border-green-500 dark:border-green-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-green-50 dark:bg-green-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-1" />
                              <p className="text-xs font-semibold text-green-700 dark:text-green-300">Signed</p>
                            </div>
                          </div>
                          
                        </div>
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
                          className="w-full gap-1.5 h-7 text-xs"
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
                            className="w-full gap-1.5 h-7 text-xs border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/20"
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
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                              Re-signature Request Active
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              Requested by {candidate.trainingAgreementDetails.resignatureRequest.requestedBy} on{" "}
                              {new Date(candidate.trainingAgreementDetails.resignatureRequest.requestedAt).toLocaleDateString()}
                            </p>
                            {candidate.trainingAgreementDetails.resignatureRequest.reason && (
                              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                Reason: {candidate.trainingAgreementDetails.resignatureRequest.reason}
                              </p>
                            )}
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                              ⏰ Expires: {new Date(candidate.trainingAgreementDetails.resignatureRequest.tokenExpiresAt).toLocaleDateString()}
                            </p>
                          </div>
                          {canVerify && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelResignature("training")}
                              className="h-6 text-xs text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Unsigned PDF Preview */}
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-medium text-foreground">Unsigned</p>
                      {generatingUnsignedPdf ? (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-[10px] text-muted-foreground">Loading...</p>
                          </div>
                        </div>
                      ) : unsignedTrainingAgreementUrl ? (
                        <div 
                          onClick={() => setShowUnsignedPdfDialog(true)}
                          className="relative w-32 h-32 bg-muted rounded-lg border-2 border-blue-500 dark:border-blue-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Preview</p>
                            </div>
                          </div>
                        
                        </div>
                      ) : (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <p className="text-xs text-muted-foreground text-center px-2">PDF preview</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!trainingAgreementExpanded && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
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
              <Card className="p-4">
                <button
                  onClick={() => setHrPoliciesExpanded(!hrPoliciesExpanded)}
                  className="w-full flex items-center justify-between mb-2"
                >
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    HR Policies
                  </h3>
                  {hrPoliciesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {hrPoliciesExpanded && (
                  <div className="flex items-start gap-3 mt-3">
                    {/* Signed PDF Preview */}
                    {candidate.trainingAgreementDetails?.signedHrPoliciesPdfUrl && (
                      <div className="flex-1 space-y-2">
                        <p className="text-xs font-medium text-foreground">Signed</p>
                        <div 
                          onClick={() => setShowSignedHrPoliciesDialog(true)}
                          className="relative w-32 h-32 bg-muted rounded-lg border-2 border-green-500 dark:border-green-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-green-50 dark:bg-green-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-1" />
                              <p className="text-xs font-semibold text-green-700 dark:text-green-300">Signed</p>
                            </div>
                          </div>
                        </div>
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
                          className="w-full gap-1.5 h-7 text-xs"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </div>
                    )}
                    
                    {/* Unsigned PDF Preview */}
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-medium text-foreground">Unsigned</p>
                      {generatingHrPoliciesPdf ? (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-[10px] text-muted-foreground">Loading...</p>
                          </div>
                        </div>
                      ) : unsignedHrPoliciesUrl ? (
                        <div 
                          onClick={() => setShowUnsignedHrPoliciesDialog(true)}
                          className="relative w-32 h-32 bg-muted rounded-lg border-2 border-blue-500 dark:border-blue-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Preview</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={generateUnsignedHrPolicies}
                          className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                        >
                          <p className="text-xs text-muted-foreground text-center px-2">Click to generate</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!hrPoliciesExpanded && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
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
              <Card className="p-4">
                <button
                  onClick={() => setLetterOfIntentExpanded(!letterOfIntentExpanded)}
                  className="w-full flex items-center justify-between mb-2"
                >
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Letter of Intent
                  </h3>
                  {letterOfIntentExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {letterOfIntentExpanded && (
                  <div className="flex items-start gap-3 mt-3">
                    {/* Signed PDF Preview */}
                    {candidate.trainingAgreementDetails?.signedLetterOfIntentPdfUrl && (
                      <div className="flex-1 space-y-2">
                        <p className="text-xs font-medium text-foreground">Signed</p>
                        <div 
                          onClick={() => setShowSignedLetterOfIntentDialog(true)}
                          className="relative w-32 h-32 bg-muted rounded-lg border-2 border-green-500 dark:border-green-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-green-50 dark:bg-green-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-1" />
                              <p className="text-xs font-semibold text-green-700 dark:text-green-300">Signed</p>
                            </div>
                          </div>
                        </div>
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
                          className="w-full gap-1.5 h-7 text-xs"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </div>
                    )}
                    
                    {/* Unsigned PDF Preview */}
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-medium text-foreground">Unsigned</p>
                      {generatingLetterOfIntentPdf ? (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-[10px] text-muted-foreground">Loading...</p>
                          </div>
                        </div>
                      ) : unsignedLetterOfIntentUrl ? (
                        <div 
                          onClick={() => setShowUnsignedLetterOfIntentDialog(true)}
                          className="relative w-32 h-32 bg-muted rounded-lg border-2 border-blue-500 dark:border-blue-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Preview</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={generateUnsignedLetterOfIntent}
                          className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                        >
                          <p className="text-xs text-muted-foreground text-center px-2">Click to generate</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!letterOfIntentExpanded && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
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
              <Card className="p-4">
                <button
                  onClick={() => setOnboardingAgreementExpanded(!onboardingAgreementExpanded)}
                  className="w-full flex items-center justify-between mb-2"
                >
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Onboarding Agreement
                  </h3>
                  {onboardingAgreementExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {onboardingAgreementExpanded && (
                  <div className="flex items-start gap-3 mt-3">
                    {/* Signed PDF Preview */}
                    {candidate.onboardingDetails?.signedPdfUrl && (
                      <div className="flex-1 space-y-2">
                        <p className="text-xs font-medium text-foreground">Signed</p>
                        <div 
                          onClick={() => setShowSignedOnboardingPdfDialog(true)}
                          className="relative w-32 h-32 bg-muted rounded-lg border-2 border-green-500 dark:border-green-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-green-50 dark:bg-green-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-1" />
                              <p className="text-xs font-semibold text-green-700 dark:text-green-300">Signed</p>
                            </div>
                          </div>
                          
                        </div>
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
                          className="w-full gap-1.5 h-7 text-xs"
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
                            className="w-full gap-1.5 h-7 text-xs border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/20"
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
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                              Re-signature Request Active
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              Requested by {candidate.onboardingDetails.resignatureRequest.requestedBy} on{" "}
                              {new Date(candidate.onboardingDetails.resignatureRequest.requestedAt).toLocaleDateString()}
                            </p>
                            {candidate.onboardingDetails.resignatureRequest.reason && (
                              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                Reason: {candidate.onboardingDetails.resignatureRequest.reason}
                              </p>
                            )}
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                              ⏰ Expires: {new Date(candidate.onboardingDetails.resignatureRequest.tokenExpiresAt).toLocaleDateString()}
                            </p>
                          </div>
                          {canVerify && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelResignature("onboarding")}
                              className="h-6 text-xs text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Unsigned PDF Preview */}
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-medium text-foreground">Unsigned</p>
                      {generatingUnsignedOnboardingPdf ? (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-[10px] text-muted-foreground">Loading...</p>
                          </div>
                        </div>
                      ) : unsignedOnboardingAgreementUrl ? (
                        <div 
                          onClick={() => setShowUnsignedOnboardingPdfDialog(true)}
                          className="relative w-32 h-32 bg-muted rounded-lg border-2 border-blue-500 dark:border-blue-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Preview</p>
                            </div>
                          </div>
                        
                        </div>
                      ) : (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateUnsignedOnboardingAgreement()}
                            className="text-[10px] h-6 px-2"
                          >
                            Generate Preview
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!onboardingAgreementExpanded && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
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
          </div>

          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-9 space-y-3">
            {/* Selection Details - Show when candidate is selected or in onboarding */}
            {(candidate.status === "selected" || candidate.status === "onboarding") && candidate.selectionDetails && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                  Selection Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  {candidate.selectionDetails.role && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Role</p>
                      <p className="text-foreground font-medium">{candidate.selectionDetails.role}</p>
                    </div>
                  )}
                  {candidate.selectionDetails.positionType && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Position Type</p>
                      <p className="text-foreground font-medium capitalize">{candidate.selectionDetails.positionType}</p>
                    </div>
                  )}
                  {candidate.selectionDetails.salary && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Salary</p>
                      <p className="text-foreground font-medium">
                        {(() => {
                          return formatSalary(candidate.selectionDetails.salary);
                        })()}
                      </p>
                    </div>
                  )}
                  {candidate.selectionDetails.duration && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                      <p className="text-foreground font-medium">{candidate.selectionDetails.duration}</p>
                    </div>
                  )}
                  {candidate.selectionDetails.trainingPeriod && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Training Period</p>
                      <p className="text-foreground font-medium">{candidate.selectionDetails.trainingPeriod}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Interview Remarks - Prominent Section */}
            {/* Show remarks if status is interview, selected, or onboarding and remarks exist */}
            {(candidate.status === "interview" || candidate.status === "selected" || candidate.status === "onboarding") && candidate.interviewDetails?.remarks && (
              <Card className="p-4">
                <button
                  onClick={() => setRemarksExpanded(!remarksExpanded)}
                  className="w-full flex items-center justify-between mb-3"
                >
                  <h3 className="text-base font-semibold text-foreground">HR Interview Remarks</h3>
                  {remarksExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {remarksExpanded && (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Experience</p>
                        <p className="text-foreground leading-snug">{candidate.interviewDetails.remarks.experienceValidation}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">MTI</p>
                        <p className="text-foreground leading-snug">{candidate.interviewDetails.remarks.motherTongueInfluence}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">English</p>
                        <p className="text-foreground leading-snug">{candidate.interviewDetails.remarks.englishSpeaking}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Understanding</p>
                        <p className="text-foreground leading-snug">{candidate.interviewDetails.remarks.understandingScale}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Listening</p>
                        <p className="text-foreground leading-snug">{candidate.interviewDetails.remarks.listeningSkills}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Professionalism</p>
                        <p className="text-foreground leading-snug">{candidate.interviewDetails.remarks.basicProfessionalism}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Stability</p>
                        <p className="text-foreground leading-snug">{candidate.interviewDetails.remarks.stabilitySignals}</p>
                      </div>
                      {candidate.interviewDetails.remarks.salaryExpectations && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Salary Expectations</p>
                          <p className="text-foreground leading-snug">{candidate.interviewDetails.remarks.salaryExpectations}</p>
                        </div>
                      )}
                      {candidate.interviewDetails.remarks.hrNotes && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-muted-foreground mb-0.5">HR Remarks</p>
                          <p className="text-foreground leading-snug">{candidate.interviewDetails.remarks.hrNotes}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
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

            {/* Offer Letter */}
            {candidate.status === "onboarding" && (
              <Card className="p-4">
                <button
                  onClick={() => setOfferLetterExpanded(!offerLetterExpanded)}
                  className="w-full flex items-center justify-between mb-2"
                >
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Offer Letter
                  </h3>
                  {offerLetterExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {offerLetterExpanded && (
                  <div className="flex items-start gap-3 mt-3">
                    {/* Signed PDF Preview */}
                    {candidate.selectionDetails?.signedOfferLetterPdfUrl && (
                      <div className="flex-1 space-y-2">
                        <p className="text-xs font-medium text-foreground">Signed</p>
                        <div 
                          onClick={() => setShowSignedOfferLetterPdfDialog(true)}
                          className="relative w-32 h-32 bg-muted rounded-lg border-2 border-green-500 dark:border-green-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-green-50 dark:bg-green-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-1" />
                              <p className="text-xs font-semibold text-green-700 dark:text-green-300">Signed</p>
                            </div>
                          </div>
                        </div>
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
                          className="w-full gap-1.5 h-7 text-xs"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </div>
                    )}
                    
                    {/* Unsigned PDF Preview */}
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-medium text-foreground">Unsigned</p>
                      {generatingUnsignedOfferLetterPdf ? (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-[10px] text-muted-foreground">Loading...</p>
                          </div>
                        </div>
                      ) : unsignedOfferLetterUrl ? (
                        <div 
                          onClick={() => setShowUnsignedOfferLetterPdfDialog(true)}
                          className="relative w-32 h-32 bg-muted rounded-lg border-2 border-blue-500 dark:border-blue-400 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20">
                            <div className="text-center p-2">
                              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Preview</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={generateUnsignedOfferLetter}
                          className="w-32 h-32 bg-muted rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                        >
                          <p className="text-xs text-muted-foreground text-center px-2">Click to generate</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!offerLetterExpanded && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
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
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">Cover Letter</h3>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {candidate.coverLetter}
                </div>
              </Card>
            )}

            {/* Resume Preview */}
            <Card className="p-4">
              <button
                onClick={() => setResumeExpanded(!resumeExpanded)}
                className="w-full flex items-center justify-between mb-2"
              >
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Resume</h3>
                {resumeExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {resumeExpanded && (
                <>
                  <div className="bg-muted rounded-md overflow-hidden border">
                    <iframe
                      src={`${candidate.resumeUrl}#toolbar=0`}
                      className="w-full h-[700px] border-0"
                      title="Resume Preview"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    If preview doesn&apos;t load, <a href={candidate.resumeUrl} className="text-primary hover:underline">download resume</a>
                  </p>
                </>
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
              accountNumber: candidate.onboardingDetails.bankDetails.accountNumber,
              ifscCode: candidate.onboardingDetails.bankDetails.ifscCode,
              bankName: candidate.onboardingDetails.bankDetails.bankName,
              accountHolderName: candidate.onboardingDetails.bankDetails.accountHolderName,
            } : undefined,
            documents: candidate.onboardingDetails.documents ? {
              aadharCard: candidate.onboardingDetails.documents.aadharCard,
            } : undefined,
          } : undefined,
          selectionDetails: candidate.selectionDetails ? {
            salary: candidate.selectionDetails.salary,
            role: candidate.selectionDetails.role,
          } : undefined,
        }}
        onCreated={() => {
          // Optionally refresh candidate after creation
          setCreateEmployeeDialogOpen(false);
        }}
      />

      <SelectCandidateDialog
        open={selectDialogOpen}
        onClose={() => setSelectDialogOpen(false)}
        onSubmit={handleSelectCandidateWrapper}
        loading={actionLoading}
        candidatePosition={candidate?.position}
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
            <Button onClick={handleScheduleSecondRound} disabled={schedulingSecondRound}>
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
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the role/position for {candidate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-sm font-medium mb-2 block">
              Role/Position
            </Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {/* Include current role if not in options */}
                {candidate?.position &&
                  !ROLE_OPTIONS.includes(candidate.position as typeof ROLE_OPTIONS[number]) && (
                    <SelectItem value={candidate.position}>
                      {candidate.position} (Current)
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
                    className="flex-1 text-xs font-mono"
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
