"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, AlertCircle, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { useToast } from "@/hooks/use-toast";
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
  };
  trainingAgreementDetails?: {
    signingLink: string;
    eSign: {
      signatureImage: string;
      signedAt: string;
    };
    signedPdfUrl: string;
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
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
    <div className="w-full max-w-4xl space-y-6">
      <div className="text-center space-y-4">
        <div className="h-10 bg-gray-200 rounded-lg w-3/4 mx-auto animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-2/3 mx-auto animate-pulse" />
      </div>
      <div className="space-y-3 p-6 bg-white rounded-lg border border-gray-100 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-full" />
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

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const response = await fetch(`/api/candidates/${candidateId}`);
        const result = await response.json();

        if (result.success) {
          setCandidate(result.data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Request PDF from API
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

      // Download PDF for user
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pre-Employment-Training-Agreement-${candidateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

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
      setCandidate(trainingAgreementRes.data.data);

      toast({
        title: "Success",
        description: "Training agreement signed and submitted successfully",
      });

      setTimeout(() => {
        router.push(`/dashboard/candidatePortal/${candidateId}`);
      }, 2000);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
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

  if (candidate.trainingAgreementDetails?.agreementComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">
              Training Agreement Already Signed
            </p>
            <p className="text-muted-foreground mb-4">
              You have already signed the training agreement.
            </p>
            <Button onClick={() => router.push(`/dashboard/candidatePortal/${candidateId}`)}>
              Go Back
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-3">
            Pre-Employment Training Agreement
          </h1>
          <p className="text-lg text-muted-foreground">
            Please review and sign the training agreement
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-300 rounded-lg flex items-center gap-3 shadow-sm">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">
                Training agreement signed successfully!
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
          {/* Candidate Information */}
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
                  Position
                </p>
                <p className="text-base font-semibold text-foreground">
                  {candidate.position}
                </p>
              </div>
            </div>
          </Card>

          {/* Training Agreement Content Preview */}
          <Card className="p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
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
          <Card className="p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Digital Signature
              </h2>
            </div>
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
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={submitting || !signature || uploadingSignature}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {submitting ? (
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
      </div>
    </div>
  );
}


