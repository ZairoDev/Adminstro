"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, AlertCircle, Upload, Loader2, FileText, X, Download, Eye, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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
        fatherName?: string;
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
      yearsOfExperience?: string;
      companies?: Array<{
        companyName: string;
        experienceLetter: string;
        relievingLetter: string;
        salarySlip: string;
        hrPhone: string;
        hrEmail: string;
      }>;
      signedPdfUrl?: string;
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
}

interface CompanyExperience {
  id: string;
  companyName: string;
  experienceLetter: UploadedFile | null;
  relievingLetter: UploadedFile | null;
  salarySlip: UploadedFile | null;
  hrPhone: string;
  hrEmail: string;
}

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8 flex items-center justify-center">
    <div className="w-full max-w-4xl space-y-6">
      <div className="text-center space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mx-auto animate-pulse" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mx-auto animate-pulse" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="space-y-3 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 animate-pulse"
        >
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full" />
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
  });

  const [yearsOfExperience, setYearsOfExperience] = useState<string>("");
  const [companies, setCompanies] = useState<CompanyExperience[]>([
    {
      id: Date.now().toString(),
      companyName: "",
      experienceLetter: null,
      relievingLetter: null,
      salarySlip: null,
      hrPhone: "",
      hrEmail: "",
    },
  ]);

  const [signature, setSignature] = useState<UploadedFile | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [useDigitalSignature, setUseDigitalSignature] = useState(true);
  const [showSignaturePad, setShowSignaturePad] = useState(true);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const [unsignedPdfUrl, setUnsignedPdfUrl] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const response = await fetch(`/api/candidates/${candidateId}`);
        const result = await response.json();

        if (result.success) {
          setCandidate(result.data);
          if (result.data.onboardingDetails) {
            const onboarding = result.data.onboardingDetails;
            
            // Load personal details
            setPersonalDetails(
              onboarding.personalDetails || personalDetails
            );
            
            // Load bank details
            setBankDetails(
              onboarding.bankDetails || bankDetails
            );
            
            // Load experience data if available
            if (onboarding.yearsOfExperience) {
              setYearsOfExperience(onboarding.yearsOfExperience);
            }
            if (onboarding.companies && onboarding.companies.length > 0) {
              // Transform database companies to frontend format
              setCompanies(
                onboarding.companies.map((company: any, index: number) => ({
                  id: Date.now().toString() + index,
                  companyName: company.companyName || "",
                  experienceLetter: company.experienceLetter
                    ? { url: company.experienceLetter, name: "Experience Letter" }
                    : null,
                  relievingLetter: company.relievingLetter
                    ? { url: company.relievingLetter, name: "Relieving Letter" }
                    : null,
                  salarySlip: company.salarySlip
                    ? { url: company.salarySlip, name: "Salary Slip" }
                    : null,
                  hrPhone: company.hrPhone || "",
                  hrEmail: company.hrEmail || "",
                }))
              );
            }
            
            // CRITICAL: Load signed PDF URL if available - this is the authoritative document after signing
            // Once a document is signed, we should NEVER show the unsigned version
            if (onboarding.signedPdfUrl) {
              setSignedPdfUrl(onboarding.signedPdfUrl);
              // Defensive check: Clear unsigned PDF if signed PDF exists
              setUnsignedPdfUrl(null);
            }
            
            // Load signature if available
            if (onboarding.eSign?.signatureImage) {
              setSignature({
                url: onboarding.eSign.signatureImage,
                name: "signature.png",
              });
              setShowSignaturePad(false);
            }
            
            setTermsAccepted(onboarding.termsAccepted || false);
            
            // Check if onboarding is already complete
            if (onboarding.onboardingComplete) {
              setIsOnboardingComplete(true);
            }
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

      // console.log(`Uploading ${docType} files...`);

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

      setDocuments((prev) => ({
        ...prev,
        [docType]: {
          url: imageUrls[0],
          name: fileArray[0]?.name || `document-${docType}`,
        },
      }));

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

  const addCompany = () => {
    setCompanies([
      ...companies,
      {
        id: Date.now().toString(),
        companyName: "",
        experienceLetter: null,
        relievingLetter: null,
        salarySlip: null,
        hrPhone: "",
        hrEmail: "",
      },
    ]);
  };

  const removeCompany = (id: string) => {
    if (companies.length > 1) {
      setCompanies(companies.filter((c) => c.id !== id));
    } else {
      toast({
        title: "Cannot remove",
        description: "At least one company is required",
        variant: "destructive",
      });
    }
  };

  const updateCompany = (id: string, updates: Partial<CompanyExperience>) => {
    setCompanies(
      companies.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleCompanyDocumentChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    companyId: string,
    docType: "experienceLetter" | "relievingLetter" | "salarySlip"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    e.target.value = "";

    try {
      const uploadKey = `company-${companyId}-${docType}`;
      setUploadingFiles((prev) => new Set(prev).add(uploadKey));

      const { imageUrls, error } = await uploadFiles(
        [file],
        `Documents/CompanyDocuments/${docType}`
      );

      if (error || !imageUrls?.length) {
        toast({
          title: "Upload failed",
          description: error || "Failed to upload file",
          variant: "destructive",
        });
        return;
      }

      updateCompany(companyId, {
        [docType]: {
          url: imageUrls[0],
          name: file.name,
        },
      });

      toast({
        title: "Upload successful",
        description: "File uploaded successfully",
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
        next.delete(`company-${companyId}-${docType}`);
        return next;
      });
    }
  };

  const validateForm = () => {
    if (
      !personalDetails.dateOfBirth ||
      !personalDetails.gender ||
      !personalDetails.nationality ||
      !personalDetails.fatherName
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
    if (!yearsOfExperience || yearsOfExperience === "") {
      setError("Please enter years of experience");
      return false;
    }
    // Validate companies if experience > 0
    const experienceValue = parseFloat(yearsOfExperience);
    if (experienceValue > 0) {
      for (const company of companies) {
        if (!company.companyName || company.companyName.trim() === "") {
          setError("Please fill company name for all companies");
          return false;
        }
        if (!company.hrPhone || company.hrPhone.trim() === "") {
          setError("Please fill HR phone number for all companies");
          return false;
        }
        if (!company.hrEmail || company.hrEmail.trim() === "") {
          setError("Please fill HR email for all companies");
          return false;
        }
        if (!company.experienceLetter) {
          setError("Please upload experience letter for all companies");
          return false;
        }
        if (!company.relievingLetter) {
          setError("Please upload relieving letter for all companies");
          return false;
        }
        if (!company.salarySlip) {
          setError("Please upload salary slip for all companies");
          return false;
        }
      }
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
      // console.log("Preparing to submit onboarding data...");

      // Validation
      if (!validateForm()) {
        setSubmitting(false);
        return;
      }
      if (!candidate) throw new Error("Candidate data missing");
      if (!signature?.url) throw new Error("Signature missing");

      // CRITICAL: Agreement Payload for SIGNED PDF generation
      // The signatureBase64 field is what triggers signed PDF generation in the API
      // If this is missing or invalid, an unsigned PDF will be generated (which is incorrect)
      // This payload MUST include the signature URL to generate a properly signed document
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

        // CRITICAL: This signature URL is what makes the PDF signed vs unsigned
        // The API will fetch this image and embed it into the PDF at the signature location
        // Without this, the PDF will be unsigned (preview only)
        signatureBase64: signature.url,
      };

      // DEFENSIVE CHECK: Ensure signature is present before PDF generation
      if (!signature.url) {
        throw new Error("Signature is required to generate signed PDF. Please provide your signature before submitting.");
      }

      // console.log("Sending Agreement Payload:", agreementPayload);

      // CRITICAL: Request SIGNED PDF from API
      // This API call generates a PDF with the signature embedded at the designated location
      // The signature is fetched from the URL and embedded into the PDF document itself
      // This is different from unsigned preview - the signature becomes part of the PDF content
      let pdfResponse;
      try {
        console.log("Generating signed PDF with embedded signature...");
        pdfResponse = await axios.post(
          "/api/candidates/onboardingDocument",
          agreementPayload,
          {
            responseType: "arraybuffer",
            headers: { "Content-Type": "application/json" },
          }
        );
        console.log("Signed PDF generated successfully with embedded signature");
      } catch (pdfError: any) {
        console.error("PDF Generation Error:", pdfError);
        if (pdfError.response?.status === 405) {
          throw new Error(
            "API route not found. Please verify the route file exists at: app/api/candidates/onboardingDocument/route.ts"
          );
        }
        throw new Error(
          pdfError.response?.data?.error || "Failed to generate signed PDF. Please ensure your signature is valid."
        );
      }

      // CRITICAL: Convert signed PDF result to Blob
      // This Blob contains the PDF with the signature embedded in it
      // This is the final signed document, not a preview
      const pdfBlob = new Blob([pdfResponse.data], {
        type: "application/pdf",
      });

      // CRITICAL: Store signed PDF URL for preview
      // This is the signed PDF with embedded signature, not the unsigned preview
      // Clear any unsigned PDF state to ensure only signed PDF is shown
      const signedUrl = URL.createObjectURL(pdfBlob);
      setSignedPdfUrl(signedUrl);
      setUnsignedPdfUrl(null); // DEFENSIVE: Clear unsigned PDF when signed PDF exists
      setShowPdfPreview(true);

      // CRITICAL: Download signed PDF for user
      // This is the final signed document with embedded signature
      const a = document.createElement("a");
      a.href = signedUrl;
      a.download = `ZIPL-Service-Agreement-${candidateId}-Signed.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      console.log("Signed PDF downloaded successfully");

      // CRITICAL: Upload signed PDF to BunnyCDN
      // This signed PDF (with embedded signature) becomes the authoritative document
      // The unsigned preview PDF should never be uploaded or saved after signing
      // Filename clearly indicates this is the signed version
      const pdfFile = new File(
        [pdfBlob],
        `ZIPL-Service-Agreement-${candidateId}-Signed.pdf`,
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
      console.log("Signed PDF uploaded to CDN:", signedPdfUrl);

      // DEFENSIVE CHECK: Ensure signed PDF URL was successfully obtained
      // Without this, we cannot save the signed document reference
      if (!signedPdfUrl) {
        throw new Error("Failed to obtain signed PDF URL from storage. Cannot complete onboarding.");
      }

      // CRITICAL: Prepare onboarding submission with signed PDF URL
      // This signedPdfUrl points to the PDF with embedded signature, not the unsigned preview
      // The database will store this as the authoritative document
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
      formData.append("yearsOfExperience", yearsOfExperience);
      formData.append("companies", JSON.stringify(companies));

      formData.append("signature", signature.url);
      formData.append("signedPdfUrl", signedPdfUrl);
      formData.append("termsAccepted", String(termsAccepted));

      console.log("Submitting onboarding to backend...");

      // ✅ 8. Save onboarding to backend
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
      setIsOnboardingComplete(true); // Mark onboarding as complete

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

  const generateUnsignedPdf = async () => {
    if (!candidate) return;
    
    // DEFENSIVE CHECK: If document is already signed, don't generate unsigned PDF
    // Once signed, the signed PDF is the only valid document
    if (candidate.onboardingDetails?.signedPdfUrl || signedPdfUrl) {
      toast({
        title: "Document Already Signed",
        description: "This document has already been signed. Please use the signed PDF.",
        variant: "destructive",
      });
      // Load signed PDF if available
      if (candidate.onboardingDetails?.signedPdfUrl) {
        setSignedPdfUrl(candidate.onboardingDetails.signedPdfUrl);
        setShowPdfPreview(true);
      }
      return;
    }
    
    setGeneratingPdf(true);
    try {
      const agreementPayload = {
        agreementDate: new Date().toLocaleDateString("en-IN"),
        agreementCity: candidate.city ?? "Kanpur",
        employeeName: candidate.name,
        fatherName: personalDetails.fatherName || candidate.fatherName,
        employeeAddress: candidate.address,
        designation: candidate.position,
        effectiveFrom: new Date().toLocaleDateString("en-IN"),
        postingLocation: candidate.city,
        salaryINR: candidate.selectionDetails?.role ?? "As per employment terms",
        witness1: "____________________",
        witness2: "____________________",
        // No signature for unsigned PDF
      };

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

  const downloadUnsignedPdf = () => {
    if (!unsignedPdfUrl) return;
    
    const a = document.createElement("a");
    a.href = unsignedPdfUrl;
    a.download = `ZIPL-Service-Agreement-${candidateId}-Unsigned.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!candidate || candidate.status !== "onboarding" ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent mb-3">
            Complete Your Onboarding
          </h1>
          <p className="text-lg text-muted-foreground">
            Fill in all required details to get started with us
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded-lg flex items-center gap-3 shadow-sm">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                Onboarding completed successfully!
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
          {/* Your Information */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm">
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
            <Card className="p-6 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 shadow-sm">
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
          <Card className="p-6 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
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
                  className="w-full px-3 py-2 border border-muted dark:border-gray-600 rounded bg-background dark:bg-gray-900 text-foreground focus:border-primary focus:outline-none"
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
          <Card className="p-6 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
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
          <Card className="p-6 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
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
                      <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-center gap-2 text-foreground">
                          {doc ? (
                            <>
                              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">
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

          {/* Experience Section */}
          <Card className="p-6 shadow-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                6
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Work Experience
              </h2>
            </div>
            
            {/* Years of Experience */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Years of Experience <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="e.g., 2.5"
                value={yearsOfExperience}
                onChange={(e) => {
                  const value = e.target.value;
                  setYearsOfExperience(value);
                  // Clear companies if experience is set to 0 or empty
                  if (value === "" || parseFloat(value) === 0) {
                    setCompanies([
                      {
                        id: Date.now().toString(),
                        companyName: "",
                        experienceLetter: null,
                        relievingLetter: null,
                        salarySlip: null,
                        hrPhone: "",
                        hrEmail: "",
                      },
                    ]);
                  }
                }}
                min="0"
                step="0.1"
                required
                className="max-w-xs"
              />
            </div>

            {/* Companies - Only show if experience > 0 */}
            {yearsOfExperience && parseFloat(yearsOfExperience) > 0 ? (
              <div className="space-y-6">
              {companies.map((company, index) => {
                const isUploadingExp = uploadingFiles.has(`company-${company.id}-experienceLetter`);
                const isUploadingRel = uploadingFiles.has(`company-${company.id}-relievingLetter`);
                const isUploadingSal = uploadingFiles.has(`company-${company.id}-salarySlip`);

                return (
                  <div
                    key={company.id}
                    className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-foreground">
                        Company {index + 1}
                      </h3>
                      {companies.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCompany(company.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Company Name */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          placeholder="Enter company name"
                          value={company.companyName}
                          onChange={(e) =>
                            updateCompany(company.id, {
                              companyName: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      {/* HR Contact Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            HR Phone Number <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="tel"
                            placeholder="HR phone number"
                            value={company.hrPhone}
                            onChange={(e) =>
                              updateCompany(company.id, { hrPhone: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            HR Email <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="email"
                            placeholder="HR email address"
                            value={company.hrEmail}
                            onChange={(e) =>
                              updateCompany(company.id, { hrEmail: e.target.value })
                            }
                            required
                          />
                        </div>
                      </div>

                      {/* Documents */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Experience Letter */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">
                            Experience Letter <span className="text-red-500">*</span>
                            {isUploadingExp && (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 inline-block ml-2" />
                            )}
                          </label>
                          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors hover:border-blue-400 dark:hover:border-blue-500">
                            <div className="flex items-center gap-2 text-foreground">
                              {company.experienceLetter ? (
                                <>
                                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span className="text-sm font-medium text-green-700 dark:text-green-400 truncate">
                                    {company.experienceLetter.name}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  <span className="text-sm">Upload</span>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) =>
                                handleCompanyDocumentChange(
                                  e,
                                  company.id,
                                  "experienceLetter"
                                )
                              }
                              className="hidden"
                              disabled={isUploadingExp}
                              required
                            />
                          </label>
                        </div>

                        {/* Relieving Letter */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">
                            Relieving Letter <span className="text-red-500">*</span>
                            {isUploadingRel && (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 inline-block ml-2" />
                            )}
                          </label>
                          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors hover:border-blue-400 dark:hover:border-blue-500">
                            <div className="flex items-center gap-2 text-foreground">
                              {company.relievingLetter ? (
                                <>
                                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span className="text-sm font-medium text-green-700 dark:text-green-400 truncate">
                                    {company.relievingLetter.name}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  <span className="text-sm">Upload</span>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) =>
                                handleCompanyDocumentChange(
                                  e,
                                  company.id,
                                  "relievingLetter"
                                )
                              }
                              className="hidden"
                              disabled={isUploadingRel}
                              required
                            />
                          </label>
                        </div>

                        {/* Salary Slip */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">
                            Salary Slip <span className="text-red-500">*</span>
                            {isUploadingSal && (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 inline-block ml-2" />
                            )}
                          </label>
                          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors hover:border-blue-400 dark:hover:border-blue-500">
                            <div className="flex items-center gap-2 text-foreground">
                              {company.salarySlip ? (
                                <>
                                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span className="text-sm font-medium text-green-700 dark:text-green-400 truncate">
                                    {company.salarySlip.name}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  <span className="text-sm">Upload</span>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) =>
                                handleCompanyDocumentChange(
                                  e,
                                  company.id,
                                  "salarySlip"
                                )
                              }
                              className="hidden"
                              disabled={isUploadingSal}
                              required
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Company Button */}
              <Button
                type="button"
                variant="outline"
                onClick={addCompany}
                className="w-full border-dashed dark:border-gray-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Company
              </Button>
            </div>
            ) : yearsOfExperience && parseFloat(yearsOfExperience) === 0 ? (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  No company details required for candidates with zero years of experience.
                </p>
              </div>
            ) : null}
          </Card>

          {/* PDF Preview Section */}
          <Card className="p-6 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-semibold">
                7
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Onboarding Document Preview
              </h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Preview and download the unsigned onboarding document before accepting terms and conditions. The document contains blank signature placeholders where signatures can be made.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateUnsignedPdf}
                  disabled={generatingPdf}
                  className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {generatingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview PDF
                    </>
                  )}
                </Button>
                {/* CRITICAL: Show download button for signed PDF if available, otherwise unsigned */}
                {(signedPdfUrl || unsignedPdfUrl) && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const url = signedPdfUrl || unsignedPdfUrl;
                        if (!url) return;
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = signedPdfUrl
                          ? `ZIPL-Service-Agreement-${candidateId}-Signed.pdf`
                          : `ZIPL-Service-Agreement-${candidateId}-Unsigned.pdf`;
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
                  </>
                )}
              </div>
              {/* CRITICAL: Always prioritize signed PDF over unsigned PDF */}
              {/* Once a document is signed, the signed version is authoritative */}
              {(signedPdfUrl || unsignedPdfUrl) && (
                <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <iframe
                    src={signedPdfUrl || unsignedPdfUrl || ""}
                    className="w-full h-[500px] border-0"
                    title={signedPdfUrl ? "Signed PDF Preview" : "PDF Preview"}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Terms & Conditions + E-Signature */}
          <Card className="p-6 shadow-sm space-y-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            {/* Section Header */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold">
                8
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

              <label className="flex items-start gap-3 p-4 border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-gray-900 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors cursor-pointer">
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
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
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

            {/* Digital Signature */}
            {useDigitalSignature ? (
              <div className="space-y-3">
                {!showSignaturePad ? (
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

                <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
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
              disabled={submitting || uploadingFiles.size > 0 || isOnboardingComplete}
              className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {isOnboardingComplete ? (
                <>
                  <Check className="w-4 h-4" />
                  Onboarding Completed
                </>
              ) : submitting ? (
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

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirm Submission</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to submit your onboarding details? Once submitted, you won&apos;t be able to make changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
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
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {signedPdfUrl ? "Signed Onboarding Document" : "Onboarding Document Preview"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {signedPdfUrl 
                ? "Your signed onboarding document. This will be saved after submission."
                : "Preview of the unsigned onboarding document. Please review before signing."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
            {/* CRITICAL: Always prioritize signed PDF - once signed, never show unsigned */}
            {(signedPdfUrl || unsignedPdfUrl) && (
              <iframe
                src={signedPdfUrl || unsignedPdfUrl || ""}
                className="w-full h-[70vh] border-0"
                title={signedPdfUrl ? "Signed Onboarding Document" : "Onboarding Document Preview"}
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
                    ? `ZIPL-Service-Agreement-${candidateId}.pdf`
                    : `ZIPL-Service-Agreement-${candidateId}-Unsigned.pdf`;
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
                if (signedPdfUrl) {
                  URL.revokeObjectURL(signedPdfUrl);
                  setSignedPdfUrl(null);
                }
                if (unsignedPdfUrl && !signedPdfUrl) {
                  URL.revokeObjectURL(unsignedPdfUrl);
                  setUnsignedPdfUrl(null);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
