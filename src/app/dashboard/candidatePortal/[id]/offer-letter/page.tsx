"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, AlertCircle, Loader2, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SignaturePad } from "../../components/signature-pad";
import { SignaturePreviewModal } from "../../components/signature-preview-modal";
import axios from "@/util/axios";
import { parseDashboardPath } from "@/features/people/navigation";

interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  status: string;
  city?: string;
  officeLocation?: string | null;
  officeAddressId?:
    | string
    | {
        _id: string;
        name: string;
        city: string;
        formattedAddress?: string;
      }
    | null;
  selectionDetails?: {
    positionType: string;
    duration: string;
    trainingPeriod: string;
    role: string;
    salary?: string | number;
    trainingDate?: string;
    workingHours?: string;
    offerLetterSent?: boolean;
    offerLetterSentAt?: string;
    offerLetterSigningLink?: string;
    signedOfferLetterPdfUrl?: string;
    offerLetterSigned?: boolean;
    signedDocumentsEmailSentAt?: string;
  };
  trainingAgreementDetails?: {
    signedHrPoliciesPdfUrl?: string;
  };
}

interface UploadedFile {
  url: string;
  name: string;
}

function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8 flex items-center justify-center">
    <div className="w-full max-w-4xl space-y-6">
      <div className="text-center space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mx-auto animate-pulse" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mx-auto animate-pulse" />
      </div>
      <div className="space-y-3 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full" />
        </div>
      </div>
    </div>
  </div>
);

