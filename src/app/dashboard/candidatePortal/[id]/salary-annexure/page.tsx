"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Check, Download, Loader2, Upload } from "lucide-react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignaturePad } from "../../components/signature-pad";
import { SignaturePreviewModal } from "../../components/signature-preview-modal";

type AnnexureCandidate = {
  _id: string;
  name: string;
  email: string;
  position: string;
  status: string;
  employeeId?: string | null;
  selectionDetails?: {
    role?: string;
    signedSalaryAnnexurePdfUrl?: string | null;
  };
};

type UploadedFile = { url: string; name: string };

function canOpenAnnexure(candidate: AnnexureCandidate): boolean {
  return (
    candidate.status === "selected" ||
    candidate.status === "onboarding" ||
    Boolean(candidate.employeeId)
  );
}

function BrandLockup() {
  return (
    <div className="relative h-11 w-36 overflow-hidden bg-white">
      <img
        src="/Zairo.png"
        alt="Zairo International"
        className="absolute left-1/2 top-1/2 h-[210px] w-[168px] max-w-none -translate-x-1/2 -translate-y-1/2 bg-white"
      />
    </div>
  );
}

async function requestSalaryAnnexurePdf(options: {
  candidateId: string;
  signatureUrl?: string;
  signingDate?: string;
}): Promise<Blob> {
  const response = await axios.post(
    "/api/candidates/salaryAnnexure",
    {
      candidateId: options.candidateId,
      candidateSignatureBase64: options.signatureUrl,
      signingDate: options.signingDate,
    },
    { responseType: "arraybuffer", headers: { "Content-Type": "application/json" } },
  );
  const bytes = response.data as ArrayBuffer;
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  if (header.startsWith("%PDF")) return new Blob([bytes], { type: "application/pdf" });
  let message = "Failed to generate the salary annexure";
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { error?: string };
    if (parsed.error) message = parsed.error;
  } catch {
    // The response was not a PDF or a JSON error.
  }
  throw new Error(message);
}

function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(arr[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], filename, { type: mime });
}

