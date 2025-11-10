"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, AlertCircle, Upload, Loader2, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { useToast } from "@/hooks/use-toast";
import { TermsConditionsModal } from "../../components/terms-conditions-modal";
import { SignaturePreviewModal } from "../../components/signature-preview-modal";
import { SignaturePad } from "../../components/signature-pad";
import { PDFDocument } from "pdf-lib";
import axios from "axios";




interface Candidate {
  _id: string;
  name: string;
  email: string;
  fatherName: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  position: string;
  status: string;
  selectionDetails?: {
    positionType: string;
    duration: string;
    trainingPeriod: string;
    role: string;
  };
  onboardingDetails?: {
    personalDetails: {
      dateOfBirth: string;
      gender: string;
      nationality: string;
    };
    bankDetails: {
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
      bankName: string;
    };
    documents: {
      aadharCard: string;
      panCard: string;
      highSchoolMarksheet: string;
      interMarksheet: string;
      graduationMarksheet: string;
      experienceLetter: string;
      relievingLetter: string;
      salarySlips: string[];
    };
    eSign: {
      signatureImage: string;
      signedAt: string;
    };
    termsAccepted: boolean;
    onboardingComplete: boolean;
  };
}

interface UploadedFile {
  url: string;
  name: string;
}

interface DocumentsState {
  aadharCard: UploadedFile | null;
  panCard: UploadedFile | null;
  highSchoolMarksheet: UploadedFile | null;
  interMarksheet: UploadedFile | null;
  graduationMarksheet: UploadedFile | null;
  experienceLetter: UploadedFile | null;
  relievingLetter: UploadedFile | null;
  salarySlips: UploadedFile[];
}

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
    <div className="w-full max-w-4xl space-y-6">
      <div className="text-center space-y-4">
        <div className="h-10 bg-gray-200 rounded-lg w-3/4 mx-auto animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-2/3 mx-auto animate-pulse" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="space-y-3 p-6 bg-white rounded-lg border border-gray-100 animate-pulse"
        >
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

