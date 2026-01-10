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

interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: number;
  address: string;
  city: string;
  country: string;
  college?: string;
  coverLetter?: string;
  linkedin?: string;
  portfolio?: string;
  resumeUrl: string;
  photoUrl?: string;
  status: "pending"|"interview"|"shortlisted"|"selected"|"rejected"|"onboarding";
  createdAt: string;
  interviewDetails?: {
    scheduledDate?: string;
    scheduledTime?: string;
    scheduledBy?: string;
    scheduledAt?: string;
    notes?: string;
    remarks?: {
      experienceValidation?: string;
      motherTongueInfluence?: string;
      englishSpeaking?: string;
      understandingScale?: string;
      listeningSkills?: string;
      basicProfessionalism?: string;
      stabilitySignals?: string;
      salaryExpectations?: string;
      hrNotes?: string;
      evaluatedBy?: string;
      evaluatedAt?: string;
      lastUpdatedBy?: string;
      lastUpdatedAt?: string;
    };
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
  selectionDetails?: {
    positionType: "fulltime" | "intern";
    duration: string;
    trainingPeriod: string;
    role: string;
    salary?: number;
  };
  shortlistDetails?: {
    suitableRoles: string[];
    notes?: string;
  };
  rejectionDetails?: {
    reason: string;
  };
  onboardingDetails?: {
    onboardingLink?: string;
    personalDetails?: {
      dateOfBirth?: string;
      gender?: string;
      nationality?: string;
      fatherName?: string;
    };
    bankDetails?: {
      accountHolderName?: string;
      accountNumber?: string;
      ifscCode?: string;
      bankName?: string;
    };
    documents?: {
      aadharCard?: string;
      aadharCardFront?: string;
      aadharCardBack?: string;
      panCard?: string;
      highSchoolMarksheet?: string;
      interMarksheet?: string;
      graduationMarksheet?: string;
      experienceLetter?: string;
      relievingLetter?: string;
      salarySlips?: string[];
    };
    documentVerification?: {
      [key: string]: {
        verified: boolean;
        verifiedBy?: string | null;
        verifiedAt?: Date | string | null;
      };
    };
    eSign?: {
      signatureImage?: string;
      signedAt?: string;
    };
    termsAccepted?: boolean;
    termsAcceptedAt?: string;
    onboardingComplete?: boolean;
    completedAt?: string | Date;
    signedPdfUrl?: string;
    verifiedByHR?: {
      verified: boolean;
      verifiedBy?: string | null;
      verifiedAt?: Date | string | null;
      notes?: string | null;
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

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

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
  const [interviewRemarksDialogOpen, setInterviewRemarksDialogOpen] = useState(false);
  const [remarksExpanded, setRemarksExpanded] = useState(true);
  const [resumeExpanded, setResumeExpanded] = useState(true);
  const [trainingAgreementExpanded, setTrainingAgreementExpanded] = useState(true);
  const [unsignedTrainingAgreementUrl, setUnsignedTrainingAgreementUrl] = useState<string | null>(null);
  const [generatingUnsignedPdf, setGeneratingUnsignedPdf] = useState(false);
  const [showSignedPdfDialog, setShowSignedPdfDialog] = useState(false);
  const [showUnsignedPdfDialog, setShowUnsignedPdfDialog] = useState(false);
  const [onboardingAgreementExpanded, setOnboardingAgreementExpanded] = useState(true);
  const [unsignedOnboardingAgreementUrl, setUnsignedOnboardingAgreementUrl] = useState<string | null>(null);
  const [generatingUnsignedOnboardingPdf, setGeneratingUnsignedOnboardingPdf] = useState(false);
  const [showSignedOnboardingPdfDialog, setShowSignedOnboardingPdfDialog] = useState(false);
  const [showUnsignedOnboardingPdfDialog, setShowUnsignedOnboardingPdfDialog] = useState(false);

  const generateUnsignedTrainingAgreement = async () => {
    if (!candidate || !candidate.name || !candidate.position) return;
    
    setGeneratingUnsignedPdf(true);
    try {
      const agreementDate = new Date().toLocaleDateString("en-IN");
      const agreementPayload = {
        candidateName: candidate.name,
        position: candidate.position,
        date: agreementDate,
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

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const response = await fetch(`/api/candidates/${candidateId}`);
        const result = await response.json();

        if (result.success) {
          setCandidate(result.data);
        }
      } catch (error) {
        console.error("Error fetching candidate:", error);
      } finally {
        setLoading(false);
      }
    };

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

    if (candidateId) {
      fetchCandidate();
      fetchUser();
    }
  }, [candidateId]);

  const generateUnsignedOnboardingAgreement = async () => {
    if (!candidate || !candidate.name || !candidate.position) {
      console.log("Cannot generate unsigned onboarding PDF: missing candidate data");
      return;
    }
    
    setGeneratingUnsignedOnboardingPdf(true);
    try {
      const agreementPayload = {
        agreementDate: new Date().toLocaleDateString("en-IN"),
        agreementCity: candidate.city ?? "Kanpur",
        employeeName: candidate.name,
        fatherName: candidate.onboardingDetails?.personalDetails?.fatherName || "",
        employeeAddress: candidate.address || "",
        designation: candidate.position,
        effectiveFrom: new Date().toLocaleDateString("en-IN"),
        postingLocation: candidate.city || "Kanpur",
        salaryINR: candidate.selectionDetails?.role ?? "As per employment terms",
        witness1: "____________________",
        witness2: "____________________",
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


  const refreshCandidate = async () => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`);
      const result = await response.json();
      if (result.success) {
        setCandidate(result.data);
      }
    } catch (error) {
      console.error("Error refreshing candidate:", error);
    }
  };

  const canVerify = userRole === "HR" || userRole === "SuperAdmin";

  const handleSelectCandidate = async (data: SelectionData) => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `/api/candidates/${candidateId}/action`,
        {
          status: "selected",
          selectionDetails: {
            positionType: data.positionType,
            trainingDate: data.trainingDate,
            trainingPeriod: data.trainingPeriod,
            role: data.role,
          },
        }
      );

      const result = response.data;
      if (result.success) {
        setCandidate(result.data);
        setSelectDialogOpen(false);
      } else {
        setError(result.error || "Failed to select candidate");
      }
    } catch (err: any) {
      console.error("Error selecting candidate:", err);
      setError(
        err.response?.data?.error ||
          "An error occurred while selecting the candidate"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleShortlistCandidate = async (data: ShortlistData) => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `/api/candidates/${candidateId}/action`,
        {
          status: "shortlisted",
          shortlistDetails: {
            suitableRoles: data.suitableRoles,
            notes: data.notes,
          },
        }
      );

      const result = response.data;
      if (result.success) {
        setCandidate(result.data);
        setShortlistDialogOpen(false);
      } else {
        setError(result.error || "Failed to shortlist candidate");
      }
    } catch (err: any) {
      console.error("Error shortlisting candidate:", err);
      setError(
        err.response?.data?.error ||
          "An error occurred while shortlisting the candidate"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectCandidate = async (data: RejectionData) => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `/api/candidates/${candidateId}/action`,
        {
          status: "rejected",
          rejectionDetails: {
            reason: data.reason,
          },
        }
      );

      const result = response.data;
      if (result.success) {
        setCandidate(result.data);
        setRejectDialogOpen(false);
      } else {
        setError(result.error || "Failed to reject candidate");
      }
    } catch (err: any) {
      console.error("Error rejecting candidate:", err);
      setError(
        err.response?.data?.error ||
          "An error occurred while rejecting the candidate"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscontinueTraining = async (data: RejectionData) => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `/api/candidates/${candidateId}/action`,
        {
          status: "rejected",
          rejectionDetails: {
            reason: data.reason,
          },
          isTrainingDiscontinuation: true, // Flag to indicate this is training discontinuation
        }
      );

      const result = response.data;
      if (result.success) {
        setCandidate(result.data);
        setRejectAfterTrainingDialogOpen(false);
      } else {
        setError(result.error || "Failed to discontinue training");
      }
    } catch (err: any) {
      console.error("Error discontinuing training:", err);
      setError(
        err.response?.data?.error ||
          "An error occurred while discontinuing training"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleOnboarding = async (candidateId: string) => {

    try {
      const response = await axios.post(
        `/api/candidates/${candidateId}/action`,
        {
          status: "onboarding"

        }
      );
      const result = response.data;
      if (result.success) {
        setCandidate(result.data);
      } else {
        setError(result.error || "Failed to update candidate");
      }
    } catch (err: any) {
      console.error("Error updating candidate:", err);
      setError(
        err.response?.data?.error ||
          "An error occurred while updating the candidate"
      );
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "selected":
        return "bg-green-100 text-green-800";
      case "shortlisted":
        return "bg-blue-100 text-blue-800";
      case "interview":
        return "bg-purple-100 text-purple-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "onboarding":
        return "bg-purple-100 text-purple-800";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };        

  // Helper functions for button availability
  const canShortlist = () => {
    return candidate?.status === "pending" || candidate?.status === "interview";
  };

  const hasInterviewRemarks = () => {
    return !!candidate?.interviewDetails?.remarks?.evaluatedBy;
  };

  const canSelect = () => {
    // Can select from pending, interview, or shortlisted
    // If status is interview, remarks must be completed
    const status = candidate?.status;
    if (status === "interview") {
      return hasInterviewRemarks();
    }
    if (status === "pending" || status === "shortlisted") {
      return true;
    }
    return false;
  };

  const canReject = () => {
    // Can reject from any status except already rejected or onboarding
    // If status is interview, remarks must be completed
    const status = candidate?.status;
    if (status === "interview") {
      return hasInterviewRemarks();
    }
    return status !== "rejected" && status !== "onboarding";
  };

  const canDiscontinueTraining = () => {
    // Can discontinue training only when candidate is selected for training
    return candidate?.status === "selected";
  };

  const canStartOnboarding = () => {
    // Can only start onboarding if candidate is selected
    return candidate?.status === "selected";
  };

  const canCreateEmployee = () => {
    // Can create employee only if onboarding is complete
    return candidate?.status === "onboarding" && candidate?.onboardingDetails?.onboardingComplete === true;
  };

  const canScheduleInterview = () => {
    // Can schedule interview only for pending candidates and if not already scheduled
    return candidate?.status === "pending" && !candidate?.interviewDetails?.scheduledDate;
  };

  const canScheduleSecondRound = () => {
    // Can schedule second round if not already scheduled
    // Check both if the object exists and if scheduledDate has a value
    const hasSecondRound = candidate?.secondRoundInterviewDetails?.scheduledDate;
    return !hasSecondRound;
  };

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

    setActionLoading(true);
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
      setActionLoading(false);
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
      {/* Compact Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <Link href="/dashboard/candidatePortal">
              <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            </Link>
            <Badge className={`${getStatusColor(candidate.status)} text-xs px-3 py-1`}>
              {candidate.status === "selected"
                ? "Selected for Training"
                : candidate.status === "interview"
                ? "Interview"
                : candidate?.status?.charAt(0)?.toUpperCase() +
                  candidate?.status?.slice(1)}
            </Badge>
          </div>
          <div className="flex items-start justify-between">

                       <div className="flex items-start gap-4">
              {candidate.photoUrl && (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
                  <Image
                    src={candidate.photoUrl}
                    alt={candidate.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground leading-tight">
                  {candidate.name}
                </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {candidate.position}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {candidate.experience === 0
                    ? "Fresher"
                    : `${candidate.experience} ${candidate.experience === 1 ? "year" : "years"} exp`}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {candidate.city}, {candidate.country}
                </span>
                {candidate.college && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {candidate.college}
                  </span>
                )}
              </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={candidate.resumeUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5 h-8">
                  <Download className="w-3.5 h-3.5" />
                  Resume
                </Button>
              </a>
              {(candidate.linkedin || candidate.portfolio) && (
                <div className="flex gap-1">
                  {candidate.linkedin && (
                    <a
                      href={candidate.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Linkedin className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                  {candidate.portfolio && (
                    <a
                      href={candidate.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Globe className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                            disabled={actionLoading}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRescheduleRequest("reject", "first")}
                            disabled={actionLoading}
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
                            disabled={actionLoading}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRescheduleRequest("reject", "second")}
                            disabled={actionLoading}
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
                          }}
                          disabled={actionLoading || !canScheduleInterview()}
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
                  {candidate.status === "interview" && canVerify && (
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
                          disabled={actionLoading || !canShortlist()}
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
                          disabled={actionLoading || !canSelect()}
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
                          disabled={actionLoading || !canReject()}
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
                          onClick={() => handleOnboarding(candidate._id)}
                          disabled={actionLoading || !canStartOnboarding()}
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
            {candidate.status === "selected" && (
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
            {/* Interview Remarks - Prominent Section */}
            {candidate.status === "interview" && candidate.interviewDetails?.remarks && (
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
        }}
        onCreated={() => {
          // Optionally refresh candidate after creation
          setCreateEmployeeDialogOpen(false);
        }}
      />

      <SelectCandidateDialog
        open={selectDialogOpen}
        onClose={() => setSelectDialogOpen(false)}
        onSubmit={handleSelectCandidate}
        loading={actionLoading}
      />
      <ShortlistCandidateDialog
        open={shortlistDialogOpen}
        onClose={() => setShortlistDialogOpen(false)}
        onSubmit={handleShortlistCandidate}
        loading={actionLoading}
      />
      <RejectCandidateDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onSubmit={handleRejectCandidate}
        loading={actionLoading}
      />
      <RejectCandidateDialog
        open={rejectAfterTrainingDialogOpen}
        onClose={() => setRejectAfterTrainingDialogOpen(false)}
        onSubmit={handleDiscontinueTraining}
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
      {candidate.status === "interview" && (
        <InterviewRemarksDialog
          open={interviewRemarksDialogOpen}
          onOpenChange={setInterviewRemarksDialogOpen}
          candidateId={candidate._id}
          candidateName={candidate.name}
          existingRemarks={candidate.interviewDetails?.remarks}
          onSuccess={refreshCandidate}
        />
      )}
    </div>
  );
}
