"use client";

import { useState, useEffect } from "react";
import {
  User,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  AlertCircle,
  Briefcase,
  Calendar,
  PenLine,
  Download,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DocumentVerification } from "./document-verification";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface OnboardingDetails {
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
    signedAt?: string | Date;
  };
  // Experience data - persisted from onboarding form
  yearsOfExperience?: string;
  companies?: Array<{
    companyName?: string;
    yearsInCompany?: string;
    experienceLetter?: string;
    relievingLetter?: string;
    salarySlip?: string;
    hrPhone?: string;
    hrEmail?: string;
  }>;
  // Signed PDF URL - authoritative document after signing
  // Once set, this should always be used instead of unsigned PDF
  signedPdfUrl?: string;
  termsAccepted?: boolean;
  termsAcceptedAt?: string | Date;
  onboardingComplete?: boolean;
  completedAt?: string | Date;
  verifiedByHR?: {
    verified: boolean;
    verifiedBy?: string | null;
    verifiedAt?: Date | string | null;
    notes?: string | null;
  };
}

interface SelectionDetails {
  positionType?: string;
  duration?: string;
  trainingPeriod?: string;
  role?: string;
  salary?: string;
}

interface OnboardingDetailsViewProps {
  onboardingDetails: OnboardingDetails | null | undefined;
  selectionDetails?: SelectionDetails;
  candidateId: string;
  canVerify: boolean;
  onUpdate?: () => void;
}

const DOCUMENT_LABELS: Record<string, string> = {
  aadharCard: "Aadhar Card", // Backward compatibility
  aadharCardFront: "Aadhar Card - Front",
  aadharCardBack: "Aadhar Card - Back",
  panCard: "PAN Card",
  highSchoolMarksheet: "High School Marksheet",
  interMarksheet: "Intermediate Marksheet",
  graduationMarksheet: "Graduation Marksheet",
  experienceLetter: "Experience Letter",
  relievingLetter: "Relieving Letter",
  salarySlips: "Salary Slips",
};

