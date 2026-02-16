"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, AlertCircle, Loader2, FileText, Eye, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SignaturePad } from "../../components/signature-pad";
import { SignaturePreviewModal } from "../../components/signature-preview-modal";
import axios from "axios";

interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  status: string;
  city?: string;
  selectionDetails?: {
    positionType: string;
    duration: string;
    trainingPeriod: string;
    role: string;
    salary?: string | number;
    trainingDate?: string;
    offerLetterSent?: boolean;
    offerLetterSentAt?: string;
    offerLetterSigningLink?: string;
    signedOfferLetterPdfUrl?: string;
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
  const router = useRouter();
  const { uploadFiles } = useBunnyUpload();
  const { toast } = useToast();
  const candidateId = params?.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const pdfGeneratedRef = useRef(false);
  const pdfAutoOpenedRef = useRef(false);

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
            console.log("✅ Loaded signed Offer Letter PDF from database on page load");
          } else if (result.data.selectionDetails?.unsignedOfferLetterPdfUrl) {
            // Load unsigned PDF if signed PDF doesn't exist
            setUnsignedPdfUrl(result.data.selectionDetails.unsignedOfferLetterPdfUrl);
            setSignedPdfUrl(null);
            console.log("✅ Loaded unsigned Offer Letter PDF from database on page load");
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
        setShowPdfPreview(true);
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
        postingLocation: candidate.city || "117/N/70 3rd Floor Kakadeo, Kanpur 208025",
        annualCTC: annualCTC,
        workingHoursStart: "11:30 AM",
        workingHoursEnd: "8:30 PM",
        salaryPaymentCycle: "15th to 18th",
        probationPeriod: "six (6) months",
        candidateId: candidate._id,
        // No candidateSignatureBase64 for unsigned PDF - this is the key difference
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
        console.error("❌ Error uploading/saving unsigned PDF:", uploadError);
        // Don't fail the entire process if unsigned PDF upload fails
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

  // Auto-load signed PDF or generate unsigned PDF when component loads
  useEffect(() => {
    if (!loading && candidate && !pdfGeneratedRef.current) {
      // CRITICAL: Always prioritize signed PDF if available
      if (candidate.selectionDetails?.signedOfferLetterPdfUrl) {
        setSignedPdfUrl(candidate.selectionDetails.signedOfferLetterPdfUrl);
        setUnsignedPdfUrl(null); // Clear unsigned PDF when signed exists
        setShowPdfPreview(true); // Open preview to show signed PDF
        pdfGeneratedRef.current = true;
        console.log("✅ Auto-loaded signed Offer Letter PDF on page load:", candidate.selectionDetails.signedOfferLetterPdfUrl);
      } else if (!unsignedPdfUrl && !generatingPdf && !signedPdfUrl && candidate.name && candidate.position) {
        // Only generate unsigned PDF if no signed PDF exists
        pdfGeneratedRef.current = true;
        const timer = setTimeout(() => {
          generateUnsignedPdf();
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, candidate]);

  // Auto-open PDF preview dialog when PDF is generated (only once)
  useEffect(() => {
    if ((unsignedPdfUrl || signedPdfUrl) && !showPdfPreview && !loading && !pdfAutoOpenedRef.current) {
      const timer = setTimeout(() => {
        setShowPdfPreview(true);
        pdfAutoOpenedRef.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [unsignedPdfUrl, signedPdfUrl, loading]);

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

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
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
        postingLocation: candidate.city || "117/N/70 3rd Floor Kakadeo, Kanpur 208025",
        annualCTC: annualCTC,
        workingHoursStart: "11:30 AM",
        workingHoursEnd: "8:30 PM",
        salaryPaymentCycle: "15th to 18th",
        probationPeriod: "six (6) months",
        candidateId: candidate._id,
        candidateSignatureBase64: signature.url, // CRITICAL: Use candidateSignatureBase64 (not signatureBase64)
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
      setUnsignedPdfUrl(null); // Clear unsigned PDF when signed PDF exists
      setShowPdfPreview(true); // Open preview dialog to show signed PDF

      // Download signed PDF for user
      const a = document.createElement("a");
      a.href = signedUrl;
      a.download = `Offer-Letter-${candidateId}-Signed.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

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

      // Save offer letter to backend
      // Include unsigned PDF URL if available (it should already be saved, but include it for completeness)
      const formData = new FormData();
      formData.append("signature", signature.url);
      formData.append("signedPdfUrl", signedPdfUrl);
      if (unsignedPdfUrl) {
        // Extract URL from blob URL if needed, or use CDN URL if already saved
        // For now, we'll let the backend handle it - unsigned PDF should already be saved during preview generation
      }
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

      setSuccess(true);
      const updatedCandidate = offerLetterRes.data.data;
      setCandidate(updatedCandidate);

      // Update signed PDF URL with CDN URL from database response
      if (updatedCandidate.selectionDetails?.signedOfferLetterPdfUrl) {
        // Use CDN URL from database (more reliable than blob URL)
        setSignedPdfUrl(updatedCandidate.selectionDetails.signedOfferLetterPdfUrl);
        setUnsignedPdfUrl(null);
        // Ensure preview dialog stays open to show signed PDF
        setShowPdfPreview(true);
        console.log("✅ Updated signed PDF URL from database:", updatedCandidate.selectionDetails.signedOfferLetterPdfUrl);
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
              setUnsignedPdfUrl(null); // Clear unsigned PDF
              // Keep preview dialog open to show signed PDF
              setShowPdfPreview(true);
              console.log("✅ Loaded signed Offer Letter PDF from database after refresh:", refreshedCandidate.selectionDetails.signedOfferLetterPdfUrl);
            }
          }
        } catch (refreshErr) {
          console.error("❌ Error refreshing candidate data:", refreshErr);
          // Don't fail the entire process if refresh fails - PDFs are already stored in DB
        }
      }, 1000);

      toast({
        title: "Success",
        description: "Offer letter signed and submitted successfully. Please download the signed document below.",
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

  if (!candidate || candidate.status !== "onboarding") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">
              Access Denied
            </p>
            <p className="text-muted-foreground">
              Only candidates with onboarding status can access this page
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent mb-3">
            Appointment Letter
          </h1>
          <p className="text-lg text-muted-foreground">
            Please review and sign your appointment letter
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
                  Appointment Letter Signed Successfully! ✅
                </h3>
                <p className="text-base text-green-700 dark:text-green-400 mb-4">
                  Your signature has been applied to the appointment letter.
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

          {/* PDF Preview Section */}
          <Card className="p-6 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Appointment Letter Document Preview
              </h2>
              {signedPdfUrl && (
                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800">
                  Signed
                </Badge>
              )}
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {signedPdfUrl 
                  ? "Your signed appointment letter document. This is the final signed version with your signature embedded."
                  : "Preview and download the unsigned appointment letter document before signing. The document contains blank signature placeholders where signatures can be made."}
              </p>
              
              {generatingPdf && (
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Generating PDF preview...</p>
                  </div>
                </div>
              )}

              {!generatingPdf && !unsignedPdfUrl && !signedPdfUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateUnsignedPdf}
                  className="w-full dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate PDF Preview
                </Button>
              )}

              {(signedPdfUrl || unsignedPdfUrl) && !generatingPdf && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const url = signedPdfUrl || unsignedPdfUrl;
                      if (!url) return;
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = signedPdfUrl
                        ? `Offer-Letter-${candidateId}-Signed.pdf`
                        : `Offer-Letter-${candidateId}-Unsigned.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download {signedPdfUrl ? "Signed PDF" : "PDF"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPdfPreview(true)}
                    className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Screen
                  </Button>
                </div>
              )}
              
              {(signedPdfUrl || unsignedPdfUrl) && !generatingPdf && (
                <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                  {/* CRITICAL: Always prioritize signed PDF - once signed, never show unsigned */}
                  <iframe
                    src={signedPdfUrl || unsignedPdfUrl || ""}
                    className="w-full h-[500px] border-0"
                    title={signedPdfUrl ? "Signed PDF Preview" : "PDF Preview"}
                  />
                  {signedPdfUrl && (
                    <div className="p-2 bg-green-50 dark:bg-green-950/40 border-t border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        This is the final signed document with your signature embedded.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {!generatingPdf && !unsignedPdfUrl && !signedPdfUrl && (
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="text-center">
                    <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">PDF preview will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

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

                  <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
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
                      className="hidden"
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

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={submitting || !signature || uploadingSignature || success}
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
                Are you sure that you have read all the terms and conditions properly and correctly filled everything and want to submit?
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

        {/* PDF Preview Dialog */}
        <Dialog 
          open={showPdfPreview} 
          onOpenChange={(open) => {
            setShowPdfPreview(open);
            if (!open) {
              pdfAutoOpenedRef.current = false;
            }
          }}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {signedPdfUrl ? "Signed Appointment Letter Document" : "Appointment Letter Document Preview"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {signedPdfUrl 
                  ? "Your signed appointment letter document. This will be saved after submission."
                  : "Preview of the unsigned appointment letter document. Please review before signing."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
              {/* CRITICAL: Always prioritize signed PDF - once signed, never show unsigned */}
              {(signedPdfUrl || unsignedPdfUrl) && (
                <iframe
                  src={signedPdfUrl || unsignedPdfUrl || ""}
                  className="w-full h-[70vh] border-0"
                  title={signedPdfUrl ? "Signed Appointment Letter Document" : "Appointment Letter Document Preview"}
                />
              )}
              {signedPdfUrl && (
                <div className="p-2 bg-green-50 dark:bg-green-950/40 border-t border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    This is the final signed document with your signature embedded.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              {(unsignedPdfUrl || signedPdfUrl) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const url = signedPdfUrl || unsignedPdfUrl;
                    if (!url) return;
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = signedPdfUrl 
                      ? `Offer-Letter-${candidateId}-Signed.pdf`
                      : `Offer-Letter-${candidateId}-Unsigned.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  setShowPdfPreview(false);
                  pdfAutoOpenedRef.current = false;
                }}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