async function urlToUint8Array(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
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

export default function OnboardingPage() {
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
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  // Form states
  const [personalDetails, setPersonalDetails] = useState({
    dateOfBirth: "",
    gender: "",
    nationality: "",
    fatherName:"",
  });

  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
  });

  const [documents, setDocuments] = useState<DocumentsState>({
    aadharCard: null,
    panCard: null,
    highSchoolMarksheet: null,
    interMarksheet: null,
    graduationMarksheet: null,
    experienceLetter: null,
    relievingLetter: null,
    salarySlips: [],
  });

  const [signature, setSignature] = useState<UploadedFile | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [useDigitalSignature, setUseDigitalSignature] = useState(true);
  const [showSignaturePad, setShowSignaturePad] = useState(true);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const response = await fetch(`/api/candidates/${candidateId}`);
        const result = await response.json();

        if (result.success) {
          setCandidate(result.data);
          if (result.data.onboardingDetails) {
            setPersonalDetails(
              result.data.onboardingDetails.personalDetails || personalDetails
            );
            setBankDetails(
              result.data.onboardingDetails.bankDetails || bankDetails
            );
            setTermsAccepted(
              result.data.onboardingDetails.termsAccepted || false
            );
          }
        }
      } catch (error) {
        console.error("Error fetching candidate:", error);
        setError("Failed to load candidate details");
      } finally {
        setLoading(false);
      }
    };

    if (candidateId) {
      fetchCandidate();
    }
  }, [candidateId]);

  const handleDocumentChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: keyof typeof documents
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const fileArray = Array.from(files);
    e.target.value = "";

    try {
      setUploadingFiles((prev) => new Set(prev).add(docType));

      console.log(`Uploading ${docType} files...`);

      const { imageUrls, error } = await uploadFiles(
        fileArray,
        `Documents/${docType}`
      );

      if (error || !imageUrls?.length) {
        console.error("Upload failed:", error);
        toast({
          title: "Upload failed",
          description: error || "Failed to upload files",
          variant: "destructive",
        });
        return;
      }

      if (docType === "salarySlips") {
        const uploadedSlips = imageUrls.map((url, index) => ({
          url,
          name: fileArray[index]?.name || `salary-slip-${index + 1}`,
        }));
        setDocuments((prev) => ({
          ...prev,
          salarySlips: [...prev.salarySlips, ...uploadedSlips],
        }));
      } else {
        setDocuments((prev) => ({
          ...prev,
          [docType]: {
            url: imageUrls[0],
            name: fileArray[0]?.name || `document-${docType}`,
          },
        }));
      }

      toast({
        title: "Upload successful",
        description: `${fileArray.length} file(s) uploaded successfully`,
      });
    } catch (err) {
      console.error(`Error uploading ${docType}:`, err);
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles((prev) => {
        const next = new Set(prev);
        next.delete(docType);
        return next;
      });
    }
  };

  const handleSignatureChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];
    e.target.value = "";

    try {
      setUploadingFiles((prev) => new Set(prev).add("signature"));

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
    } catch (err) {
      console.error("Error uploading signature:", err);
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles((prev) => {
        const next = new Set(prev);
        next.delete("signature");
        return next;
      });
    }
  };

  const removeSalarySlip = (index: number) => {
    setDocuments((prev) => ({
      ...prev,
      salarySlips: prev.salarySlips.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    if (
      !personalDetails.dateOfBirth ||
      !personalDetails.gender ||
      !personalDetails.nationality
    ) {
      setError("Please fill all personal details");
      return false;
    }
    if (
      !bankDetails.accountHolderName ||
      !bankDetails.accountNumber ||
      !bankDetails.ifscCode ||
      !bankDetails.bankName
    ) {
      setError("Please fill all bank details");
      return false;
    }
    if (!documents.aadharCard) {
      setError("Please upload Aadhar card");
      return false;
    }
    if (!documents.panCard) {
      setError("Please upload PAN card");
      return false;
    }
    if (!documents.highSchoolMarksheet) {
      setError("Please upload high school marksheet");
      return false;
    }
    if (!documents.interMarksheet) {
      setError("Please upload intermediate marksheet");
      return false;
    }
    if (!documents.graduationMarksheet) {
      setError("Please upload graduation marksheet");
      return false;
    }
    if (!signature) {
      setError("Please upload your signature");
      return false;
    }
    if (!termsAccepted) {
      setError("Please accept the terms and conditions");
      return false;
    }
    return true;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      console.log("Preparing to submit onboarding data...");

      // Validation
      if (!candidate) throw new Error("Candidate data missing");
      if (!signature?.url) throw new Error("Signature missing");

      // ✅ 1. Agreement Payload
      const agreementPayload = {
        agreementDate: new Date().toLocaleDateString("en-IN"),
        agreementCity: candidate.city ?? "Kanpur",

        employeeName: candidate.name,
        fatherName: personalDetails.fatherName || candidate.fatherName,
        employeeAddress: candidate.address,

        designation: candidate.position,
        effectiveFrom: new Date().toLocaleDateString("en-IN"),
        postingLocation: candidate.city,
        salaryINR:
          candidate.selectionDetails?.role ?? "As per employment terms",

        witness1: "____________________",
        witness2: "____________________",

        signatureBase64: signature.url, // ← Fixed spacing
      };

      console.log("Sending Agreement Payload:", agreementPayload);

      // ✅ 2. Request PDF from API
      let pdfResponse;
      try {
        pdfResponse = await axios.post(
          "/api/candidates/onboardingDocument",
          agreementPayload,
          {
            responseType: "arraybuffer",
            headers: { "Content-Type": "application/json" },
          }
        );
        console.log("PDF Generated successfully");
      } catch (pdfError: any) {
        console.error("PDF Generation Error:", pdfError);
        if (pdfError.response?.status === 405) {
          throw new Error(
            "API route not found. Please verify the route file exists at: app/api/candidates/onboardingDocument/route.ts"
          );
        }
        throw new Error(
          pdfError.response?.data?.error || "Failed to generate PDF"
        );
      }

      // ✅ 3. Convert result to Blob
      const pdfBlob = new Blob([pdfResponse.data], {
        type: "application/pdf",
      });

      // ✅ 4. Download PDF for user
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ZIPL-Service-Agreement-${candidateId}.pdf`;
      document.body.appendChild(a); // ← Added for better browser compatibility
      a.click();
      document.body.removeChild(a); // ← Clean up
      URL.revokeObjectURL(url);

      console.log("PDF downloaded successfully");

      // ✅ 5. Upload signed PDF to BunnyCDN
      const pdfFile = new File(
        [pdfBlob],
        `ZIPL-Service-Agreement-${candidateId}.pdf`,
        { type: "application/pdf" }
      );

      console.log("Uploading PDF to CDN...");
      const { imageUrls, error: uploadErr } = await uploadFiles(
        [pdfFile],
        "Documents/SignedPDFs"
      );

      if (uploadErr || !imageUrls?.length) {
        throw new Error("Failed to upload signed PDF to CDN");
      }

      const signedPdfUrl = imageUrls[0];
      console.log("PDF uploaded to CDN:", signedPdfUrl);

      // ✅ 6. Prepare onboarding submission
      const formData = new FormData();

      formData.append("personalDetails", JSON.stringify(personalDetails));
      formData.append("bankDetails", JSON.stringify(bankDetails));

      formData.append("aadharCard", documents.aadharCard?.url || "");
      formData.append("panCard", documents.panCard?.url || "");
      formData.append(
        "highSchoolMarksheet",
        documents.highSchoolMarksheet?.url || ""
      );
      formData.append("interMarksheet", documents.interMarksheet?.url || "");
      formData.append(
        "graduationMarksheet",
        documents.graduationMarksheet?.url || ""
      );
      formData.append(
        "experienceLetter",
        documents.experienceLetter?.url || ""
      );
      formData.append("relievingLetter", documents.relievingLetter?.url || "");
      formData.append(
        "salarySlips",
        JSON.stringify(documents.salarySlips.map((s) => s.url))
      );

      formData.append("signature", signature.url);
      formData.append("signedPdfUrl", signedPdfUrl);
      formData.append("termsAccepted", String(termsAccepted));

      console.log("Submitting onboarding to backend...");

      // ✅ 7. Save onboarding to backend
      const onboardingRes = await axios.post(
        `/api/candidates/${candidateId}/onboarding`,
        formData
      );

      if (!onboardingRes.data.success) {
        throw new Error(onboardingRes.data.error || "Failed onboarding");
      }

      console.log("Onboarding submitted successfully!");
      setSuccess(true);
      setCandidate(onboardingRes.data.data);

      setTimeout(() => {
        router.push(`/candidates/${candidateId}`);
      }, 1500);
    } catch (err: any) {
      console.error("Error submitting onboarding:", err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  
  
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
      setUploadingFiles((prev) => new Set(prev).add("signature"));

      // ✅ Convert base64 to file
      const signatureFile = base64ToFile(
        previewSignature,
        `signature-${Date.now()}.png`
      );

      // ✅ Upload to BunnyCDN
      const { imageUrls, error } = await uploadFiles(
        [signatureFile],
        "Documents/Signatures"
      );

      console.log("Signature upload result:", imageUrls);

      if (error || !imageUrls?.length) {
        toast({
          title: "Upload failed",
          description: error || "Failed to upload signature",
          variant: "destructive",
        });
        return;
      }

      // ✅ Save uploaded signature URL to state
      setSignature({
        url: imageUrls[0],
        name: signatureFile.name,
      });

      toast({
        title: "Signature saved",
        description: "Digital signature uploaded successfully",
      });

      // ✅ Close modals & reset
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
      setUploadingFiles((prev) => {
        const next = new Set(prev);
        next.delete("signature");
        return next;
      });
    }
  };
  
  const cancelSignaturePad = () => {
    setShowSignaturePad(false);
    setPreviewSignature(null);
    setShowSignaturePreview(false);
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!candidate || candidate.status !== "selected") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">
              Access Denied
            </p>
            <p className="text-muted-foreground">
              Only selected candidates can access onboarding
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-3">
            Complete Your Onboarding
          </h1>
          <p className="text-lg text-muted-foreground">
            Fill in all required details to get started with us
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-300 rounded-lg flex items-center gap-3 shadow-sm">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">
                Onboarding completed successfully!
              </p>
              <p className="text-sm text-green-700">
                Redirecting to dashboard...
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Your Information */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
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
                  Phone
                </p>
                <p className="text-base font-semibold text-foreground">
                  {candidate.phone}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Address
                </p>
                <p className="text-base font-semibold text-foreground">
                  {candidate.address}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  City
                </p>
                <p className="text-base font-semibold text-foreground">
                  {candidate.city}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Country
                </p>
                <p className="text-base font-semibold text-foreground">
                  {candidate.country}
                </p>
              </div>
            </div>
          </Card>

          {/* Selection Details Summary */}
          {candidate.selectionDetails && (
            <Card className="p-6 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  Selection Details
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Position Type
                  </p>
                  <p className="text-base font-semibold text-foreground capitalize">
                    {candidate.selectionDetails.positionType}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Duration
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {candidate.selectionDetails.duration}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Training Period
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {candidate.selectionDetails.trainingPeriod}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Role
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {candidate.selectionDetails.role}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Personal Details */}
          <Card className="p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Personal Details
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  value={personalDetails.dateOfBirth}
                  onChange={(e) =>
                    setPersonalDetails((prev) => ({
                      ...prev,
                      dateOfBirth: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Gender
                </label>
                <select
                  value={personalDetails.gender}
                  onChange={(e) =>
                    setPersonalDetails((prev) => ({
                      ...prev,
                      gender: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-muted rounded bg-background text-foreground focus:border-primary focus:outline-none"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nationality
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Indian"
                  value={personalDetails.nationality}
                  onChange={(e) =>
                    setPersonalDetails((prev) => ({
                      ...prev,
                      nationality: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Father&apos;s Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Indian"
                  value={personalDetails.fatherName}
                  onChange={(e) =>
                    setPersonalDetails((prev) => ({
                      ...prev,
                      fatherName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
          </Card>

          {/* Bank Details */}
          <Card className="p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-semibold">
                4
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Bank Details
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Account Holder Name
                </label>
                <Input
                  type="text"
                  placeholder="Full name as per bank records"
                  value={bankDetails.accountHolderName}
                  onChange={(e) =>
                    setBankDetails((prev) => ({
                      ...prev,
                      accountHolderName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Account Number
                </label>
                <Input
                  type="text"
                  placeholder="Your bank account number"
                  value={bankDetails.accountNumber}
                  onChange={(e) =>
                    setBankDetails((prev) => ({
                      ...prev,
                      accountNumber: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  IFSC Code
                </label>
                <Input
                  type="text"
                  placeholder="Bank IFSC code"
                  value={bankDetails.ifscCode}
                  onChange={(e) =>
                    setBankDetails((prev) => ({
                      ...prev,
                      ifscCode: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bank Name
                </label>
                <Input
                  type="text"
                  placeholder="Name of your bank"
                  value={bankDetails.bankName}
                  onChange={(e) =>
                    setBankDetails((prev) => ({
                      ...prev,
                      bankName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
          </Card>

          {/* Document Upload - Required */}
          <Card className="p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-semibold">
                5
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Required Documents
              </h2>
            </div>
            <div className="space-y-4">
              {[
                { key: "aadharCard", label: "Aadhar Card" },
                { key: "panCard", label: "PAN Card" },
                { key: "highSchoolMarksheet", label: "High School Marksheet" },
                { key: "interMarksheet", label: "Intermediate Marksheet" },
                { key: "graduationMarksheet", label: "Graduation Marksheet" },
              ].map(({ key, label }) => {
                const doc = documents[
                  key as keyof typeof documents
                ] as UploadedFile | null;
                const isUploading = uploadingFiles.has(key);

                return (
                  <div key={key} className="space-y-2">
                    <label className="block text-sm font-medium text-foreground  items-center gap-2">
                      {label}
                      <span className="text-red-500">*</span>
                      {isUploading && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      )}
                    </label>
                    <div className="relative">
                      <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors hover:border-blue-400">
                        <div className="flex items-center gap-2 text-foreground">
                          {doc ? (
                            <>
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700">
                                {doc.name}
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span className="text-sm">
                                Click to upload or drag and drop
                              </span>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) =>
                            handleDocumentChange(
                              e,
                              key as keyof typeof documents
                            )
                          }
                          className="hidden"
                          disabled={isUploading}
                          required
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Optional Employment Documents */}
          <Card className="p-6 shadow-sm border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                6
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Optional Documents
              </h2>
              <Badge variant="outline" className="ml-auto">
                Optional
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              These documents are optional. Upload if you have them available.
            </p>
            <div className="space-y-4">
              {[
                { key: "experienceLetter", label: "Experience Letter" },
                { key: "relievingLetter", label: "Relieving Letter" },
              ].map(({ key, label }) => {
                const doc = documents[
                  key as keyof typeof documents
                ] as UploadedFile | null;
                const isUploading = uploadingFiles.has(key);

                return (
                  <div key={key} className="space-y-2">
                    <label className="block text-sm font-medium text-foreground  items-center gap-2">
                      {label}
                      {isUploading && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      )}
                    </label>
                    <div className="relative">
                      <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors hover:border-blue-400">
                        <div className="flex items-center gap-2 text-foreground">
                          {doc ? (
                            <>
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700">
                                {doc.name}
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span className="text-sm">Click to upload</span>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) =>
                            handleDocumentChange(
                              e,
                              key as keyof typeof documents
                            )
                          }
                          className="hidden"
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}

              {/* Salary Slips - Multiple */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground  items-center gap-2">
                  Salary Slips (Multiple)
                  {uploadingFiles.has("salarySlips") && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  )}
                </label>
                <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors hover:border-blue-400">
                  <div className="flex items-center gap-2 text-foreground">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">
                      {documents.salarySlips.length > 0
                        ? `${documents.salarySlips.length} file(s) uploaded`
                        : "Click to upload salary slips"}
                    </span>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentChange(e, "salarySlips")}
                    className="hidden"
                    disabled={uploadingFiles.has("salarySlips")}
                  />
                </label>
                {documents.salarySlips.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {documents.salarySlips.map((slip, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white p-2 rounded border border-gray-200"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm text-foreground truncate">
                            {slip.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSalarySlip(index)}
                          className="text-red-600 hover:text-red-800 ml-2 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Terms & Conditions + E-Signature */}
          <Card className="p-6 shadow-sm space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold">
                7
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Terms & Conditions
              </h2>
            </div>

            {/* T&C */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please read and accept our terms and conditions to proceed with
                onboarding.
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={() => setTermsModalOpen(true)}
                className="w-full justify-center"
              >
                View Terms and Conditions
              </Button>

              <label className="flex items-start gap-3 p-4 border border-purple-200 rounded-lg bg-white hover:bg-purple-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 cursor-pointer mt-1"
                  required
                />
                <span className="text-sm text-foreground">
                  I have read and agree to the terms and conditions
                </span>
              </label>
            </div>

            {/* Divider */}
            <div className="border-t pt-4" />

            {/* Signature Section Header */}
            <div>
              <h3 className="font-semibold text-base mb-1">E-Signature</h3>
              <p className="text-sm text-muted-foreground">
                {useDigitalSignature
                  ? "Draw your signature below."
                  : "Upload an image of your signature."}
              </p>
            </div>

            {/* Signature Mode Switch */}
            <div className="flex gap-2 border-b border-gray-200 pb-4">
              <button
                type="button"
                onClick={() => {
                  setUseDigitalSignature(true);
                  setShowSignaturePad(false);
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  useDigitalSignature
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "text-muted-foreground hover:bg-gray-100"
                }`}
              >
                Digital Signature
              </button>

              <button
                type="button"
                onClick={() => setUseDigitalSignature(false)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  !useDigitalSignature
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "text-muted-foreground hover:bg-gray-100"
                }`}
              >
                Upload Signature
              </button>
            </div>

            {/* Digital Signature */}
            {useDigitalSignature ? (
              <div className="space-y-3">
                {!showSignaturePad ? (
                  signature ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
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
                        className="w-full mt-3"
                      >
                        Redraw Signature
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
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
                      className="w-full bg-transparent"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            ) : (
              /* Upload Signature */
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Upload Signature
                </label>

                <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-colors">
                  <div className="flex items-center gap-2 text-foreground">
                    {signature ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          {signature.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">
                          Click to upload signature
                        </span>
                      </>
                    )}
                  </div>

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleSignatureChange}
                    className="hidden"
                    disabled={uploadingFiles.has("signature")}
                    required
                  />
                </label>
              </div>
            )}
          </Card>

          {/* Submit Button */}
          <div className="flex gap-3 pb-8">
            <Button
              type="submit"
              disabled={submitting || uploadingFiles.size > 0}
              className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Complete Onboarding
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Signature Preview Modal */}
      <SignaturePreviewModal
        open={showSignaturePreview}
        signature={previewSignature || ""}
        onConfirm={confirmSignature}
        onCancel={cancelSignaturePad}
      />

      <TermsConditionsModal
        open={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        onAccept={() => {
          setTermsAccepted(true);
          setTermsModalOpen(false);
        }}
      />
    </div>
  );
}