export default function OfferLetterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { uploadFiles } = useBunnyUpload();
  const { toast } = useToast();
  const candidateId = params?.id as string;
  const hiringReturnTo = parseDashboardPath(searchParams.get("returnTo"));

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmationEmailed, setConfirmationEmailed] = useState(false);
  const [signature, setSignature] = useState<UploadedFile | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [useDigitalSignature, setUseDigitalSignature] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [unsignedPdfUrl, setUnsignedPdfUrl] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [hrPoliciesPdfUrl, setHrPoliciesPdfUrl] = useState<string | null>(null);
  const pdfGeneratedRef = useRef(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const response = await fetch(`/api/candidates/${candidateId}`);
        const result = await response.json();

        if (result.success) {
          setCandidate(result.data);
          
          // Load signed PDF if available, otherwise load unsigned PDF
          if (result.data.selectionDetails?.signedOfferLetterPdfUrl) {
            setSignedPdfUrl(result.data.selectionDetails.signedOfferLetterPdfUrl);
            setUnsignedPdfUrl(null);
          } else if (result.data.selectionDetails?.unsignedOfferLetterPdfUrl) {
            // Load unsigned PDF if signed PDF doesn't exist
            setUnsignedPdfUrl(result.data.selectionDetails.unsignedOfferLetterPdfUrl);
            setSignedPdfUrl(null);
          }
          if (result.data.trainingAgreementDetails?.signedHrPoliciesPdfUrl) {
            setHrPoliciesPdfUrl(result.data.trainingAgreementDetails.signedHrPoliciesPdfUrl);
          }
        } else {
          setError("Failed to load candidate information");
        }
      } catch (error) {
        console.error("Error fetching candidate:", error);
        setError("Failed to load candidate information");
      } finally {
        setLoading(false);
      }
    };

    if (candidateId) {
      fetchCandidate();
    }
  }, [candidateId]);

  const generateUnsignedPdf = async () => {
    if (!candidate || !candidate.name || !candidate.position) return;
    
    // DEFENSIVE CHECK: If document is already signed, don't generate unsigned PDF
    if (candidate.selectionDetails?.signedOfferLetterPdfUrl || signedPdfUrl) {
      toast({
        title: "Document Already Signed",
        description: "This document has already been signed. Please use the signed PDF.",
        variant: "destructive",
      });
      if (candidate.selectionDetails?.signedOfferLetterPdfUrl) {
        setSignedPdfUrl(candidate.selectionDetails.signedOfferLetterPdfUrl);
      }
      return;
    }
    
    setGeneratingPdf(true);
    try {
      const salaryValue = candidate.selectionDetails?.salary;
      let annualCTC = "As per company policy";
      if (salaryValue) {
        annualCTC = String(salaryValue);
      }

      // Extract first name for "Mr./Ms." line
      const candidateFullName = candidate.name || "";
      const candidateFirstName = candidateFullName.split(" ")[0] || candidateFullName;

      const offerLetterPayload = {
        letterDate: new Date().toISOString().slice(0, 10),
        employeeName: candidateFirstName,
        employeeFullName: candidateFullName,
        designation: candidate.selectionDetails?.role || candidate.position,
        dateOfJoining: candidate.selectionDetails?.trainingDate
          ? String(candidate.selectionDetails.trainingDate)
          : new Date().toISOString().slice(0, 10),
        postingLocation: (candidate.officeAddressId && typeof candidate.officeAddressId === "object" && (candidate.officeAddressId.formattedAddress || candidate.officeAddressId.city)) || candidate.officeLocation || candidate.city || "",
        annualCTC: annualCTC,
        workingHours: candidate.selectionDetails?.workingHours?.trim() || "11:00 AM to 8:00 PM",
        salaryPaymentCycle: "15th to 18th",
        probationPeriod: "six (6) months",
        candidateId: candidate._id,
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
      setUnsignedPdfUrl(url);

      // Upload unsigned PDF to BunnyCDN and save to database
      try {
        const pdfFile = new File(
          [pdfBlob],
          `Offer-Letter-${candidateId}-Unsigned.pdf`,
          { type: "application/pdf" }
        );

        const { imageUrls, error: uploadErr } = await uploadFiles(
          [pdfFile],
          "Documents/UnsignedPDFs"
        );

        if (!uploadErr && imageUrls?.length) {
          const unsignedPdfUrl = imageUrls[0];
          
          // Save unsigned PDF URL to database
          const saveResponse = await axios.patch(`/api/candidates/${candidateId}`, {
            "selectionDetails.unsignedOfferLetterPdfUrl": unsignedPdfUrl,
          });

          if (saveResponse.data.success) {
            console.log("✅ Unsigned Offer Letter PDF saved to database:", unsignedPdfUrl);
          } else {
            console.warn("⚠️ Failed to save unsigned PDF URL to database");
          }
        } else {
          console.warn("⚠️ Failed to upload unsigned PDF to CDN");
        }
      } catch (uploadError) {
        console.error("Error uploading unsigned appointment letter:", uploadError);
      }

      try {
        const hrPdfResponse = await axios.post(
          "/api/candidates/hrPolicies",
          {
            candidateName: candidate.name,
            position: candidate.position,
            date: new Date().toISOString(),
            candidateId: candidate._id,
          },
          { responseType: "arraybuffer", headers: { "Content-Type": "application/json" } },
        );
        const hrPdfBlob = new Blob([hrPdfResponse.data], { type: "application/pdf" });
        setHrPoliciesPdfUrl(URL.createObjectURL(hrPdfBlob));
      } catch (hrError) {
        console.error("Error generating HR policies preview:", hrError);
      }
    } catch (error: any) {
      console.error("Error generating unsigned PDF:", error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.details || error?.message || "Failed to generate PDF preview";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Auto-load signed PDF or generate unsigned PDF when component loads.
  // The ready flag is set only after the timer fires, so a cancelled first pass can run again.
  useEffect(() => {
    if (loading || !candidate || pdfGeneratedRef.current) return;
    if (candidate.selectionDetails?.signedOfferLetterPdfUrl) {
      setSignedPdfUrl(candidate.selectionDetails.signedOfferLetterPdfUrl);
      setUnsignedPdfUrl(null);
      pdfGeneratedRef.current = true;
      return;
    }
    if (!candidate.name || !candidate.position) return;
    const timer = setTimeout(() => {
      pdfGeneratedRef.current = true;
      generateUnsignedPdf();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, candidate]);

  const handleSignatureCapture = (signatureUrl: string) => {
    setPreviewSignature(signatureUrl);
    setShowSignaturePreview(true);
  };

  const confirmSignature = async () => {
    if (!previewSignature) {
      toast({
        title: "No signature",
        description: "Please draw your signature first",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingSignature(true);

      const signatureFile = base64ToFile(
        previewSignature,
        `signature-${Date.now()}.png`
      );

      const { imageUrls, error } = await uploadFiles(
        [signatureFile],
        "Documents/Signatures"
      );

      if (error || !imageUrls?.length) {
        toast({
          title: "Upload failed",
          description: error || "Failed to upload signature",
          variant: "destructive",
        });
        return;
      }

      setSignature({
        url: imageUrls[0],
        name: signatureFile.name,
      });

      toast({
        title: "Signature saved",
        description: "Digital signature uploaded successfully",
      });

      setShowSignaturePad(false);
      setShowSignaturePreview(false);
      setPreviewSignature(null);
    } catch (error) {
      console.error("Signature upload error:", error);
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUploadingSignature(false);
    }
  };

  const cancelSignaturePad = () => {
    setShowSignaturePad(false);
    setPreviewSignature(null);
    setShowSignaturePreview(false);
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    e.target.value = "";

    try {
      setUploadingSignature(true);

      const { imageUrls, error } = await uploadFiles(
        [file],
        "Documents/Signatures"
      );

      if (error || !imageUrls?.length) {
        toast({
          title: "Upload failed",
          description: error || "Failed to upload signature",
          variant: "destructive",
        });
        return;
      }

      setSignature({
        url: imageUrls[0],
        name: file.name,
      });

      toast({
        title: "Signature uploaded",
        description: "Your signature has been uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading signature:", error);
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUploadingSignature(false);
    }
  };

  const documentsSigned = Boolean(
    candidate?.selectionDetails?.signedOfferLetterPdfUrl &&
    candidate?.trainingAgreementDetails?.signedHrPoliciesPdfUrl
  );
  const documentsReviewed = Boolean(unsignedPdfUrl && hrPoliciesPdfUrl);

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (documentsSigned) {
      setError("These documents are already signed.");
      return;
    }
    if (!documentsReviewed) {
      setError("Please wait until the offer letter and the HR policies are ready to download.");
      return;
    }
    setError(null);
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    setError(null);
    setSubmitting(true);

    try {
      if (!signature) {
        throw new Error("Please provide your signature");
      }

      if (!candidate) {
        throw new Error("Candidate information not available");
      }

      // Generate PDF with signature
      const salaryValue = candidate.selectionDetails?.salary;
      let annualCTC = "As per company policy";
      if (salaryValue) {
        annualCTC = String(salaryValue);
      }

      const offerLetterPayload = {
        letterDate: new Date().toISOString().slice(0, 10),
        employeeName: candidate.name.split(" ")[0] || candidate.name, // First name for "Mr./Ms." line
        employeeFullName: candidate.name, // Full name
        designation: candidate.selectionDetails?.role || candidate.position,
        dateOfJoining: candidate.selectionDetails?.trainingDate
          ? String(candidate.selectionDetails.trainingDate)
          : new Date().toISOString().slice(0, 10),
        postingLocation: (candidate.officeAddressId && typeof candidate.officeAddressId === "object" && (candidate.officeAddressId.formattedAddress || candidate.officeAddressId.city)) || candidate.officeLocation || candidate.city || "",
        annualCTC: annualCTC,
        workingHours: candidate.selectionDetails?.workingHours?.trim() || "11:00 AM to 8:00 PM",
        salaryPaymentCycle: "15th to 18th",
        probationPeriod: "six (6) months",
        candidateId: candidate._id,
        candidateSignatureBase64: signature.url,
        signingDate: new Date().toISOString(), // Add signing date
      };

      // Request signed PDF from API
      const pdfResponse = await axios.post(
        "/api/candidates/offerLetter",
        offerLetterPayload,
        {
          responseType: "arraybuffer",
          headers: { "Content-Type": "application/json" },
        }
      );

      // Convert result to Blob
      const pdfBlob = new Blob([pdfResponse.data], {
        type: "application/pdf",
      });

      // Store signed PDF URL for preview
      // CRITICAL: Use blob URL immediately for preview, then replace with CDN URL after upload
      const signedUrl = URL.createObjectURL(pdfBlob);
      setSignedPdfUrl(signedUrl);
      setUnsignedPdfUrl(null);

      // Upload signed PDF to BunnyCDN
      const pdfFile = new File(
        [pdfBlob],
        `Offer-Letter-${candidateId}.pdf`,
        { type: "application/pdf" }
      );

      const { imageUrls, error: uploadErr } = await uploadFiles(
        [pdfFile],
        "Documents/SignedPDFs"
      );

      if (uploadErr || !imageUrls?.length) {
        throw new Error("Failed to upload signed PDF to CDN");
      }

      const signedPdfUrl = imageUrls[0];

      const hrPdfResponse = await axios.post(
        "/api/candidates/hrPolicies",
        {
          candidateName: candidate.name,
          position: candidate.position,
          date: new Date().toISOString(),
          candidateId: candidate._id,
          signatureBase64: signature.url,
        },
        { responseType: "arraybuffer", headers: { "Content-Type": "application/json" } },
      );
      const hrPdfBlob = new Blob([hrPdfResponse.data], { type: "application/pdf" });
      const hrPdfFile = new File(
        [hrPdfBlob],
        `HR-Policies-${candidateId}-Signed.pdf`,
        { type: "application/pdf" },
      );
      const { imageUrls: hrUrls, error: hrUploadErr } = await uploadFiles(
        [hrPdfFile],
        "Documents/SignedPDFs",
      );
      if (hrUploadErr || !hrUrls?.length) {
        throw new Error("Failed to upload the signed HR policies");
      }
      const signedHrPoliciesPdfUrl = hrUrls[0];

      const formData = new FormData();
      formData.append("signature", signature.url);
      formData.append("signedPdfUrl", signedPdfUrl);
      formData.append("signedHrPoliciesPdfUrl", signedHrPoliciesPdfUrl);
      formData.append("agreementAccepted", "true");

      const offerLetterRes = await axios.post(
        `/api/candidates/${candidateId}/offer-letter`,
        formData
      );

      if (!offerLetterRes.data.success) {
        throw new Error(
          offerLetterRes.data.error || "Failed to save offer letter"
        );
      }

      setConfirmationEmailed(Boolean(offerLetterRes.data.emailSent));
      setSuccess(true);
      setHrPoliciesPdfUrl(signedHrPoliciesPdfUrl);
      const updatedCandidate = offerLetterRes.data.data;
      setCandidate(updatedCandidate);

      // Update signed PDF URL with CDN URL from database response
      if (updatedCandidate.selectionDetails?.signedOfferLetterPdfUrl) {
        // Use CDN URL from database (more reliable than blob URL)
        setSignedPdfUrl(updatedCandidate.selectionDetails.signedOfferLetterPdfUrl);
        setUnsignedPdfUrl(null);
      }

      // Refresh candidate data from database to ensure we have latest state
      setTimeout(async () => {
        try {
          const refreshResponse = await fetch(`/api/candidates/${candidateId}?t=${Date.now()}`, {
            cache: "no-store",
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          });
          const refreshResult = await refreshResponse.json();
          
          if (refreshResult.success && refreshResult.data) {
            const refreshedCandidate = refreshResult.data;
            setCandidate(refreshedCandidate);
            
            // CRITICAL: Always load signed PDF from database if available
            if (refreshedCandidate.selectionDetails?.signedOfferLetterPdfUrl) {
              setSignedPdfUrl(refreshedCandidate.selectionDetails.signedOfferLetterPdfUrl);
              setUnsignedPdfUrl(null);
            }
          }
        } catch (refreshErr) {
          console.error("❌ Error refreshing candidate data:", refreshErr);
          // Don't fail the entire process if refresh fails - PDFs are already stored in DB
        }
      }, 1000);

      toast({
        title: "Success",
        description: "Your documents have been signed. You may close this tab.",
        duration: 6000,
      });

      setSubmitting(false);
    } catch (err: any) {
      console.error("Error submitting offer letter:", err);
      setError(err.response?.data?.error || err.message);
      toast({
        title: "Error",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const confirmationSent = confirmationEmailed || Boolean(candidate?.selectionDetails?.signedDocumentsEmailSentAt);

  if (candidate && (success || documentsSigned)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-lg p-8 text-center bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-500">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Documents signed successfully
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            HR will update you on the further steps. You may close this tab.
          </p>
          {confirmationSent ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              A copy of the signed offer letter and HR policies has been sent to your email.
            </p>
          ) : null}
        </Card>
      </div>
    );
  }

  if (!candidate || (candidate.status !== "selected" && candidate.status !== "onboarding")) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">
              Access Denied
            </p>
            <p className="text-muted-foreground">
              This page opens after you are selected.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {hiringReturnTo ? (
          <div className="mb-4">
            <Button variant="ghost" size="sm" className="gap-1.5 h-8" asChild>
              <Link href={hiringReturnTo}>
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to hiring record
              </Link>
            </Button>
          </div>
        ) : null}
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent mb-3">
            Offer Letter
          </h1>
          <p className="text-lg text-muted-foreground">
            Please review and sign your offer letter and the HR policies
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <Card className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border-2 border-green-400 dark:border-green-700 rounded-lg shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center">
                  <Check className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-2">
                  Offer Letter Signed Successfully!
                </h3>
                <p className="text-base text-green-700 dark:text-green-400 mb-4">
                  Your signature has been applied to the offer letter and the HR policies.
                </p>
                <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Important: Please Download Your Signed Document
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Please download the signed document below for your records. This document contains your signature and is legally binding.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-lg flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">Error</p>
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitClick} noValidate className="space-y-6">
          {/* Candidate Information */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/10 dark:to-blue-800/10 border-blue-200 dark:border-blue-700 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-400 text-white dark:text-gray-900 flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Your Information
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Name
                </p>
                <p className="text-base font-semibold text-foreground">
                  {candidate.name}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email
                </p>
                <p className="text-base font-semibold text-foreground">
                  {candidate.email}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Position
                </p>
                <p className="text-base font-semibold text-foreground">
                  {candidate.selectionDetails?.role || candidate.position}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Documents
              </h2>
              {signedPdfUrl && hrPoliciesPdfUrl && (
                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800">
                  Signed
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Download both documents and read them before you sign.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={generatingPdf || !(signedPdfUrl || unsignedPdfUrl)}
                onClick={() => {
                  const url = signedPdfUrl || unsignedPdfUrl;
                  if (!url) return;
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = signedPdfUrl
                    ? `Offer-Letter-${candidateId}-Signed.pdf`
                    : `Offer-Letter-${candidateId}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="flex-1 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {generatingPdf && !signedPdfUrl && !unsignedPdfUrl ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download {signedPdfUrl ? "signed " : ""}offer letter
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!hrPoliciesPdfUrl}
                onClick={() => {
                  if (!hrPoliciesPdfUrl) return;
                  const a = document.createElement("a");
                  a.href = hrPoliciesPdfUrl;
                  a.download = documentsSigned
                    ? `HR-Policies-${candidateId}-Signed.pdf`
                    : `HR-Policies-${candidateId}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="flex-1 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {generatingPdf && !hrPoliciesPdfUrl ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download {documentsSigned ? "signed " : ""}HR policies
              </Button>
            </div>
          </Card>

          {!documentsSigned && !success && (
            <p className="text-sm font-medium leading-6 text-red-600 dark:text-red-400">
              Please read the Offer Letter and the HR Policies in full before you sign. By providing your signature, you confirm that you have read both documents and that this signature applies to the Offer Letter and the HR Policies.
            </p>
          )}

          {/* Digital Signature */}
          <Card className="p-6 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 dark:bg-purple-400 text-white dark:text-gray-900 flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                E Signature
              </h2>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              {useDigitalSignature
                ? "Draw your signature below."
                : "Upload an image of your signature."}
            </p>

            {/* Signature Mode Switch */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <button
                type="button"
                onClick={() => {
                  setUseDigitalSignature(true);
                  setShowSignaturePad(false);
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  useDigitalSignature
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                    : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Digital Signature
              </button>

              <button
                type="button"
                onClick={() => setUseDigitalSignature(false)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  !useDigitalSignature
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                    : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Upload Signature
              </button>
            </div>

            <div className="space-y-3">
              {useDigitalSignature ? (
                !showSignaturePad ? (
                  signature ? (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                      <img
                        src={signature.url || "/placeholder.svg"}
                        alt="Digital signature preview"
                        className="w-full max-h-40 object-contain"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSignature(null);
                          setShowSignaturePad(true);
                        }}
                        className="w-full mt-3 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        Redraw Signature
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      Start Drawing Signature
                    </Button>
                  )
                ) : (
                  <>
                    <SignaturePad onSignatureCapture={handleSignatureCapture} />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelSignaturePad}
                      className="w-full bg-transparent dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </>
                )
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Upload Signature
                  </label>

                  <label className="relative flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                    <div className="flex items-center gap-2 text-foreground">
                      {signature ? (
                        <>
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            {signature.name}
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">
                            {uploadingSignature ? "Uploading..." : "Click to upload signature"}
                          </span>
                        </>
                      )}
                      {uploadingSignature && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                      )}
                    </div>

                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleSignatureUpload}
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      disabled={uploadingSignature}
                      required={!signature}
                    />
                  </label>
                  {signature && (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                      <img
                        src={signature.url || "/placeholder.svg"}
                        alt="Uploaded signature preview"
                        className="w-full max-h-40 object-contain"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSignature(null)}
                        className="w-full mt-3 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        Remove Signature
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {documentsSigned ? (
            <p className="text-sm text-green-700 dark:text-green-400">
              The offer letter and HR policies are already signed.
            </p>
          ) : !documentsReviewed ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              The offer letter and the HR policies are being prepared for download.
            </p>
          ) : null}

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={
                submitting ||
                !signature ||
                uploadingSignature ||
                success ||
                documentsSigned ||
                !documentsReviewed
              }
              className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
              size="lg"
            >
              {success ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Letter Submitted Successfully
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Sign and Submit Letter
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Signature Preview Modal */}
        <SignaturePreviewModal
          open={showSignaturePreview}
          signature={previewSignature || ""}
          onConfirm={confirmSignature}
          onCancel={() => {
            setShowSignaturePreview(false);
            setPreviewSignature(null);
          }}
        />

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-foreground">Confirm Submission</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Sign the offer letter and the HR policies with this signature?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={submitting}
                className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Yes, Submit"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
