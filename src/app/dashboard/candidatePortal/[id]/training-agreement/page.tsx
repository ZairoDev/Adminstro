"use client";

import type React from "react";
import { useState, useEffect,useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, AlertCircle, Loader2, FileText, Eye, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  selectionDetails?: {
    positionType: string;
    duration: string;
    trainingPeriod: string;
    role: string;
    salary?: string | number;
  };
  trainingAgreementDetails?: {
    signingLink: string;
    eSign: {
      signatureImage: string;
      signedAt: string;
    };
    signedPdfUrl: string;
    signedHrPoliciesPdfUrl?: string;
    signedLetterOfIntentPdfUrl?: string;
    letterOfIntentSigningDate?: string;
    agreementAccepted: boolean;
    agreementComplete: boolean;
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

export default function TrainingAgreementPage() {
  const params = useParams();
  const router = useRouter();
  const { uploadFiles } = useBunnyUpload();
  const { toast } = useToast();
  const candidateId = params.id as string;

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
  const [hrPoliciesPdfUrl, setHrPoliciesPdfUrl] = useState<string | null>(null);
  const [generatingHrPoliciesPdf, setGeneratingHrPoliciesPdf] = useState(false);
  const [showHrPoliciesPdfPreview, setShowHrPoliciesPdfPreview] = useState(false);
  const [letterOfIntentPdfUrl, setLetterOfIntentPdfUrl] = useState<string | null>(null);
  const [generatingLetterOfIntentPdf, setGeneratingLetterOfIntentPdf] = useState(false);
  const [showLetterOfIntentPdfPreview, setShowLetterOfIntentPdfPreview] = useState(false);
  const previousThemeRef = useRef<string | undefined>(undefined);
  const pdfGeneratedRef = useRef(false);
  const pdfAutoOpenedRef = useRef(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const response = await fetch(`/api/candidates/${candidateId}`);
        const result = await response.json();

        if (result.success) {
          setCandidate(result.data);
           // Load signed PDF if available
           if (result.data.trainingAgreementDetails?.signedPdfUrl) {
            setSignedPdfUrl(result.data.trainingAgreementDetails.signedPdfUrl);
            setUnsignedPdfUrl(null);
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
    if (!candidate) return;
    
    // DEFENSIVE CHECK: If document is already signed, don't generate unsigned PDF
    if (candidate.trainingAgreementDetails?.signedPdfUrl || signedPdfUrl) {
      toast({
        title: "Document Already Signed",
        description: "This document has already been signed. Please use the signed PDF.",
        variant: "destructive",
      });
      // Load signed PDF if available
      if (candidate.trainingAgreementDetails?.signedPdfUrl) {
        setSignedPdfUrl(candidate.trainingAgreementDetails.signedPdfUrl);
        setShowPdfPreview(true);
      }
      return;
    }
    
    setGeneratingPdf(true);
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
      setUnsignedPdfUrl(url);
    } catch (error: any) {
      console.error("Error generating unsigned PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF preview",
        variant: "destructive",
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const generateHrPoliciesPdf = async () => {
    if (!candidate) return;
    
    setGeneratingHrPoliciesPdf(true);
    try {
      // DEFENSIVE CHECK: Use signed PDF if available, otherwise generate unsigned preview
      if (candidate.trainingAgreementDetails?.signedHrPoliciesPdfUrl) {
        setHrPoliciesPdfUrl(candidate.trainingAgreementDetails.signedHrPoliciesPdfUrl);
        setGeneratingHrPoliciesPdf(false);
        return;
      }

      const agreementDate = new Date().toLocaleDateString("en-IN");
      const hrPoliciesPayload = {
        candidateName: candidate.name,
        position: candidate.position,
        date: agreementDate,
        // Include signature if Training Agreement is signed
        signatureBase64: candidate.trainingAgreementDetails?.eSign?.signatureImage || undefined,
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
      setHrPoliciesPdfUrl(url);
    } catch (error: any) {
      console.error("Error generating HR Policies PDF:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to generate HR Policies PDF preview";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGeneratingHrPoliciesPdf(false);
    }
  };

  const generateLetterOfIntentPdf = async () => {
    if (!candidate) return;
    
    setGeneratingLetterOfIntentPdf(true);
    try {
      // DEFENSIVE CHECK: Use signed PDF if available, otherwise generate unsigned preview
      if (candidate.trainingAgreementDetails?.signedLetterOfIntentPdfUrl) {
        setLetterOfIntentPdfUrl(candidate.trainingAgreementDetails.signedLetterOfIntentPdfUrl);
        setGeneratingLetterOfIntentPdf(false);
        return;
      }

      // Use signing date if available, otherwise use current date
      const letterDate = candidate.trainingAgreementDetails?.letterOfIntentSigningDate
        ? new Date(candidate.trainingAgreementDetails.letterOfIntentSigningDate).toISOString()
        : new Date().toISOString();
      
      // Format salary - convert monthly salary to LPA format
      let formattedSalary = "";
      if (candidate.selectionDetails?.salary) {
        const salary = candidate.selectionDetails.salary;
        if (typeof salary === "number") {
          // Assume salary is monthly, convert to annual then LPA
          const annualSalary = salary * 12;
          const lpa = annualSalary / 100000;
          formattedSalary = `₹${lpa.toFixed(2)} LPA`;
        } else if (typeof salary === "string") {
          // Try to parse if it's a string number
          const numSalary = parseFloat(salary);
          if (!isNaN(numSalary)) {
            const annualSalary = numSalary * 12;
            const lpa = annualSalary / 100000;
            formattedSalary = `Rs. ${lpa.toFixed(2)} LPA`;
          } else {
            formattedSalary = String(salary).replace(/₹/g, "Rs. ");
          }
        } else {
          formattedSalary = String(salary).replace(/₹/g, "Rs. ");
        }
      }

      // DEFENSIVE CHECK: Ensure salary is not empty or "TBD"
      if (!formattedSalary || formattedSalary === "TBD") {
        console.warn("⚠️ Salary not found or invalid. LOI will be generated without salary.");
      }

      // Format start date - add 3 days from today
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 3);
      const startDay = startDate.getDate();
      const startDaySuffix = startDay === 1 || startDay === 21 || startDay === 31 ? "st" 
        : startDay === 2 || startDay === 22 ? "nd" 
        : startDay === 3 || startDay === 23 ? "rd" 
        : "th";
      const startMonthName = startDate.toLocaleString("en-US", { month: "long" });
      const startYear = startDate.getFullYear();
      const formattedStartDate = `${startDay}${startDaySuffix} ${startMonthName} ${startYear} (Training Session 3 Days)`;

      // Determine designation and department from position
      const designation = candidate.selectionDetails?.role || `${candidate.position} Executive`;
      const department = candidate.position || "Human Resources";

      const letterOfIntentPayload = {
        candidateName: candidate.name,
        position: candidate.position,
        date: letterDate,
        salary: formattedSalary || undefined,
        designation: designation,
        department: department,
        startDate: formattedStartDate,
        // Include signature if Training Agreement is signed
        candidateSignatureBase64: candidate.trainingAgreementDetails?.eSign?.signatureImage || undefined,
        // Include signing date for LOI
        signingDate: candidate.trainingAgreementDetails?.eSign?.signedAt 
          ? new Date(candidate.trainingAgreementDetails.eSign.signedAt).toISOString()
          : undefined,
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
      setLetterOfIntentPdfUrl(url);
    } catch (error: any) {
      console.error("Error generating Letter of Intent PDF:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to generate Letter of Intent PDF preview";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGeneratingLetterOfIntentPdf(false);
    }
  };

  // Auto-generate unsigned PDF when component loads (if not already signed)
  useEffect(() => {
    if (!loading && candidate && !pdfGeneratedRef.current) {
      // If signed PDF exists, open it automatically
      if (candidate.trainingAgreementDetails?.signedPdfUrl) {
        setSignedPdfUrl(candidate.trainingAgreementDetails.signedPdfUrl);
        setShowPdfPreview(true);
        pdfGeneratedRef.current = true;
      } 
      // Otherwise, generate unsigned PDF
      else if (!unsignedPdfUrl && !generatingPdf && !signedPdfUrl && candidate.name && candidate.position) {
        pdfGeneratedRef.current = true;
        // Auto-generate PDF after a short delay to ensure all data is loaded
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
      // Small delay to ensure PDF is fully loaded
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
    // Show confirmation dialog before submitting
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
      const agreementDate = new Date().toLocaleDateString("en-IN");
      const agreementPayload = {
        candidateName: candidate.name,
        position: candidate.position,
        date: agreementDate,
        signatureBase64: signature.url,
      };

      // Request signed PDF from API
      const pdfResponse = await axios.post(
        "/api/candidates/trainingAgreement",
        agreementPayload,
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
     const signedUrl = URL.createObjectURL(pdfBlob);
     setSignedPdfUrl(signedUrl);
     setUnsignedPdfUrl(null); // Clear unsigned PDF when signed PDF exists
     setShowPdfPreview(true);

     // Download signed PDF for user
      const a = document.createElement("a");
      a.href = signedUrl;
      a.download = `Pre-Employment-Training-Agreement-${candidateId}-Signed.pdf`;
   
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // URL.revokeObjectURL(url);

      // Upload signed PDF to BunnyCDN
      const pdfFile = new File(
        [pdfBlob],
        `Pre-Employment-Training-Agreement-${candidateId}.pdf`,
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

      // Save training agreement to backend
      const formData = new FormData();
      formData.append("signature", signature.url);
      formData.append("signedPdfUrl", signedPdfUrl);
      formData.append("agreementAccepted", "true");

      const trainingAgreementRes = await axios.post(
        `/api/candidates/${candidateId}/training-agreement`,
        formData
      );

      if (!trainingAgreementRes.data.success) {
        throw new Error(
          trainingAgreementRes.data.error || "Failed to save training agreement"
        );
      }

      setSuccess(true);
      const updatedCandidate = trainingAgreementRes.data.data;
      setCandidate(updatedCandidate);

      // DEFENSIVE CHECK: Only regenerate PDFs if signature was successfully saved
      if (updatedCandidate.trainingAgreementDetails?.eSign?.signatureImage) {
        console.log("✅ Signature saved successfully. Regenerating HR Policies and LOI PDFs with signature...");
        
        // Regenerate HR Policies PDF with signature
        try {
          const hrPoliciesPayload = {
            candidateName: updatedCandidate.name,
            position: updatedCandidate.position,
            date: new Date().toLocaleDateString("en-IN"),
            signatureBase64: updatedCandidate.trainingAgreementDetails.eSign.signatureImage,
          };

          const hrPdfResponse = await axios.post(
            "/api/candidates/hrPolicies",
            hrPoliciesPayload,
            {
              responseType: "arraybuffer",
              headers: { "Content-Type": "application/json" },
            }
          );

          const hrPdfBlob = new Blob([hrPdfResponse.data], { type: "application/pdf" });
          const hrPdfFile = new File(
            [hrPdfBlob],
            `HR-Policies-${candidateId}-Signed.pdf`,
            { type: "application/pdf" }
          );

          // Upload signed HR Policies PDF
          const { imageUrls: hrUrls } = await uploadFiles([hrPdfFile], "Documents/SignedPDFs");
          if (hrUrls?.length) {
            // Store signed HR Policies PDF URL in database
            await axios.patch(`/api/candidates/${candidateId}`, {
              "trainingAgreementDetails.signedHrPoliciesPdfUrl": hrUrls[0],
            });
            console.log("✅ Signed HR Policies PDF generated and stored");
          }
        } catch (hrErr) {
          console.error("❌ Error generating signed HR Policies PDF:", hrErr);
          // Don't fail the entire process if HR Policies PDF generation fails
        }

        // Regenerate Letter of Intent PDF with signature
        try {
          const signingDate = updatedCandidate.trainingAgreementDetails.eSign.signedAt 
            ? new Date(updatedCandidate.trainingAgreementDetails.eSign.signedAt).toISOString()
            : new Date().toISOString();

          // Format salary - convert to LPA format
          let formattedSalary = "";
          if (updatedCandidate.selectionDetails?.salary) {
            const salary = updatedCandidate.selectionDetails.salary;
            if (typeof salary === "number") {
              // Assume salary is monthly, convert to annual then LPA
              const annualSalary = salary * 12;
              const lpa = annualSalary / 100000;
              formattedSalary = `Rs. ${lpa.toFixed(2)} LPA`;
            } else if (typeof salary === "string") {
              // Try to parse if it's a string number
              const numSalary = parseFloat(salary);
              if (!isNaN(numSalary)) {
                const annualSalary = numSalary * 12;
                const lpa = annualSalary / 100000;
                formattedSalary = `Rs. ${lpa.toFixed(2)} LPA`;
              } else {
                formattedSalary = String(salary).replace(/₹/g, "Rs. ");
              }
            } else {
              formattedSalary = String(salary).replace(/₹/g, "Rs. ");
            }
          }

          // Format start date
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + 3);
          const startDay = startDate.getDate();
          const startDaySuffix = startDay === 1 || startDay === 21 || startDay === 31 ? "st" 
            : startDay === 2 || startDay === 22 ? "nd" 
            : startDay === 3 || startDay === 23 ? "rd" 
            : "th";
          const startMonthName = startDate.toLocaleString("en-US", { month: "long" });
          const startYear = startDate.getFullYear();
          const formattedStartDate = `${startDay}${startDaySuffix} ${startMonthName} ${startYear} (Training Session 3 Days)`;

          const designation = updatedCandidate.selectionDetails?.role || `${updatedCandidate.position} Executive`;
          const department = updatedCandidate.position || "Human Resources";

          const loiPayload = {
            candidateName: updatedCandidate.name,
            position: updatedCandidate.position,
            date: signingDate,
            salary: formattedSalary || undefined,
            designation: designation,
            department: department,
            startDate: formattedStartDate,
            candidateSignatureBase64: updatedCandidate.trainingAgreementDetails.eSign.signatureImage,
            signingDate: signingDate, // Add signing date for LOI
          };

          const loiPdfResponse = await axios.post(
            "/api/candidates/letterOfIntent",
            loiPayload,
            {
              responseType: "arraybuffer",
              headers: { "Content-Type": "application/json" },
            }
          );

          const loiPdfBlob = new Blob([loiPdfResponse.data], { type: "application/pdf" });
          const loiPdfFile = new File(
            [loiPdfBlob],
            `Letter-Of-Intent-${candidateId}-Signed.pdf`,
            { type: "application/pdf" }
          );

          // Upload signed LOI PDF
          const { imageUrls: loiUrls } = await uploadFiles([loiPdfFile], "Documents/SignedPDFs");
          if (loiUrls?.length) {
            // Store signed LOI PDF URL and signing date in database
            await axios.patch(`/api/candidates/${candidateId}`, {
              "trainingAgreementDetails.signedLetterOfIntentPdfUrl": loiUrls[0],
              "trainingAgreementDetails.letterOfIntentSigningDate": signingDate,
            });
            console.log("✅ Signed Letter of Intent PDF generated and stored");
          }
        } catch (loiErr) {
          console.error("❌ Error generating signed Letter of Intent PDF:", loiErr);
          // Don't fail the entire process if LOI PDF generation fails
        }
      }

      toast({
        title: "Success",
        description: "Training agreement signed and submitted successfully. All documents have been updated with your signature.",
      });

      // setTimeout(() => {
      //   router.push(`/dashboard/candidatePortal/${candidateId}`);
      // }, 2000);
      setSubmitting(false);
    } catch (err: any) {
      console.error("Error submitting training agreement:", err);
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

  if (!candidate || candidate.status !== "selected") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
        <Card className="p-8 text-center bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">
              Access Denied
            </p>
            <p className="text-muted-foreground">
              Only candidates selected for training can access this page
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // if (candidate.trainingAgreementDetails?.agreementComplete) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-8">
  //       <div className="max-w-4xl mx-auto">
  //         <Card className="p-8 text-center">
  //           <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
  //           <p className="text-lg font-semibold text-foreground mb-2">
  //             Training Agreement Already Signed
  //           </p>
  //           <p className="text-muted-foreground mb-4">
  //             You have already signed the training agreement.
  //           </p>
  //           <Button onClick={() => router.push(`/dashboard/candidatePortal/${candidateId}`)}>
  //             Go Back
  //           </Button>
  //         </Card>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent mb-3">
            Pre-Employment Training Agreement
          </h1>
          <p className="text-lg text-muted-foreground">
            Please review and sign the training agreement
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded-lg flex items-center gap-3 shadow-sm">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                Training agreement signed successfully!
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                Redirecting to dashboard...
              </p>
            </div>
          </div>
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
                  {candidate.position}
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
                Training Agreement Document Preview
              </h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Preview and download the unsigned training agreement document before signing. The document contains blank signature placeholders where signatures can be made.
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

              {/* CRITICAL: Show download button for signed PDF if available, otherwise unsigned */}
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
                        ? `Pre-Employment-Training-Agreement-${candidateId}-Signed.pdf`
                        : `Pre-Employment-Training-Agreement-${candidateId}-Unsigned.pdf`;
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
              {/* CRITICAL: Always prioritize signed PDF over unsigned PDF */}
              {(signedPdfUrl || unsignedPdfUrl) && !generatingPdf && (
                <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <iframe
                    src={signedPdfUrl || unsignedPdfUrl || ""}
                    className="w-full h-[500px] border-0"
                    title={signedPdfUrl ? "Signed PDF Preview" : "PDF Preview"}
                  />
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

          {/* HR Policies PDF Preview Section */}
          <Card className="p-6 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                HR Policies Document Preview
              </h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Preview and download the HR Policies document. This document contains important company policies and guidelines.
              </p>
              
              {generatingHrPoliciesPdf && (
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Generating HR Policies PDF...</p>
                  </div>
                </div>
              )}

              {!generatingHrPoliciesPdf && !hrPoliciesPdfUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateHrPoliciesPdf}
                  className="w-full dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate HR Policies PDF
                </Button>
              )}

              {hrPoliciesPdfUrl && !generatingHrPoliciesPdf && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!hrPoliciesPdfUrl) return;
                      const a = document.createElement("a");
                      a.href = hrPoliciesPdfUrl;
                      a.download = `HR-Policies-${candidateId}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowHrPoliciesPdfPreview(true)}
                    className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Screen
                  </Button>
                </div>
              )}

              {hrPoliciesPdfUrl && !generatingHrPoliciesPdf && (
                <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <iframe
                    src={hrPoliciesPdfUrl}
                    className="w-full h-[500px] border-0"
                    title="HR Policies PDF Preview"
                  />
                </div>
              )}
              
              {!generatingHrPoliciesPdf && !hrPoliciesPdfUrl && (
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="text-center">
                    <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">HR Policies PDF preview will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Letter of Intent PDF Preview Section */}
          <Card className="p-6 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-600 dark:bg-amber-500 text-white flex items-center justify-center text-sm font-semibold">
                4
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Letter of Intent Document Preview
              </h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Preview and download the Letter of Intent document. This document contains the offer details and terms of employment.
              </p>
              
              {generatingLetterOfIntentPdf && (
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Generating Letter of Intent PDF...</p>
                  </div>
                </div>
              )}

              {!generatingLetterOfIntentPdf && !letterOfIntentPdfUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateLetterOfIntentPdf}
                  className="w-full dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Letter of Intent PDF
                </Button>
              )}

              {letterOfIntentPdfUrl && !generatingLetterOfIntentPdf && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!letterOfIntentPdfUrl) return;
                      const a = document.createElement("a");
                      a.href = letterOfIntentPdfUrl;
                      a.download = `Letter-Of-Intent-${candidateId}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLetterOfIntentPdfPreview(true)}
                    className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Screen
                  </Button>
                </div>
              )}

              {letterOfIntentPdfUrl && !generatingLetterOfIntentPdf && (
                <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <iframe
                    src={letterOfIntentPdfUrl}
                    className="w-full h-[500px] border-0"
                    title="Letter of Intent PDF Preview"
                  />
                </div>
              )}
              
              {!generatingLetterOfIntentPdf && !letterOfIntentPdfUrl && (
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="text-center">
                    <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Letter of Intent PDF preview will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Training Agreement Content Preview */}
          <Card className="p-6 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-foreground">
                Training Agreement Terms
              </h2>
            </div>
            <div className="prose prose-sm max-w-none text-foreground space-y-4">
              <p className="text-sm leading-relaxed">
                <strong>Training Duration & Structure:</strong> Your training will be conducted in two phases. Phase 1 (Initial Training Period) is 4 to 5 working days, unpaid, to provide you with required knowledge. Phase 2 (Paid Training & Assessment Period) is 7 working days, paid training (Stipend/Salary as applicable), during which your performance, conduct, learning ability, and stability will be closely evaluated.
              </p>
              <p className="text-sm leading-relaxed">
                <strong>Conditions of Continuation:</strong> Successful completion of both phases is mandatory for further employment. The company reserves full rights to discontinue your training or not offer permanent employment if performance standards are not met. Salary and appointment confirmation details will be shared only after successful evaluation.
              </p>
              <p className="text-sm leading-relaxed">
                <strong>General Terms:</strong> You are required to maintain professional behavior, punctuality, and adhere to all company policies. Any unauthorized absence may result in immediate termination of training. Confidentiality of company information must be strictly maintained.
              </p>
              <p className="text-sm leading-relaxed">
                <strong>No Guarantee of Employment:</strong> Completion of the training period does not guarantee employment. The decision to offer employment shall be solely based on the Company&apos;s assessment of your performance, skills, conduct, and overall suitability, as well as organizational requirements.
              </p>
            </div>
          </Card>

          {/* Digital Signature */}
          <Card className="p-6 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 dark:bg-purple-400 text-white dark:text-gray-900 flex items-center justify-center text-sm font-semibold">
                5
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                E Signature
              </h2>
            </div>
            
            {/* Warning Message */}
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400 font-medium leading-relaxed">
                  <strong>Important:</strong> Your signature will be applicable to all the documents (Training Agreement, HR Policies, and Letter of Intent), so please read all the documents carefully before signing.
                </p>
              </div>
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
                /* Upload Signature */
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
                  Agreement Submitted Successfully
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Sign and Submit Agreement
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
              // Reset auto-opened flag when manually closed so it can be reopened if needed
              pdfAutoOpenedRef.current = false;
            }
          }}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {signedPdfUrl ? "Signed Training Agreement Document" : "Training Agreement Document Preview"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {signedPdfUrl 
                  ? "Your signed training agreement document. This will be saved after submission."
                  : "Preview of the unsigned training agreement document. Please review before signing."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
              {/* CRITICAL: Always prioritize signed PDF - once signed, never show unsigned */}
              {(signedPdfUrl || unsignedPdfUrl) && (
                <iframe
                  src={signedPdfUrl || unsignedPdfUrl || ""}
                  className="w-full h-[70vh] border-0"
                  title={signedPdfUrl ? "Signed Training Agreement Document" : "Training Agreement Document Preview"}
                />
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
                      ? `Pre-Employment-Training-Agreement-${candidateId}-Signed.pdf`
                      : `Pre-Employment-Training-Agreement-${candidateId}-Unsigned.pdf`;
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

        {/* HR Policies PDF Preview Dialog */}
        <Dialog 
          open={showHrPoliciesPdfPreview} 
          onOpenChange={setShowHrPoliciesPdfPreview}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                HR Policies Document Preview
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Preview of the HR Policies document. Please review the company policies and guidelines.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
              {hrPoliciesPdfUrl && (
                <iframe
                  src={hrPoliciesPdfUrl}
                  className="w-full h-[70vh] border-0"
                  title="HR Policies Document Preview"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              {hrPoliciesPdfUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!hrPoliciesPdfUrl) return;
                    const a = document.createElement("a");
                    a.href = hrPoliciesPdfUrl;
                    a.download = `HR-Policies-${candidateId}.pdf`;
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
                onClick={() => setShowHrPoliciesPdfPreview(false)}
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Letter of Intent PDF Preview Dialog */}
        <Dialog 
          open={showLetterOfIntentPdfPreview} 
          onOpenChange={setShowLetterOfIntentPdfPreview}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Letter of Intent Document Preview
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Preview of the Letter of Intent document. This document contains the offer details and terms of employment.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
              {letterOfIntentPdfUrl && (
                <iframe
                  src={letterOfIntentPdfUrl}
                  className="w-full h-[70vh] border-0"
                  title="Letter of Intent Document Preview"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              {letterOfIntentPdfUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!letterOfIntentPdfUrl) return;
                    const a = document.createElement("a");
                    a.href = letterOfIntentPdfUrl;
                    a.download = `Letter-Of-Intent-${candidateId}.pdf`;
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
                onClick={() => setShowLetterOfIntentPdfPreview(false)}
                className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
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