export default function SalaryAnnexurePage() {
  const params = useParams();
  const candidateId = params?.id as string;
  const { uploadFiles } = useBunnyUpload();
  const { toast } = useToast();
  const prepared = useRef(false);

  const [candidate, setCandidate] = useState<AnnexureCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [annexureUrl, setAnnexureUrl] = useState<string | null>(null);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<UploadedFile | null>(null);
  const [showPad, setShowPad] = useState(false);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [useDigitalSignature, setUseDigitalSignature] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [emailed, setEmailed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/candidates/${candidateId}`);
        const result = await response.json();
        if (!result.success) {
          setError("This record could not be opened.");
          return;
        }
        const next = result.data as AnnexureCandidate;
        setCandidate(next);
        if (next.selectionDetails?.signedSalaryAnnexurePdfUrl) setSigned(true);
      } catch {
        setError("This record could not be opened.");
      } finally {
        setLoading(false);
      }
    };
    if (candidateId) void load();
  }, [candidateId]);

  useEffect(() => {
    if (loading || !candidate || signed || prepared.current) return;
    if (!canOpenAnnexure(candidate)) return;
    prepared.current = true;
    const preparePdf = async () => {
      setPreparingPdf(true);
      try {
        const blob = await requestSalaryAnnexurePdf({ candidateId: candidate._id });
        setAnnexureUrl(URL.createObjectURL(blob));
      } catch (prepareError) {
        setError(prepareError instanceof Error ? prepareError.message : "The salary annexure could not be prepared.");
      } finally {
        setPreparingPdf(false);
      }
    };
    void preparePdf();
  }, [loading, candidate, signed]);

  const saveSignatureFile = async (file: File) => {
    setUploadingSignature(true);
    try {
      const { imageUrls, error: uploadError } = await uploadFiles([file], "Documents/Signatures");
      if (uploadError || !imageUrls?.length) {
        toast({ title: "Upload failed", description: uploadError || "The signature could not be saved", variant: "destructive" });
        return;
      }
      setSignature({ url: imageUrls[0], name: file.name });
      setShowPad(false);
      setShowPreview(false);
      setPreviewSignature(null);
    } finally {
      setUploadingSignature(false);
    }
  };

  const submit = async () => {
    if (!candidate || !signature) return;
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);
    try {
      const signedBlob = await requestSalaryAnnexurePdf({
        candidateId: candidate._id,
        signatureUrl: signature.url,
        signingDate: new Date().toISOString(),
      });
      const file = new File([signedBlob], `Salary-Annexure-${candidateId}-Signed.pdf`, { type: "application/pdf" });
      const { imageUrls, error: uploadError } = await uploadFiles([file], "Documents/SignedPDFs");
      if (uploadError || !imageUrls?.length) {
        throw new Error("The signed salary annexure could not be uploaded");
      }
      const response = await axios.post(`/api/candidates/${candidateId}/salary-annexure`, {
        signature: signature.url,
        signedPdfUrl: imageUrls[0],
      });
      if (!response.data?.success) {
        throw new Error(response.data?.error || "The signed salary annexure could not be saved");
      }
      setEmailed(Boolean(response.data.emailSent));
      setSigned(true);
    } catch (submitError) {
      const message =
        axios.isAxiosError(submitError) && typeof submitError.response?.data?.error === "string"
          ? submitError.response.data.error
          : submitError instanceof Error
            ? submitError.message
            : "The salary annexure could not be signed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F8FAFC] text-sm text-[#475569]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading the salary annexure
      </div>
    );
  }

  if (!candidate || !canOpenAnnexure(candidate)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F8FAFC] p-6">
        <Card className="max-w-md border-[#E4E5E7] bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-[#B45309]" />
          <p className="text-base font-medium text-[#0F172A]">This salary annexure is not available.</p>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-dvh bg-[#F8FAFC]">
        <header className="border-b border-[#E4E5E7] bg-white">
          <div className="mx-auto flex h-16 max-w-xl items-center px-4">
            <BrandLockup />
          </div>
        </header>
        <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center p-4">
          <Card className="w-full max-w-lg border-[#E4E5E7] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#15803D]">
              <Check className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#0F172A]">Salary annexure signed</h1>
            <p className="mt-3 text-base leading-7 text-[#475569]">
              {emailed
                ? "The signed copy has been sent to your email."
                : "Your signature has been saved. HR will send the signed copy if it is not already in your inbox."}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F8FAFC] text-[#0F172A]">
      <header className="border-b border-[#E4E5E7] bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <BrandLockup />
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#64748B]">Salary annexure</p>
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Salary Annexure</h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[#475569]">
            Download the annexure, then sign. The signed copy is emailed to you. This page does not include the offer letter or the HR policies.
          </p>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <Card className="border-[#E4E5E7] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">1. Document</h2>
          <p className="mt-1 text-sm text-[#475569]">{candidate.name} · {candidate.selectionDetails?.role || candidate.position}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-11 border-[#E4E5E7]"
            disabled={!annexureUrl}
            onClick={() => {
              if (!annexureUrl) return;
              const link = document.createElement("a");
              link.href = annexureUrl;
              link.download = `Salary-Annexure-${candidateId}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            {preparingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download salary annexure
          </Button>
        </Card>

        <Card className="border-[#E4E5E7] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">2. Signature</h2>
          <div className="mt-4 flex gap-2 border-b border-[#E4E5E7] pb-4">
            <button
              type="button"
              onClick={() => setUseDigitalSignature(true)}
              className={`h-11 rounded-lg px-4 text-sm font-medium ${useDigitalSignature ? "bg-[#1E293B] text-white" : "text-[#475569] hover:bg-[#F8FAFC]"}`}
            >
              Draw
            </button>
            <button
              type="button"
              onClick={() => setUseDigitalSignature(false)}
              className={`h-11 rounded-lg px-4 text-sm font-medium ${!useDigitalSignature ? "bg-[#1E293B] text-white" : "text-[#475569] hover:bg-[#F8FAFC]"}`}
            >
              Upload
            </button>
          </div>
          <div className="mt-4">
            {useDigitalSignature ? (
              showPad ? (
                <div className="space-y-3">
                  <SignaturePad onSignatureCapture={(value) => { setPreviewSignature(value); setShowPreview(true); }} />
                  <Button type="button" variant="outline" className="h-11 w-full" onClick={() => setShowPad(false)}>Cancel</Button>
                </div>
              ) : signature ? (
                <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4">
                  <img src={signature.url} alt="Your signature" className="max-h-40 w-full object-contain" />
                  <Button type="button" variant="outline" className="mt-3 h-11 w-full" onClick={() => { setSignature(null); setShowPad(true); }}>
                    Redraw signature
                  </Button>
                </div>
              ) : (
                <Button type="button" className="h-11 w-full bg-[#1E293B] text-white hover:bg-[#0F172A]" onClick={() => setShowPad(true)}>
                  Draw signature
                </Button>
              )
            ) : (
              <label className="flex h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] text-sm text-[#475569] hover:bg-[#F8FAFC]">
                {uploadingSignature ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {signature ? signature.name : "Upload a signature image"}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  disabled={uploadingSignature}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void saveSignatureFile(file);
                  }}
                />
              </label>
            )}
          </div>
        </Card>

        <Button
          type="button"
          className="h-11 w-full bg-[#1E293B] text-white hover:bg-[#0F172A]"
          disabled={!signature || !annexureUrl || submitting || uploadingSignature}
          onClick={() => setConfirmOpen(true)}
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Sign and submit
        </Button>
      </div>

      <SignaturePreviewModal
        open={showPreview}
        signature={previewSignature || ""}
        onConfirm={() => {
          if (!previewSignature) return;
          void saveSignatureFile(base64ToFile(previewSignature, `signature-${Date.now()}.png`));
        }}
        onCancel={() => { setShowPreview(false); setPreviewSignature(null); }}
      />
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Sign the salary annexure?</DialogTitle>
            <DialogDescription>
              Your signature will be applied to the salary annexure, and the signed PDF will be emailed to you.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button type="button" className="bg-[#1E293B] text-white hover:bg-[#0F172A]" onClick={() => void submit()}>
              Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
