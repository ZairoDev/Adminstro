"use client";

import type React from "react";

import { useState, useEffect,useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Check, AlertCircle, Upload, Loader2, FileText, Download, Eye, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { useToast } from "@/hooks/use-toast";
import { TermsConditionsModal } from "../../components/terms-conditions-modal";
import { SignaturePreviewModal } from "../../components/signature-preview-modal";
import { SignaturePad } from "../../components/signature-pad";
import {
  OnboardingDocumentDropzone,
  OnboardingSectionHeader,
} from "../../components/onboarding-document-dropzone";
import {
  OnboardingAlert,
  OnboardingCard,
  OnboardingFact,
  OnboardingField,
  OnboardingHero,
  OnboardingPageShell,
  OnboardingPdfPreview,
  OnboardingProgress,
  OnboardingSegmented,
  OnboardingSignaturePhotoGuide,
  OnboardingStickyBar,
  onboardingControlClass,
} from "../../components/onboarding-shell";
import { PDFDocument } from "pdf-lib";
import axios from "@/util/axios";




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
    employmentType?: "fulltime" | "intern" | null;
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
      trainingDate?: string; // Training start date (YYYY-MM-DD format)
      role: string;
      salary?: number;
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
        aadharCardFront: string;
        aadharCardBack: string;
        panCard: string;
        cancelledCheque?: string;
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
      resignatureRequest?: {
        agreementType: string;
        token: string;
        tokenExpiresAt: string;
        requestedBy: string;
        requestedAt: string;
        reason?: string | null;
        isActive: boolean;
        emailSentAt?: string | null;
        completedAt?: string;
      };
    };
  }

interface UploadedFile {
  url: string;
  name: string;
}

interface DocumentsState {
  aadharCardFront: UploadedFile | null;
  aadharCardBack: UploadedFile | null;
  panCard: UploadedFile | null;
  cancelledCheque: UploadedFile | null;
  highSchoolMarksheet: UploadedFile | null;
  interMarksheet: UploadedFile | null;
  graduationMarksheet: UploadedFile | null;
}

interface CompanyExperience {
  id: string;
  companyName: string;
  yearsInCompany: string;
  experienceLetter: UploadedFile | null;
  relievingLetter: UploadedFile | null;
  salarySlip: UploadedFile | null;
  hrPhone: string;
  hrEmail: string;
}

