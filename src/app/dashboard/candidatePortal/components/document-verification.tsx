"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Eye, Download, ExternalLink, FileImage, FileText as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface DocumentVerificationProps {
  documentType: string;
  documentUrl: string | string[] | null;
  verified: boolean;
  verifiedBy?: string | null;
  verifiedAt?: string | Date | null;
  canVerify: boolean;
  onVerifyChange: (documentType: string, verified: boolean) => Promise<void>;
  label: string;
}

export function DocumentVerification({
  documentType,
  documentUrl,
  verified,
  verifiedBy,
  verifiedAt,
  canVerify,
  onVerifyChange,
  label,
}: DocumentVerificationProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  const handleVerify = async (closeModal = false) => {
    if (!canVerify || verified) return;
    setIsUpdating(true);
    try {
      await onVerifyChange(documentType, true);
      toast.success("Document verified successfully");
      if (closeModal) {
        setPreviewOpen(false);
      }
    } catch (error) {
      toast.error("Failed to verify document");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownload = (url: string) => {
    window.open(url, "_blank");
  };

  const hasDocument = documentUrl && (
    Array.isArray(documentUrl) ? documentUrl.length > 0 : true
  );

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

  const documentUrls = Array.isArray(documentUrl) ? documentUrl : [documentUrl].filter(Boolean);
  const firstUrl = documentUrls[0] || "";
  const isPdf = firstUrl?.toLowerCase().includes(".pdf");

  if (!hasDocument) {
    return (
      <div className="flex flex-col items-center justify-center p-3 border border-dashed rounded-lg bg-muted/30 min-h-[140px]">
        <FileIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground/70">Not uploaded</p>
      </div>
    );
  }

  return (
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <div className="group relative flex flex-col border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow">
        {/* Thumbnail Preview */}
        <DialogTrigger asChild>
          <button className="relative aspect-[4/3] bg-muted/50 overflow-hidden cursor-pointer">
            {isPdf ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20">
                <FileIcon className="h-10 w-10 text-red-500/70 mb-1" />
                <span className="text-[10px] font-medium text-red-600/80 uppercase">PDF</span>
              </div>
            ) : thumbnailError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                <FileImage className="h-10 w-10 text-muted-foreground/50 mb-1" />
                <span className="text-[10px] text-muted-foreground">Preview unavailable</span>
              </div>
            ) : (
              <img
                src={firstUrl}
                alt={label}
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setThumbnailError(true)}
              />
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {/* Multiple files indicator */}
            {documentUrls.length > 1 && (
              <div className="absolute top-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                +{documentUrls.length - 1}
              </div>
            )}
          </button>
        </DialogTrigger>

        {/* Document Info */}
        <div className="p-2.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{label}</p>
          </div>

          {/* Status */}
          {verified ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-green-700 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-md">
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-[11px] font-medium truncate">Verified</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <div className="text-xs space-y-0.5">
                    <p className="font-medium">{verifiedBy || "HR Team"}</p>
                    <p className="text-muted-foreground">{formatDate(verifiedAt)}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : canVerify ? (
            <Button
              size="sm"
              onClick={() => handleVerify()}
              disabled={isUpdating}
              className="w-full h-7 text-xs"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verify
                </>
              )}
            </Button>
          ) : (
            <Badge variant="outline" className="w-full justify-center text-[10px] h-7 text-amber-600 border-amber-200 bg-amber-50">
              Pending Verification
            </Badge>
          )}
        </div>
      </div>

      {/* Full Document Viewer Dialog */}
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="text-lg">{label}</span>
            {verified && (
              <Badge className="bg-green-100 text-green-800 border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {documentUrls.map((url, idx) => (
            <div key={idx} className="space-y-3">
              {documentUrls.length > 1 && (
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Document {idx + 1} of {documentUrls.length}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(url || "")}
                      className="h-7 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(url || "", "_blank")}
                      className="h-7 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      New Tab
                    </Button>
                  </div>
                </div>
              )}
              <div className="border rounded-lg overflow-hidden bg-muted/50">
                {url?.toLowerCase().includes(".pdf") ? (
                  <iframe
                    src={`${url}#toolbar=0`}
                    className="w-full h-[65vh] border-0"
                    title={`${label} ${idx + 1}`}
                  />
                ) : (
                  <div className="flex items-center justify-center p-4 bg-black/5">
                    <img
                      src={url || ""}
                      alt={`${label} ${idx + 1}`}
                      className="max-w-full h-auto max-h-[65vh] object-contain rounded"
                    />
                  </div>
                )}
              </div>
              {documentUrls.length > 1 && idx < documentUrls.length - 1 && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </div>

        <div className="pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(firstUrl)}
              className="h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(firstUrl, "_blank")}
              className="h-8"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open in New Tab
            </Button>
          </div>
          
          {canVerify && !verified && (
            <Button
              onClick={() => handleVerify(true)}
              disabled={isUpdating}
              className="min-w-[120px] h-8"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Verify Document
                </>
              )}
            </Button>
          )}
          
          {verified && (
            <div className="text-xs text-muted-foreground text-right">
              <p>Verified by <span className="font-medium text-foreground">{verifiedBy || "HR Team"}</span></p>
              <p>{formatDate(verifiedAt)}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