// Info row component for compact display
function InfoRow({ label, value, mono = false }: { label: string; value: string | undefined; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export function OnboardingDetailsView({
  onboardingDetails,
  selectionDetails,
  candidateId,
  canVerify,
  onUpdate,
}: OnboardingDetailsViewProps) {
  const [hrVerificationDialogOpen, setHrVerificationDialogOpen] = useState(false);
  const [hrVerificationNotes, setHrVerificationNotes] = useState("");
  const [isUpdatingHR, setIsUpdatingHR] = useState(false);

  useEffect(() => {
    if (onboardingDetails?.verifiedByHR?.notes) {
      setHrVerificationNotes(onboardingDetails.verifiedByHR.notes);
    }
  }, [onboardingDetails]);

  const handleDocumentVerify = async (documentType: string, verified: boolean) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}/verification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, verified }),
      });

      const result = await response.json();
      if (result.success) {
        if (onUpdate) onUpdate();
      } else {
        throw new Error(result.error || "Failed to update verification");
      }
    } catch (error: unknown) {
      console.error("Error updating document verification:", error);
      throw error;
    }
  };

  const handleHRVerification = async () => {
    setIsUpdatingHR(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/hr-verification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: true, notes: hrVerificationNotes || null }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Candidate verified by HR successfully");
        setHrVerificationDialogOpen(false);
        if (onUpdate) onUpdate();
      } else {
        throw new Error(result.error || "Failed to update HR verification");
      }
    } catch (error: unknown) {
      console.error("Error updating HR verification:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update HR verification";
      toast.error(errorMessage);
    } finally {
      setIsUpdatingHR(false);
    }
  };

  if (!onboardingDetails) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">No onboarding details available</p>
        </div>
      </Card>
    );
  }

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const allDocumentsVerified = () => {
    if (!onboardingDetails.documents || !onboardingDetails.documentVerification) {
      return false;
    }
    const documentTypes = Object.keys(onboardingDetails.documents).filter(
      (key) => onboardingDetails.documents?.[key as keyof typeof onboardingDetails.documents]
    );
    return documentTypes.every(
      (docType) => onboardingDetails.documentVerification?.[docType]?.verified === true
    );
  };

  const getVerifiedCount = () => {
    if (!onboardingDetails.documents || !onboardingDetails.documentVerification) {
      return { verified: 0, total: 0 };
    }
    const total = Object.keys(onboardingDetails.documents).filter(
      (key) => onboardingDetails.documents?.[key as keyof typeof onboardingDetails.documents]
    ).length;
    const verified = Object.values(onboardingDetails.documentVerification).filter((v) => v?.verified).length;
    return { verified, total };
  };

  const { verified: verifiedCount, total: totalDocs } = getVerifiedCount();

  return (
    <div className="space-y-4">
      {/* Top Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Onboarding Status */}
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${onboardingDetails.onboardingComplete ? "bg-green-100" : "bg-amber-100"}`}>
              {onboardingDetails.onboardingComplete ? (
                <CheckCircle2 className="h-4 w-4 text-green-700" />
              ) : (
                <Clock className="h-4 w-4 text-amber-700" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Onboarding</p>
              <p className="text-sm font-semibold">
                {onboardingDetails.onboardingComplete ? "Completed" : "In Progress"}
              </p>
            </div>
          </div>
        </Card>

        {/* Document Status */}
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${verifiedCount === totalDocs ? "bg-green-100" : "bg-blue-100"}`}>
              <FileText className={`h-4 w-4 ${verifiedCount === totalDocs ? "text-green-700" : "text-blue-700"}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Documents</p>
              <p className="text-sm font-semibold">{verifiedCount}/{totalDocs} Verified</p>
            </div>
          </div>
        </Card>

        {/* HR Verification Status */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${onboardingDetails.verifiedByHR?.verified ? "bg-green-100" : "bg-amber-100"}`}>
                {onboardingDetails.verifiedByHR?.verified ? (
                  <CheckCircle2 className="h-4 w-4 text-green-700" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-700" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">HR Verification</p>
                <p className="text-sm font-semibold">
                  {onboardingDetails.verifiedByHR?.verified ? "Verified" : "Pending"}
                </p>
              </div>
            </div>
            {canVerify && !onboardingDetails.verifiedByHR?.verified && onboardingDetails.onboardingComplete && (
              <Button
                size="sm"
                onClick={() => setHrVerificationDialogOpen(true)}
                disabled={!allDocumentsVerified()}
                className="h-7 text-xs"
              >
                Verify
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* HR Verified Info */}
      {onboardingDetails.verifiedByHR?.verified && (
        <Card className="p-3 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-green-800">Verified by HR</span>
                <span className="text-xs text-green-600">•</span>
                <span className="text-sm text-green-700">{onboardingDetails.verifiedByHR.verifiedBy || "HR Team"}</span>
                <span className="text-xs text-green-600">•</span>
                <span className="text-xs text-green-600">{formatDate(onboardingDetails.verifiedByHR.verifiedAt)}</span>
              </div>
              {onboardingDetails.verifiedByHR.notes && (
                <p className="text-xs text-green-700 mt-1">Note: {onboardingDetails.verifiedByHR.notes}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Pending documents warning */}
      {canVerify && !allDocumentsVerified() && !onboardingDetails.verifiedByHR?.verified && onboardingDetails.onboardingComplete && (
        <Card className="p-3 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-amber-800">
              Verify all {totalDocs - verifiedCount} remaining document{totalDocs - verifiedCount > 1 ? "s" : ""} to complete HR verification.
            </p>
          </div>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Personal & Role Info */}
        <div className="space-y-4">
          {/* Role & Selection Details */}
          {selectionDetails && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Role Details</h3>
              </div>
              <div className="space-y-0">
                <InfoRow label="Role" value={selectionDetails.role} />
                <InfoRow label="Position Type" value={selectionDetails.positionType} />
                <InfoRow label="Training Period" value={selectionDetails.trainingPeriod} />
                <InfoRow label="Duration" value={selectionDetails.duration} />
                <InfoRow label="Salary" value={selectionDetails.salary} />
              </div>
            </Card>
          )}

          {/* Personal Details */}
          {onboardingDetails.personalDetails && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Personal Details</h3>
              </div>
              <div className="space-y-0">
                <InfoRow label="Date of Birth" value={onboardingDetails.personalDetails.dateOfBirth} />
                <InfoRow label="Gender" value={onboardingDetails.personalDetails.gender} />
                <InfoRow label="Nationality" value={onboardingDetails.personalDetails.nationality} />
                <InfoRow label="Father's Name" value={onboardingDetails.personalDetails.fatherName} />
              </div>
            </Card>
          )}

          {/* Bank Details */}
          {onboardingDetails.bankDetails && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Bank Details</h3>
              </div>
              <div className="space-y-0">
                <InfoRow label="Account Holder" value={onboardingDetails.bankDetails.accountHolderName} />
                <InfoRow 
                  label="Account Number" 
                  value={onboardingDetails.bankDetails.accountNumber ? `****${onboardingDetails.bankDetails.accountNumber.slice(-4)}` : undefined} 
                  mono 
                />
                <InfoRow label="IFSC Code" value={onboardingDetails.bankDetails.ifscCode} mono />
                <InfoRow label="Bank Name" value={onboardingDetails.bankDetails.bankName} />
              </div>
            </Card>
          )}

          {/* Experience Details */}
          {onboardingDetails.yearsOfExperience && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Work Experience</h3>
              </div>
              <div className="space-y-0">
                <InfoRow 
                  label="Years of Experience" 
                  value={onboardingDetails.yearsOfExperience} 
                />
                {onboardingDetails.companies && onboardingDetails.companies.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Companies:</p>
                    {onboardingDetails.companies.map((company, index) => (
                      <div key={index} className="mb-3 last:mb-0 p-2 bg-muted/30 rounded text-xs">
                        <p className="font-medium">{company.companyName || `Company ${index + 1}`}</p>
                        {company.yearsInCompany && <p className="text-muted-foreground">Years in Company: {company.yearsInCompany}</p>}
                        {company.hrPhone && <p className="text-muted-foreground">HR Phone: {company.hrPhone}</p>}
                        {company.hrEmail && <p className="text-muted-foreground">HR Email: {company.hrEmail}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* E-Signature */}
          {onboardingDetails.eSign?.signatureImage && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <PenLine className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Digital Signature</h3>
              </div>
              <div className="border rounded-lg p-3 bg-muted/30">
                <img
                  src={onboardingDetails.eSign.signatureImage}
                  alt="Digital Signature"
                  className="max-h-16 w-auto"
                />
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Signed: {formatDate(onboardingDetails.eSign.signedAt)}</span>
              </div>
            </Card>
          )}

          {/* Signed PDF Document - CRITICAL: This is the authoritative document after signing */}
          {onboardingDetails.signedPdfUrl && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Signed Onboarding Document</h3>
                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                  Signed
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  This is the final signed onboarding document. Once signed, this version is authoritative.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(onboardingDetails.signedPdfUrl, "_blank")}
                    className="h-8"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    View PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = onboardingDetails.signedPdfUrl!;
                      a.download = `ZIPL-Service-Agreement-${candidateId}-Signed.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="h-8"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Documents */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Documents</h3>
            </div>
            <Badge 
              variant="outline" 
              className={`text-[10px] ${
                verifiedCount === totalDocs
                  ? "bg-green-50 text-green-700 border-green-200"
                  : ""
              }`}
            >
              {verifiedCount}/{totalDocs} verified
            </Badge>
          </div>

          {onboardingDetails.documents && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(onboardingDetails.documents).map(([key, value]) => {
                return (
                  <DocumentVerification
                    key={key}
                    documentType={key}
                    documentUrl={value || null}
                    verified={onboardingDetails.documentVerification?.[key]?.verified || false}
                    verifiedBy={onboardingDetails.documentVerification?.[key]?.verifiedBy || null}
                    verifiedAt={onboardingDetails.documentVerification?.[key]?.verifiedAt || null}
                    canVerify={canVerify}
                    onVerifyChange={handleDocumentVerify}
                    label={DOCUMENT_LABELS[key] || key}
                  />
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* HR Verification Dialog */}
      <Dialog open={hrVerificationDialogOpen} onOpenChange={setHrVerificationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete HR Verification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">All documents verified</span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                {totalDocs} document{totalDocs > 1 ? "s" : ""} have been reviewed and verified.
              </p>
            </div>
            <div>
              <Label htmlFor="notes" className="text-sm">Verification Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={hrVerificationNotes}
                onChange={(e) => setHrVerificationNotes(e.target.value)}
                placeholder="Add any notes about this verification..."
                className="mt-1.5 text-sm"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setHrVerificationDialogOpen(false)}
              disabled={isUpdatingHR}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleHRVerification}
              disabled={isUpdatingHR}
              size="sm"
            >
              {isUpdatingHR ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Complete Verification
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