const LoadingSkeleton = () => (
  <OnboardingPageShell>
    <div className="mb-8 space-y-3">
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="h-8 w-3/4 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted/80" />
    </div>
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-5"
      >
        <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-11 w-full animate-pulse rounded-md bg-muted/70" />
        <div className="h-11 w-full animate-pulse rounded-md bg-muted/70" />
      </div>
    ))}
  </OnboardingPageShell>
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
  const searchParams = useSearchParams();
  const { uploadFiles } = useBunnyUpload();
  const { toast } = useToast();
  const candidateId = params?.id as string;

  // Resignature mode - check for token in URL
  const resignatureToken = searchParams?.get("resignature") ?? null;
  const [isResignatureMode, setIsResignatureMode] = useState(false);
  const [resignatureValid, setResignatureValid] = useState(false);
  const [validatingResignature, setValidatingResignature] = useState(false);

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
    fatherName: "",
    aadhaarNumber: "",
    panNumber: "",
  });

  // Validation states for Aadhaar and PAN
  const [aadhaarError, setAadhaarError] = useState<string | null>(null);
  const [panError, setPanError] = useState<string | null>(null);

  // Re-upload mode state
  const [isReuploadMode, setIsReuploadMode] = useState(false);
  const [reuploadDocuments, setReuploadDocuments] = useState<string[]>([]);
  const [reuploadReason, setReuploadReason] = useState<string | null>(null);
  const [reuploadCompleted, setReuploadCompleted] = useState(false);

  // Document labels for display
  const DOCUMENT_LABELS: Record<string, string> = {
    aadharCardFront: "Aadhaar Card - Front",
    aadharCardBack: "Aadhaar Card - Back",
    panCard: "PAN Card",
    cancelledCheque: "Cancelled Cheque",
    highSchoolMarksheet: "High School Marksheet",
    interMarksheet: "Intermediate Marksheet",
    graduationMarksheet: "Graduation Marksheet",
    experienceLetter: "Experience Letter",
    relievingLetter: "Relieving Letter",
    salarySlips: "Salary Slips",
  };

  // Validation functions for Aadhaar and PAN
  const validateAadhaar = (value: string): boolean => {
    // Remove spaces for validation
    const cleanedValue = value.replace(/\s/g, "");
    // Aadhaar is exactly 12 digits
    const isValid = /^\d{12}$/.test(cleanedValue);
    if (!isValid && cleanedValue.length > 0) {
      setAadhaarError("Aadhaar must be exactly 12 digits");
    } else {
      setAadhaarError(null);
    }
    return isValid;
  };

  const validatePAN = (value: string): boolean => {
    // PAN format: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g., ABCDE1234F)
    const cleanedValue = value.toUpperCase().replace(/\s/g, "");
    const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanedValue);
    if (!isValid && cleanedValue.length > 0) {
      setPanError("PAN must be in format: ABCDE1234F");
    } else {
      setPanError(null);
    }
    return isValid;
  };

  // Format Aadhaar with masking for display (show only last 4 digits)
  const formatAadhaarForDisplay = (value: string): string => {
    const cleanedValue = value.replace(/\s/g, "");
    if (cleanedValue.length <= 4) return cleanedValue;
    // Show XXXX XXXX + last 4 digits
    return `XXXX XXXX ${cleanedValue.slice(-4)}`;
  };

  // Format Aadhaar for input (with spaces every 4 digits)
  const formatAadhaarInput = (value: string): string => {
    const cleanedValue = value.replace(/\D/g, "").slice(0, 12);
    return cleanedValue.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  };

  // Check if document is locked (verified and not in re-upload list)
  const isDocumentLocked = (docKey: string): boolean => {
    if (!isReuploadMode) return false;
    // In re-upload mode, only documents in the reuploadDocuments list are editable
    return !reuploadDocuments.includes(docKey);
  };

  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
  });

  const [documents, setDocuments] = useState<DocumentsState>({
    aadharCardFront: null,
    aadharCardBack: null,
    panCard: null,
    cancelledCheque: null,
    highSchoolMarksheet: null,
    interMarksheet: null,
    graduationMarksheet: null,
  });

  const [yearsOfExperience, setYearsOfExperience] = useState<string>("");
  const [companies, setCompanies] = useState<CompanyExperience[]>([
    {
      id: Date.now().toString(),
      companyName: "",
      yearsInCompany: "",
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
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const [unsignedPdfUrl, setUnsignedPdfUrl] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const pdfGeneratedRef = useRef(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        // Check if there's a re-upload token in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const reuploadToken = urlParams.get("reupload");

        // Fetch candidate data first
        const response = await fetch(`/api/candidates/${candidateId}`);
        const result = await response.json();

        if (result.success) {
          setCandidate(result.data);
          
          // If resignature token exists, validate it
          if (resignatureToken) {
            setValidatingResignature(true);
            try {
              const validateResponse = await fetch(
                `/api/candidates/${candidateId}/validate-resignature?token=${resignatureToken}&agreementType=onboarding`
              );
              
              // Handle non-OK responses
              if (!validateResponse.ok) {
                const errorResult = await validateResponse.json().catch(() => ({
                  success: false,
                  valid: false,
                  error: "Failed to validate re-signature link",
                }));
                setResignatureValid(false);
                toast({
                  title: errorResult.error || "Invalid Link",
                  description: errorResult.expired 
                    ? "This re-signature link has expired. Please contact HR for a new link."
                    : "This re-signature link is not valid. Please contact HR.",
                  variant: "destructive",
                });
                return;
              }

              const validateResult = await validateResponse.json();

              if (validateResult.success && validateResult.valid) {
                setIsResignatureMode(true);
                setResignatureValid(true);
                toast({
                  title: "Re-signature Required",
                  description: "Please re-sign the onboarding agreement document only.",
                });
              } else {
                setResignatureValid(false);
                toast({
                  title: validateResult.error || "Invalid Link",
                  description: validateResult.expired 
                    ? "This re-signature link has expired. Please contact HR for a new link."
                    : "This re-signature link is not valid. Please contact HR.",
                  variant: "destructive",
                });
              }
            } catch (validateError) {
              console.error("Error validating resignature token:", validateError);
              setResignatureValid(false);
              toast({
                title: "Validation Error",
                description: "Failed to validate re-signature link. Please contact HR.",
                variant: "destructive",
              });
            } finally {
              setValidatingResignature(false);
            }
          }
          
          // If re-upload token exists, validate it after candidate data is loaded
          if (reuploadToken) {
            try {
              console.log("Validating re-upload token:", reuploadToken);
              const validateResponse = await fetch(`/api/candidates/${candidateId}/validate-reupload?token=${reuploadToken}`);
              const validateResult = await validateResponse.json();

              console.log("Validation result:", validateResult);

              if (validateResult.success && validateResult.valid) {
                // Token is valid
                setIsReuploadMode(true);
                setReuploadDocuments(validateResult.data.requestedDocuments || []);
                setReuploadReason(validateResult.data.reason || null);
                
                if (validateResult.completed) {
                  setReuploadCompleted(true);
                  toast({
                    title: "Documents Already Submitted",
                    description: "You have already re-uploaded the requested documents. HR will review them shortly.",
                  });
                } else {
                  setReuploadCompleted(false);
                }
              } else {
                // Token is invalid or expired
                console.error("Validation failed:", validateResult);
                toast({
                  title: validateResult.error || "Invalid Link",
                  description: validateResult.expired 
                    ? "This re-upload link has expired. Please contact HR for a new link."
                    : "This re-upload link is not valid. Please contact HR.",
                  variant: "destructive",
                });
              }
            } catch (validateError) {
              console.error("Error validating re-upload token:", validateError);
              toast({
                title: "Validation Error",
                description: "Failed to validate re-upload link. Please contact HR.",
                variant: "destructive",
              });
            }
          }
          
          const onboarding = result.data.onboardingDetails;
          if (onboarding) {
            // Load personal details with new fields
            setPersonalDetails({
              dateOfBirth: onboarding.personalDetails?.dateOfBirth || "",
              gender: onboarding.personalDetails?.gender || "",
              nationality: onboarding.personalDetails?.nationality || "",
              fatherName: onboarding.personalDetails?.fatherName || "",
              aadhaarNumber: onboarding.personalDetails?.aadhaarNumber || "",
              panNumber: onboarding.personalDetails?.panNumber || "",
            });
            
            // Load bank details
            setBankDetails(
              onboarding.bankDetails || bankDetails
            );

             // Load documents with backward compatibility for aadharCard
             if (onboarding.documents) {
              const docs = onboarding.documents;
              // Handle backward compatibility: if aadharCard exists, use it for front
              const aadharCard = (docs as any).aadharCard;
              setDocuments({
                aadharCardFront: aadharCard ? { url: aadharCard, name: "Aadhar Card" } : (docs.aadharCardFront ? { url: docs.aadharCardFront, name: "Aadhar Card Front" } : null),
                aadharCardBack: docs.aadharCardBack ? { url: docs.aadharCardBack, name: "Aadhar Card Back" } : null,
                panCard: docs.panCard ? { url: docs.panCard, name: "PAN Card" } : null,
                cancelledCheque: docs.cancelledCheque
                  ? { url: docs.cancelledCheque, name: "Cancelled Cheque" }
                  : null,
                highSchoolMarksheet: docs.highSchoolMarksheet ? { url: docs.highSchoolMarksheet, name: "High School Marksheet" } : null,
                interMarksheet: docs.interMarksheet ? { url: docs.interMarksheet, name: "Intermediate Marksheet" } : null,
                graduationMarksheet: docs.graduationMarksheet ? { url: docs.graduationMarksheet, name: "Graduation Marksheet" } : null,
              });
            }
            
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
                  yearsInCompany: company.yearsInCompany || "",
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

   // Auto-generate and open PDF preview when component loads (if not already signed)
   useEffect(() => {
    if (!loading && candidate && !pdfGeneratedRef.current) {
      // If signed PDF exists, just set it and open preview
      if (candidate.onboardingDetails?.signedPdfUrl) {
        setSignedPdfUrl(candidate.onboardingDetails.signedPdfUrl);
        setShowPdfPreview(true);
        pdfGeneratedRef.current = true;
      } 
      // Auto-generate unsigned PDF ONLY if:
      // 1. No signed PDF exists
      // 2. No unsigned PDF is already loaded
      // 3. Not currently generating
      // 4. Onboarding is not complete
      else if (
        !candidate.onboardingDetails?.signedPdfUrl && 
        !unsignedPdfUrl && 
        !generatingPdf &&
        !candidate.onboardingDetails?.onboardingComplete
      ) {
        pdfGeneratedRef.current = true;
        // Auto-generate after short delay
        const timer = setTimeout(() => {
          generateUnsignedPdf();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, candidate, unsignedPdfUrl, generatingPdf]);
  

  // Auto-open PDF preview dialog when PDF is generated
  // useEffect(() => {
  //   if ((unsignedPdfUrl || signedPdfUrl) && !showPdfPreview && !loading) {
  //     setShowPdfPreview(true);
  //   }
  // }, [unsignedPdfUrl, signedPdfUrl, loading]);


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
        yearsInCompany: "",
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
    // Skip validation for fields not being updated in re-upload mode
    if (!isReuploadMode) {
      if (
        !personalDetails.dateOfBirth ||
        !personalDetails.gender ||
        !personalDetails.nationality ||
        !personalDetails.fatherName
      ) {
        setError("Please fill all personal details");
        return false;
      }
      // Validate Aadhaar Number
      if (!personalDetails.aadhaarNumber || personalDetails.aadhaarNumber.replace(/\s/g, "").length !== 12) {
        setError("Please enter a valid 12-digit Aadhaar number");
        return false;
      }
      if (!validateAadhaar(personalDetails.aadhaarNumber)) {
        setError("Please enter a valid Aadhaar number");
        return false;
      }
      // Validate PAN Number
      if (!personalDetails.panNumber) {
        setError("Please enter your PAN number");
        return false;
      }
      if (!validatePAN(personalDetails.panNumber)) {
        setError("Please enter a valid PAN number (format: ABCDE1234F)");
        return false;
      }
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
    // In re-upload mode, only validate the requested documents
    if (isReuploadMode) {
      for (const docKey of reuploadDocuments) {
        const doc = documents[docKey as keyof typeof documents];
        if (!doc) {
          const labels: Record<string, string> = {
            aadharCardFront: "Aadhar Card Front",
            aadharCardBack: "Aadhar Card Back",
            panCard: "PAN Card",
            cancelledCheque: "Cancelled Cheque",
            highSchoolMarksheet: "High School Marksheet",
            interMarksheet: "Intermediate Marksheet",
            graduationMarksheet: "Graduation Marksheet",
          };
          setError(`Please upload ${labels[docKey] || docKey}`);
          return false;
        }
      }
      return true;
    }

    // Regular onboarding validation
    if (!documents.aadharCardFront) {
      setError("Please upload Aadhar card front");
      return false;
    }
    if (!documents.aadharCardBack) {
      setError("Please upload Aadhar card back");
      return false;
    }
    if (!documents.panCard) {
      setError("Please upload PAN card");
      return false;
    }
    if (!documents.cancelledCheque) {
      setError("Please upload a cancelled cheque");
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

        if (!company.yearsInCompany || company.yearsInCompany.trim() === "") {
          setError("Please fill years of experience for all companies");
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

  // Handle re-upload submission
  const handleReuploadSubmit = async () => {
    setShowConfirmDialog(false);
    setError(null);
    setSubmitting(true);

    try {
      // Validate form first
      if (!validateForm()) {
        setSubmitting(false);
        toast({
          title: "Validation Error",
          description: error || "Please fill all required fields and upload all requested documents.",
          variant: "destructive",
        });
        return;
      }

      // Get the re-upload token from URL
      const urlParams = new URLSearchParams(window.location.search);
      const reuploadToken = urlParams.get("reupload");

      if (!reuploadToken) {
        const errorMsg = "Re-upload token is missing. Please use the link from your email.";
        setError(errorMsg);
        toast({
          title: "Missing Token",
          description: errorMsg,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Prepare only the requested documents
      const documentsToUpload: Record<string, string> = {};
      const missingDocuments: string[] = [];
      
      for (const docKey of reuploadDocuments) {
        const doc = documents[docKey as keyof typeof documents];
        if (doc && doc.url) {
          documentsToUpload[docKey] = doc.url;
        } else {
          const label = DOCUMENT_LABELS[docKey] || docKey;
          missingDocuments.push(label);
        }
      }

      // Check if all requested documents are uploaded
      if (missingDocuments.length > 0) {
        const errorMsg = `Please upload the following documents: ${missingDocuments.join(", ")}`;
        setError(errorMsg);
        toast({
          title: "Missing Documents",
          description: errorMsg,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Check if any documents were prepared
      if (Object.keys(documentsToUpload).length === 0) {
        const errorMsg = "No documents to upload. Please upload at least one document.";
        setError(errorMsg);
        toast({
          title: "No Documents",
          description: errorMsg,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      console.log("Submitting re-upload with documents:", Object.keys(documentsToUpload));
      console.log("Token:", reuploadToken);

      const response = await fetch(`/api/candidates/${candidateId}/onboarding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: documentsToUpload,
          reuploadToken,
        }),
      });

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Network error occurred" }));
        throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to re-upload documents");
      }

      setSuccess(true);
      setReuploadCompleted(true);
      setError(null);
      toast({
        title: "Documents Re-uploaded Successfully",
        description: "HR has been notified and will review your documents shortly.",
      });
    } catch (err: any) {
      console.error("Error re-uploading documents:", err);
      const errorMessage = err.message || "Failed to re-upload documents. Please try again or contact HR.";
      setError(errorMessage);
      toast({
        title: "Re-upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };


  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    // If in re-upload mode, use the re-upload handler
    if (isReuploadMode) {
      await handleReuploadSubmit();
      return;
    }

    // If in resignature mode, only validate signature and submit onboarding document
    if (isResignatureMode) {
      if (!signature?.url) {
        setError("Signature is required to re-sign the document");
        toast({
          title: "Signature Required",
          description: "Please provide your signature to re-sign the onboarding agreement.",
          variant: "destructive",
        });
        return;
      }
      if (!candidate) {
        setError("Candidate data missing");
        return;
      }
      
      setShowConfirmDialog(false);
      setError(null);
      setSubmitting(true);
      
      try {
        // Generate signed PDF with signature
        const agreementPayload = {
          agreementDate: new Date().toISOString(),
          agreementCity: (candidate.officeAddressId && typeof candidate.officeAddressId === "object" && candidate.officeAddressId.city) || candidate.officeLocation || candidate.city || "",
          employeeName: candidate.name,
          fatherName: candidate.onboardingDetails?.personalDetails?.fatherName || personalDetails.fatherName || "",
          employeeAddress: candidate.address,
          designation: candidate.position,
          effectiveFrom: new Date().toISOString(),
          postingLocation: (candidate.officeAddressId && typeof candidate.officeAddressId === "object" && (candidate.officeAddressId.formattedAddress || candidate.officeAddressId.city)) || candidate.officeLocation || candidate.city || "",
          salaryINR: candidate.selectionDetails?.salary 
            ? `${candidate.selectionDetails.salary.toLocaleString("en-IN")} per month`
            : "As per employment terms",
          witness1: "____________________",
          witness2: "____________________",
          signatureBase64: signature.url,
          candidateId: candidate._id, // Pass candidateId so API can fetch stored onboardingStartedAt date
          employmentType:
            candidate.employmentType ?? candidate.selectionDetails?.positionType,
        };

        const pdfResponse = await axios.post(
          "/api/candidates/onboardingDocument",
          agreementPayload,
          {
            responseType: "arraybuffer",
            headers: { "Content-Type": "application/json" },
          }
        );

        const pdfBlob = new Blob([pdfResponse.data], { type: "application/pdf" });
        const signedUrl = URL.createObjectURL(pdfBlob);
        setSignedPdfUrl(signedUrl);
        setUnsignedPdfUrl(null);
        setShowPdfPreview(true);

        // Download signed PDF
        const a = document.createElement("a");
        a.href = signedUrl;
        a.download = `ZIPL-Service-Agreement-${candidateId}-ReSigned.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Upload signed PDF to CDN
        const pdfFile = new File(
          [pdfBlob],
          `ZIPL-Service-Agreement-${candidateId}-ReSigned.pdf`,
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

        // Submit only the onboarding document with resignature token
        const response = await axios.post(
          `/api/candidates/${candidateId}/onboarding/resignature`,
          {
            signedPdfUrl,
            signatureImage: signature.url,
            resignatureToken,
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.error || "Failed to submit re-signed document");
        }

        setSuccess(true);
        toast({
          title: "Document Re-signed Successfully",
          description: "Your onboarding agreement has been re-signed and submitted.",
        });

        // Refresh candidate data
        const refreshResponse = await fetch(`/api/candidates/${candidateId}`);
        const refreshResult = await refreshResponse.json();
        if (refreshResult.success) {
          setCandidate(refreshResult.data);
        }
      } catch (err: any) {
        console.error("Error submitting re-signed document:", err);
        setError(err.response?.data?.error || err.message || "Failed to submit re-signed document");
        toast({
          title: "Submission Failed",
          description: err.response?.data?.error || err.message || "Failed to submit re-signed document",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

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
        agreementDate: new Date().toISOString(),
        agreementCity: (candidate.officeAddressId && typeof candidate.officeAddressId === "object" && candidate.officeAddressId.city) || candidate.officeLocation || candidate.city || "",

        employeeName: candidate.name,
        fatherName: personalDetails.fatherName || candidate.fatherName,
        employeeAddress: candidate.address,

        designation: candidate.position,
        effectiveFrom: new Date().toISOString(),
        postingLocation: candidate.city,
        salaryINR: candidate.selectionDetails?.salary 
          ? `${candidate.selectionDetails.salary.toLocaleString("en-IN")} per month`
          : "As per employment terms",

        witness1: "____________________",
        witness2: "____________________",

        // CRITICAL: This signature URL is what makes the PDF signed vs unsigned
        // The API will fetch this image and embed it into the PDF at the signature location
        // Without this, the PDF will be unsigned (preview only)
        signatureBase64: signature.url,
        candidateId: candidate._id, // Pass candidateId so API can fetch stored onboardingStartedAt date
        employmentType:
          candidate.employmentType ?? candidate.selectionDetails?.positionType,
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

      formData.append("aadharCardFront", documents.aadharCardFront?.url || "");
      formData.append("aadharCardBack", documents.aadharCardBack?.url || "");
      formData.append("panCard", documents.panCard?.url || "");
      formData.append("cancelledCheque", documents.cancelledCheque?.url || "");
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
    } catch (err: any) {
      console.error("Error submitting onboarding:", err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  
  
  const handleSignatureCapture = (signatureUrl: string) => {
    setPreviewSignature(signatureUrl);
    setShowSignaturePad(false); // Hide the signature pad to show the preview
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
    
    // In resignature mode, allow generating PDF even if signed (for re-signing)
    if (!isResignatureMode) {
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
    }
    
    setGeneratingPdf(true);
    try {
      // In resignature mode, use existing onboarding data; otherwise use form data
      const fatherName = isResignatureMode 
        ? (candidate.onboardingDetails?.personalDetails?.fatherName || "")
        : (personalDetails.fatherName || candidate.fatherName || "");
      
      const agreementPayload = {
        agreementDate: new Date().toISOString(),
        agreementCity: (candidate.officeAddressId && typeof candidate.officeAddressId === "object" && candidate.officeAddressId.city) || candidate.officeLocation || candidate.city || "",
        employeeName: candidate.name,
        fatherName: fatherName,
        employeeAddress: candidate.address,
        designation: candidate.position,
        effectiveFrom: new Date().toISOString(),
        postingLocation: candidate.city,
        salaryINR: candidate.selectionDetails?.salary 
          ? `${candidate.selectionDetails.salary.toLocaleString("en-IN")} per month`
          : "As per employment terms",
        witness1: "____________________",
        witness2: "____________________",
        candidateId: candidate._id, // Pass candidateId so API can fetch stored onboardingStartedAt date
        employmentType:
          candidate.employmentType ?? candidate.selectionDetails?.positionType,
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
      <OnboardingPageShell narrow>
        <OnboardingCard className="text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" aria-hidden />
          <h1 className="text-lg font-semibold text-foreground">
            Onboarding is not available
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Only selected candidates can complete onboarding from this page.
          </p>
        </OnboardingCard>
      </OnboardingPageShell>
    );
  }

  // Re-upload Mode - Simplified View with only requested documents
  if (isReuploadMode) {
    return (
      <OnboardingPageShell
        footer={
          !reuploadCompleted ? (
            <OnboardingStickyBar>
              <Button
                type="submit"
                form="onboarding-reupload-form"
                disabled={submitting || uploadingFiles.size > 0}
                className="h-12 w-full gap-2 text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Submit documents
                  </>
                )}
              </Button>
            </OnboardingStickyBar>
          ) : undefined
        }
      >
        <OnboardingHero
          eyebrow="Onboarding"
          title="Re-upload documents"
          description="HR asked for clearer copies of the files below. Upload replacements, then submit."
        />

        {success ? (
          <OnboardingAlert tone="success" title="Documents submitted">
            HR has been notified and will review them shortly.
          </OnboardingAlert>
        ) : null}

        {error ? (
          <OnboardingAlert tone="error" title="Could not submit">
            {error}
          </OnboardingAlert>
        ) : null}

        {reuploadCompleted && !success ? (
          <OnboardingAlert tone="info" title="Already submitted">
            You have already re-uploaded these documents. HR will review them shortly.
          </OnboardingAlert>
        ) : null}

        {reuploadReason && !reuploadCompleted ? (
          <OnboardingAlert tone="warning" title="Why this was requested">
            {reuploadReason}
          </OnboardingAlert>
        ) : null}

        {!reuploadCompleted ? (
          <>
            <OnboardingCard className="mb-4">
              <p className="text-sm font-medium text-foreground">
                Tips for a clear photo
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-muted-foreground">
                <li>Hold the phone in portrait with even lighting</li>
                <li>Keep all text sharp and unblurred</li>
                <li>Avoid shadows or glare on the page</li>
                <li>Fit the full document in the frame</li>
              </ul>
            </OnboardingCard>

            <form
              id="onboarding-reupload-form"
              onSubmit={handleSubmitClick}
              noValidate
            >
              <OnboardingCard>
                <OnboardingSectionHeader
                  step={<FileText className="h-4 w-4" aria-hidden />}
                  title="Documents to re-upload"
                  description="Upload a replacement for each file listed below."
                />
                <div className="grid grid-cols-1 gap-4">
                  {reuploadDocuments.map((docKey) => {
                    const doc = documents[
                      docKey as keyof typeof documents
                    ] as UploadedFile | null;
                    const label = DOCUMENT_LABELS[docKey] || docKey;

                    return (
                      <OnboardingDocumentDropzone
                        key={docKey}
                        id={`reupload-${docKey}`}
                        label={label}
                        file={doc}
                        uploading={uploadingFiles.has(docKey)}
                        hint={
                          docKey === "cancelledCheque"
                            ? 'Write “CANCELLED” across a cheque of the salary account.'
                            : undefined
                        }
                        onChange={(e) =>
                          handleDocumentChange(
                            e,
                            docKey as keyof typeof documents
                          )
                        }
                      />
                    );
                  })}
                </div>
              </OnboardingCard>
            </form>
          </>
        ) : null}

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Confirm re-upload</DialogTitle>
              <DialogDescription>
                Submit these files for HR to review? You can close this page after they are sent.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setShowConfirmDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="min-h-11"
                onClick={handleConfirmSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit documents"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </OnboardingPageShell>
    );
  }

  // Resignature Mode - Only show document signing
  if (isResignatureMode && resignatureValid) {
    return (
      <OnboardingPageShell
        footer={
          <OnboardingStickyBar>
            <Button
              type="submit"
              form="onboarding-resignature-form"
              disabled={submitting || !signature?.url || generatingPdf}
              className="h-12 w-full gap-2 text-base"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Re-sign and submit
                </>
              )}
            </Button>
          </OnboardingStickyBar>
        }
      >
        <OnboardingHero
          eyebrow="Onboarding"
          title="Re-sign your agreement"
          description="Review the document, add your signature, then submit. Only the agreement needs to be signed again."
        />

        {candidate?.onboardingDetails?.resignatureRequest?.reason ? (
          <OnboardingAlert tone="warning" title="Why a new signature is needed">
            {candidate.onboardingDetails.resignatureRequest.reason}
          </OnboardingAlert>
        ) : null}

        {error ? (
          <OnboardingAlert tone="error" title="Could not submit">
            {error}
          </OnboardingAlert>
        ) : null}

        {success ? (
          <OnboardingAlert tone="success" title="Agreement re-signed">
            Your onboarding agreement has been submitted.
          </OnboardingAlert>
        ) : null}

        <form
          id="onboarding-resignature-form"
          onSubmit={handleSubmitClick}
          noValidate
          className="space-y-4"
        >
          <OnboardingCard>
            <OnboardingSectionHeader
              step={1}
              title="Agreement document"
              description="Generate a preview, then open it to read the full terms on your phone."
            />
            <div className="space-y-4">
              {unsignedPdfUrl ? (
                <OnboardingPdfPreview
                  url={unsignedPdfUrl}
                  title="Onboarding agreement"
                />
              ) : null}
              {!unsignedPdfUrl && !generatingPdf ? (
                <Button
                  type="button"
                  onClick={generateUnsignedPdf}
                  variant="outline"
                  className="h-11 w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generate document preview
                </Button>
              ) : null}
              {generatingPdf ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Generating document…
                  </span>
                </div>
              ) : null}
            </div>
          </OnboardingCard>

          <OnboardingCard>
            <OnboardingSectionHeader
              step={2}
              title="Signature"
              description="Draw on screen or upload a clear photo of your signature."
            />

            <OnboardingSegmented
              value={useDigitalSignature ? "draw" : "upload"}
              onChange={(next) => {
                setUseDigitalSignature(next === "draw");
                if (next === "draw") setShowSignaturePad(false);
              }}
              options={[
                { value: "draw", label: "Draw" },
                { value: "upload", label: "Upload" },
              ]}
            />

            <div className="mt-4">
              {useDigitalSignature ? (
                <div className="space-y-4">
                  {showSignaturePad ? (
                    <>
                      <SignaturePad onSignatureCapture={handleSignatureCapture} />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowSignaturePad(false)}
                        className="h-11 w-full"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      {signature?.url && !previewSignature ? (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            Signature confirmed
                          </p>
                          <img
                            src={signature.url}
                            alt="Confirmed signature"
                            className="mx-auto max-h-32 w-full object-contain"
                          />
                        </div>
                      ) : null}
                      {previewSignature ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
                          <img
                            src={previewSignature}
                            alt="Signature preview"
                            className="mx-auto max-h-32 w-full object-contain"
                          />
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          onClick={() => {
                            setShowSignaturePad(true);
                            setPreviewSignature(null);
                          }}
                          variant="outline"
                          className="h-11 flex-1"
                        >
                          {signature?.url || previewSignature
                            ? "Redraw signature"
                            : "Draw signature"}
                        </Button>
                        {previewSignature ? (
                          <Button
                            type="button"
                            onClick={confirmSignature}
                            className="h-11 flex-1"
                          >
                            Confirm signature
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <OnboardingSignaturePhotoGuide />
                  {signature?.url ? (
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <img
                        src={signature.url}
                        alt="Signature"
                        className="mx-auto max-h-32 w-full object-contain"
                      />
                    </div>
                  ) : null}
                  <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-4 text-sm font-medium text-foreground">
                    <span className="flex items-center gap-2">
                      {signature ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" />
                          {signature.name}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload the transparent PNG
                        </>
                      )}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureChange}
                      className="sr-only"
                      disabled={uploadingFiles.has("signature")}
                      required
                    />
                  </label>
                </div>
              )}
            </div>
          </OnboardingCard>
        </form>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Confirm re-signature</DialogTitle>
              <DialogDescription>
                You are about to re-sign the onboarding agreement. Confirm to continue.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setShowConfirmDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="min-h-11"
                onClick={handleConfirmSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Re-sign document"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </OnboardingPageShell>
    );
  }


  const personalComplete = Boolean(
    personalDetails.dateOfBirth &&
      personalDetails.gender &&
      personalDetails.nationality &&
      personalDetails.fatherName &&
      personalDetails.aadhaarNumber.replace(/\s/g, "").length === 12 &&
      personalDetails.panNumber.length === 10 &&
      !aadhaarError &&
      !panError
  );
  const bankComplete = Boolean(
    bankDetails.accountHolderName &&
      bankDetails.accountNumber &&
      bankDetails.ifscCode &&
      bankDetails.bankName &&
      documents.cancelledCheque?.url
  );
  const docsComplete = Boolean(
    documents.aadharCardFront?.url &&
      documents.aadharCardBack?.url &&
      documents.panCard?.url &&
      documents.highSchoolMarksheet?.url &&
      documents.interMarksheet?.url &&
      documents.graduationMarksheet?.url
  );
  const experienceComplete = yearsOfExperience !== "";
  const signComplete = Boolean(termsAccepted && signature?.url);
  const sectionsComplete = [
    personalComplete,
    bankComplete,
    docsComplete,
    experienceComplete,
    signComplete,
  ].filter(Boolean).length;

  // Normal Onboarding Flow
  return (
    <OnboardingPageShell
      footer={
        <OnboardingStickyBar>
          <Button
            type="submit"
            form="onboarding-form"
            disabled={
              submitting ||
              uploadingFiles.size > 0 ||
              (isOnboardingComplete && !isReuploadMode)
            }
            className="h-12 w-full gap-2 text-base"
          >
            {isOnboardingComplete && !isReuploadMode ? (
              <>
                <Check className="h-4 w-4" />
                Onboarding completed
              </>
            ) : submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Complete onboarding
              </>
            )}
          </Button>
        </OnboardingStickyBar>
      }
    >
      <OnboardingHero
        eyebrow="Welcome"
        title="Complete your onboarding"
        description="Fill in your details, upload documents, and sign the agreement. This usually takes about 10 minutes."
      />

      <OnboardingProgress complete={sectionsComplete} total={5} />

      {success ? (
        <OnboardingAlert tone="success" title="Onboarding completed">
          Redirecting to your dashboard…
        </OnboardingAlert>
      ) : null}

      {error ? (
        <OnboardingAlert tone="error" title="Could not submit">
          {error}
        </OnboardingAlert>
      ) : null}

      <form
        id="onboarding-form"
        onSubmit={handleSubmitClick}
        noValidate
        className="space-y-4"
      >
        <OnboardingCard>
          <OnboardingSectionHeader
            step={1}
            title="Your information"
            description="These details come from your application. Contact HR if something is wrong."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <OnboardingFact label="Name" value={candidate.name} />
            <OnboardingFact label="Email" value={candidate.email} />
            <OnboardingFact label="Phone" value={candidate.phone} />
            <OnboardingFact label="Address" value={candidate.address} />
            <OnboardingFact label="City" value={candidate.city} />
            <OnboardingFact label="Country" value={candidate.country} />
          </div>
        </OnboardingCard>

        {candidate.selectionDetails ? (
          <OnboardingCard>
            <OnboardingSectionHeader
              step={2}
              title="Role details"
              description="The offer we selected you for."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <OnboardingFact
                label="Position type"
                value={
                  <span className="capitalize">
                    {candidate.selectionDetails.positionType}
                  </span>
                }
              />
              <OnboardingFact
                label="Duration"
                value={candidate.selectionDetails.duration}
              />
              <OnboardingFact
                label="Training period"
                value={candidate.selectionDetails.trainingPeriod}
              />
              <OnboardingFact
                label="Role"
                value={candidate.selectionDetails.role}
              />
            </div>
          </OnboardingCard>
        ) : null}

        {!isResignatureMode && (
          <OnboardingCard>
            <OnboardingSectionHeader
              step={3}
              title="Personal details"
              description="Used on your employment records and service agreement."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <OnboardingField label="Date of birth" htmlFor="dob" required>
                <Input
                  id="dob"
                  type="date"
                  value={personalDetails.dateOfBirth}
                  onChange={(e) =>
                    setPersonalDetails((prev) => ({
                      ...prev,
                      dateOfBirth: e.target.value,
                    }))
                  }
                  required
                  className={onboardingControlClass}
                />
              </OnboardingField>
              <OnboardingField label="Gender" htmlFor="gender" required>
                <select
                  id="gender"
                  value={personalDetails.gender}
                  onChange={(e) =>
                    setPersonalDetails((prev) => ({
                      ...prev,
                      gender: e.target.value,
                    }))
                  }
                  className={cn(
                    onboardingControlClass,
                    "rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  )}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </OnboardingField>
              <OnboardingField label="Nationality" htmlFor="nationality" required>
                <Input
                  id="nationality"
                  type="text"
                  placeholder="e.g. Indian"
                  autoComplete="country-name"
                  value={personalDetails.nationality}
                  onChange={(e) =>
                    setPersonalDetails((prev) => ({
                      ...prev,
                      nationality: e.target.value,
                    }))
                  }
                  required
                  className={onboardingControlClass}
                />
              </OnboardingField>
              <OnboardingField
                label="Father's name"
                htmlFor="fatherName"
                required
              >
                <Input
                  id="fatherName"
                  type="text"
                  placeholder="Full name"
                  autoComplete="off"
                  value={personalDetails.fatherName}
                  onChange={(e) =>
                    setPersonalDetails((prev) => ({
                      ...prev,
                      fatherName: e.target.value,
                    }))
                  }
                  required
                  className={onboardingControlClass}
                />
              </OnboardingField>
              <OnboardingField
                label="Aadhaar number"
                htmlFor="aadhaar"
                required
                error={aadhaarError}
                hint={
                  personalDetails.aadhaarNumber && !aadhaarError
                    ? `Shown as ${formatAadhaarForDisplay(personalDetails.aadhaarNumber)}`
                    : "12 digits, no spaces needed"
                }
              >
                <Input
                  id="aadhaar"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="XXXX XXXX XXXX"
                  value={formatAadhaarInput(personalDetails.aadhaarNumber)}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 12);
                    setPersonalDetails((prev) => ({
                      ...prev,
                      aadhaarNumber: cleaned,
                    }));
                    if (cleaned.length === 12) {
                      validateAadhaar(cleaned);
                    } else {
                      setAadhaarError(null);
                    }
                  }}
                  className={cn(
                    onboardingControlClass,
                    aadhaarError && "border-destructive"
                  )}
                  required
                  disabled={isReuploadMode}
                />
              </OnboardingField>
              <OnboardingField
                label="PAN number"
                htmlFor="pan"
                required
                error={panError}
                hint="5 letters, 4 digits, 1 letter — e.g. ABCDE1234F"
              >
                <Input
                  id="pan"
                  type="text"
                  autoComplete="off"
                  placeholder="ABCDE1234F"
                  value={personalDetails.panNumber.toUpperCase()}
                  onChange={(e) => {
                    const value = e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 10);
                    setPersonalDetails((prev) => ({
                      ...prev,
                      panNumber: value,
                    }));
                    if (value.length === 10) {
                      validatePAN(value);
                    } else {
                      setPanError(null);
                    }
                  }}
                  className={cn(
                    onboardingControlClass,
                    panError && "border-destructive"
                  )}
                  required
                  disabled={isReuploadMode}
                />
              </OnboardingField>
            </div>
          </OnboardingCard>
        )}


          {/* Bank Details - Hide in resignature mode */}
          {!isResignatureMode && (
          <OnboardingCard>
            <OnboardingSectionHeader
              step={4}
              title="Bank details"
              description="Salary will be paid to this account. Upload a cancelled cheque so we can match the details."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <OnboardingField label="Account holder name" htmlFor="accountHolder" required>
                <Input
                  id="accountHolder"
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
                  className={onboardingControlClass}
                  autoComplete="name"
                />
              </OnboardingField>
              <OnboardingField label="Account number" htmlFor="accountNumber" required>
                <Input
                  id="accountNumber"
                  type="text"
                  inputMode="numeric"
                  placeholder="Bank account number"
                  value={bankDetails.accountNumber}
                  onChange={(e) =>
                    setBankDetails((prev) => ({
                      ...prev,
                      accountNumber: e.target.value,
                    }))
                  }
                  required
                  className={onboardingControlClass}
                  autoComplete="off"
                />
              </OnboardingField>
              <OnboardingField label="IFSC code" htmlFor="ifsc" required>
                <Input
                  id="ifsc"
                  type="text"
                  placeholder="Bank IFSC code"
                  value={bankDetails.ifscCode}
                  onChange={(e) =>
                    setBankDetails((prev) => ({
                      ...prev,
                      ifscCode: e.target.value.toUpperCase(),
                    }))
                  }
                  required
                  className={onboardingControlClass}
                  autoComplete="off"
                />
              </OnboardingField>
              <OnboardingField label="Bank name" htmlFor="bankName" required>
                <Input
                  id="bankName"
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
                  className={onboardingControlClass}
                  autoComplete="organization"
                />
              </OnboardingField>
            </div>
            <div className="mt-5 border-t border-border pt-5">
              <OnboardingDocumentDropzone
                id="cancelledCheque"
                label="Cancelled cheque"
                file={documents.cancelledCheque}
                uploading={uploadingFiles.has("cancelledCheque")}
                locked={isDocumentLocked("cancelledCheque")}
                needsReupload={
                  isReuploadMode && reuploadDocuments.includes("cancelledCheque")
                }
                hint='Write “CANCELLED” across a cheque of this account. A clear photo is enough.'
                onChange={(e) => handleDocumentChange(e, "cancelledCheque")}
              />
            </div>
          </OnboardingCard>
          )}

          {/* Document Upload - Required - Hide in resignature mode */}
          {!isResignatureMode && (
          <OnboardingCard>
            <OnboardingSectionHeader
              step={5}
              title="Required documents"
              description="Use a well-lit photo or scan. The full document should be readable."
            />
            <div className="space-y-6">
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Identity
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <OnboardingDocumentDropzone
                    id="aadharCardFront"
                    label="Aadhaar Card - Front"
                    file={documents.aadharCardFront}
                    uploading={uploadingFiles.has("aadharCardFront")}
                    locked={isDocumentLocked("aadharCardFront")}
                    needsReupload={
                      isReuploadMode &&
                      reuploadDocuments.includes("aadharCardFront")
                    }
                    compact
                    onChange={(e) => handleDocumentChange(e, "aadharCardFront")}
                  />
                  <OnboardingDocumentDropzone
                    id="aadharCardBack"
                    label="Aadhaar Card - Back"
                    file={documents.aadharCardBack}
                    uploading={uploadingFiles.has("aadharCardBack")}
                    locked={isDocumentLocked("aadharCardBack")}
                    needsReupload={
                      isReuploadMode &&
                      reuploadDocuments.includes("aadharCardBack")
                    }
                    compact
                    onChange={(e) => handleDocumentChange(e, "aadharCardBack")}
                  />
                  <OnboardingDocumentDropzone
                    id="panCard"
                    label="PAN Card"
                    file={documents.panCard}
                    uploading={uploadingFiles.has("panCard")}
                    locked={isDocumentLocked("panCard")}
                    needsReupload={
                      isReuploadMode && reuploadDocuments.includes("panCard")
                    }
                    compact
                    onChange={(e) => handleDocumentChange(e, "panCard")}
                  />
                </div>
              </section>
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Education
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(
                    [
                      {
                        key: "highSchoolMarksheet" as const,
                        label: "High School Marksheet",
                      },
                      {
                        key: "interMarksheet" as const,
                        label: "Intermediate Marksheet",
                      },
                      {
                        key: "graduationMarksheet" as const,
                        label: "Graduation Marksheet",
                      },
                    ] as const
                  ).map(({ key, label }) => (
                    <OnboardingDocumentDropzone
                      key={key}
                      id={key}
                      label={label}
                      file={documents[key]}
                      uploading={uploadingFiles.has(key)}
                      locked={isDocumentLocked(key)}
                      needsReupload={
                        isReuploadMode && reuploadDocuments.includes(key)
                      }
                      compact
                      onChange={(e) => handleDocumentChange(e, key)}
                    />
                  ))}
                </div>
              </section>
            </div>
          </OnboardingCard>
          )}

          {/* Experience Section - Hide in resignature mode */}
          {!isResignatureMode && (
          <OnboardingCard>
            <OnboardingSectionHeader
              step={6}
              title="Work experience"
              description="Enter 0 if this is your first job. Add a company for each previous employer."
            />
            
            {/* Years of Experience */}
            <OnboardingField
              label="Years of experience"
              htmlFor="yearsOfExperience"
              required
              hint="Use decimals if needed, e.g. 2.5"
            >
              <Input
                id="yearsOfExperience"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={yearsOfExperience}
                onChange={(e) => {
                  const value = e.target.value;
                  setYearsOfExperience(value);
                  if (value === "" || parseFloat(value) === 0) {
                    setCompanies([
                      {
                        id: Date.now().toString(),
                        companyName: "",
                        yearsInCompany: "",
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
                className={cn(onboardingControlClass, "max-w-xs")}
              />
            </OnboardingField>

            {/* Companies - Only show if experience > 0 */}
            {yearsOfExperience && parseFloat(yearsOfExperience) > 0 ? (
              <div className="mt-5 space-y-4">
              {companies.map((company, index) => {
                const isUploadingExp = uploadingFiles.has(`company-${company.id}-experienceLetter`);
                const isUploadingRel = uploadingFiles.has(`company-${company.id}-relievingLetter`);
                const isUploadingSal = uploadingFiles.has(`company-${company.id}-salarySlip`);

                return (
                  <div
                    key={company.id}
                    className="rounded-xl border border-border bg-muted/30 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        Company {index + 1}
                      </h3>
                      {companies.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCompany(company.id)}
                          className="min-h-11 gap-1.5 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      <OnboardingField
                        label="Company name"
                        htmlFor={`company-name-${company.id}`}
                        required
                      >
                        <Input
                          id={`company-name-${company.id}`}
                          type="text"
                          placeholder="Previous employer"
                          value={company.companyName}
                          onChange={(e) =>
                            updateCompany(company.id, {
                              companyName: e.target.value,
                            })
                          }
                          required
                          className={onboardingControlClass}
                        />
                      </OnboardingField>

                      <OnboardingField
                        label="Years at this company"
                        htmlFor={`company-years-${company.id}`}
                        required
                      >
                        <Input
                          id={`company-years-${company.id}`}
                          type="number"
                          inputMode="decimal"
                          placeholder="e.g. 2.5"
                          value={company.yearsInCompany}
                          onChange={(e) =>
                            updateCompany(company.id, {
                              yearsInCompany: e.target.value,
                            })
                          }
                          min="0"
                          step="0.1"
                          required
                          className={cn(onboardingControlClass, "max-w-xs")}
                        />
                      </OnboardingField>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <OnboardingField
                          label="HR phone"
                          htmlFor={`company-hr-phone-${company.id}`}
                          required
                        >
                          <Input
                            id={`company-hr-phone-${company.id}`}
                            type="tel"
                            inputMode="tel"
                            placeholder="HR phone number"
                            value={company.hrPhone}
                            onChange={(e) =>
                              updateCompany(company.id, { hrPhone: e.target.value })
                            }
                            required
                            className={onboardingControlClass}
                          />
                        </OnboardingField>
                        <OnboardingField
                          label="HR email"
                          htmlFor={`company-hr-email-${company.id}`}
                          required
                        >
                          <Input
                            id={`company-hr-email-${company.id}`}
                            type="email"
                            placeholder="HR email address"
                            value={company.hrEmail}
                            onChange={(e) =>
                              updateCompany(company.id, { hrEmail: e.target.value })
                            }
                            required
                            className={onboardingControlClass}
                          />
                        </OnboardingField>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <OnboardingDocumentDropzone
                          id={`company-${company.id}-experienceLetter`}
                          label="Experience letter"
                          file={company.experienceLetter}
                          uploading={isUploadingExp}
                          compact
                          onChange={(e) =>
                            handleCompanyDocumentChange(
                              e,
                              company.id,
                              "experienceLetter"
                            )
                          }
                        />
                        <OnboardingDocumentDropzone
                          id={`company-${company.id}-relievingLetter`}
                          label="Relieving letter"
                          file={company.relievingLetter}
                          uploading={isUploadingRel}
                          compact
                          onChange={(e) =>
                            handleCompanyDocumentChange(
                              e,
                              company.id,
                              "relievingLetter"
                            )
                          }
                        />
                        <OnboardingDocumentDropzone
                          id={`company-${company.id}-salarySlip`}
                          label="Salary slip"
                          file={company.salarySlip}
                          uploading={isUploadingSal}
                          compact
                          onChange={(e) =>
                            handleCompanyDocumentChange(
                              e,
                              company.id,
                              "salarySlip"
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={addCompany}
                className="h-11 w-full border-dashed"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add another company
              </Button>
            </div>
            ) : yearsOfExperience && parseFloat(yearsOfExperience) === 0 ? (
              <p className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-sm leading-6 text-muted-foreground">
                No previous employer details are needed when experience is 0.
              </p>
            ) : null}
          </OnboardingCard>
          )}


          <OnboardingCard>
            <OnboardingSectionHeader
              step={7}
              title="Agreement preview"
              description={
                signedPdfUrl
                  ? "This is the signed document that will be saved with your onboarding."
                  : "Generate the agreement, then open it on your phone to read before you sign."
              }
            />
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {!signedPdfUrl && !unsignedPdfUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateUnsignedPdf}
                    disabled={generatingPdf}
                    className="h-11 w-full sm:w-auto"
                  >
                    {generatingPdf ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Generate preview
                      </>
                    )}
                  </Button>
                ) : null}

                {signedPdfUrl || unsignedPdfUrl ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full sm:w-auto"
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
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download {signedPdfUrl ? "signed PDF" : "PDF"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full sm:w-auto"
                      onClick={() => setShowPdfPreview(true)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View larger
                    </Button>
                  </>
                ) : null}
              </div>

              {generatingPdf ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Generating document…</p>
                </div>
              ) : null}

              {!generatingPdf && (signedPdfUrl || unsignedPdfUrl) ? (
                <OnboardingPdfPreview
                  url={signedPdfUrl || unsignedPdfUrl || ""}
                  title={signedPdfUrl ? "Signed agreement" : "Agreement preview"}
                />
              ) : null}

              {!generatingPdf && !signedPdfUrl && !unsignedPdfUrl ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">
                    Generate a preview to review the agreement.
                  </p>
                </div>
              ) : null}
            </div>
          </OnboardingCard>

          <OnboardingCard className="space-y-5">
            <OnboardingSectionHeader
              step={8}
              title="Terms and signature"
              description="Read the terms, then draw or upload your signature."
            />

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTermsModalOpen(true)}
                className="h-11 w-full"
              >
                View terms and conditions
              </Button>

              <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-input"
                  required
                />
                <span className="text-sm leading-6 text-foreground">
                  I have read and agree to the terms and conditions
                </span>
              </label>
            </div>

            <div className="border-t border-border pt-5">
              <p className="mb-3 text-sm font-medium text-foreground">Signature</p>
              <OnboardingSegmented
                value={useDigitalSignature ? "draw" : "upload"}
                onChange={(next) => {
                  setUseDigitalSignature(next === "draw");
                  if (next === "draw") setShowSignaturePad(false);
                }}
                options={[
                  { value: "draw", label: "Draw" },
                  { value: "upload", label: "Upload" },
                ]}
              />
            </div>

            {useDigitalSignature ? (
              <div className="space-y-3">
                {!showSignaturePad ? (
                  signature ? (
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <img
                        src={signature.url || "/placeholder.svg"}
                        alt="Digital signature preview"
                        className="max-h-40 w-full object-contain"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSignature(null);
                          setShowSignaturePad(true);
                        }}
                        className="mt-3 h-11 w-full"
                      >
                        Redraw signature
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="h-11 w-full"
                    >
                      Start drawing signature
                    </Button>
                  )
                ) : (
                  <>
                    <SignaturePad onSignatureCapture={handleSignatureCapture} />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelSignaturePad}
                      className="h-11 w-full"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <OnboardingSignaturePhotoGuide />
                <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-5 text-sm font-medium text-foreground">
                  <span className="flex items-center gap-2">
                    {signature ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        {signature.name}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload the transparent PNG
                      </>
                    )}
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleSignatureChange}
                    className="sr-only"
                    disabled={uploadingFiles.has("signature")}
                    required
                  />
                </label>
              </div>
            )}
          </OnboardingCard>
        </form>

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

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>
              {isReuploadMode ? "Confirm document re-upload" : "Confirm submission"}
            </DialogTitle>
            <DialogDescription>
              {isReuploadMode
                ? "Submit the re-uploaded documents? HR will be notified and will review them shortly."
                : "Submit your onboarding details? You will not be able to change them after this."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setShowConfirmDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={handleConfirmSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isReuploadMode ? "Submitting…" : "Submitting…"}
                </>
              ) : isReuploadMode ? (
                "Submit documents"
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-h-[90vh] max-w-5xl bg-card">
          <DialogHeader>
            <DialogTitle>
              {signedPdfUrl ? "Signed onboarding document" : "Onboarding document preview"}
            </DialogTitle>
            <DialogDescription>
              {signedPdfUrl
                ? "This signed document will be saved after submission."
                : "Review the unsigned document before signing."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 overflow-hidden rounded-xl border border-border bg-muted/30">
            {(signedPdfUrl || unsignedPdfUrl) && (
              <iframe
                src={signedPdfUrl || unsignedPdfUrl || ""}
                className="h-[50vh] w-full border-0 sm:h-[70vh]"
                title={signedPdfUrl ? "Signed Onboarding Document" : "Onboarding Document Preview"}
              />
            )}
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {(unsignedPdfUrl || signedPdfUrl) && (
              <Button
                type="button"
                variant="outline"
                className="h-11"
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
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            )}
            <Button
              type="button"
              className="h-11"
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
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </OnboardingPageShell>
  );
}
