"use client";

import { useState } from "react";
import {
  Download,
  ExternalLink,
  Eye,
  FileImage,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  MY_DOCUMENT_CATEGORY_LABELS,
  suggestedDownloadName,
  type MyDocumentItem,
} from "@/lib/people/my-documents";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Download failed");
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}

export function MyDocumentCard({ item }: { item: MyDocumentItem }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const firstUrl = item.urls[0] ?? "";
  const isPdf = item.fileKind === "pdf" || firstUrl.toLowerCase().includes(".pdf");
  const uploadedLabel = formatDate(item.uploadedAt);

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      for (let index = 0; index < item.urls.length; index += 1) {
        const url = item.urls[index];
        await downloadFile(url, suggestedDownloadName(item, url, index));
      }
      toast.success(item.urls.length > 1 ? "Downloads started" : "Download started");
    } catch {
      toast.error("Could not download this file");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <article className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="relative aspect-[4/3] overflow-hidden bg-muted/50 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Preview ${item.label}`}
        >
          {isPdf ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20">
              <FileText className="mb-1 h-10 w-10 text-red-500/70" />
              <span className="text-[10px] font-medium uppercase text-red-600/80">
                PDF
              </span>
            </div>
          ) : thumbnailError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
              <FileImage className="mb-1 h-10 w-10 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground">
                Preview unavailable
              </span>
            </div>
          ) : (
            <img
              src={firstUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setThumbnailError(true)}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
            <Eye className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          {item.urls.length > 1 && (
            <div className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {item.urls.length} files
            </div>
          )}
        </button>

        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
              {item.label}
            </h3>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {MY_DOCUMENT_CATEGORY_LABELS[item.category]}
            </Badge>
          </div>
          {item.details && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{item.details}</p>
          )}
          {uploadedLabel && (
            <p className="text-[11px] text-muted-foreground">{uploadedLabel}</p>
          )}
          <div className="mt-auto flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 min-h-11 flex-1 sm:min-h-9"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Preview
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 min-h-11 flex-1 sm:min-h-9"
              onClick={() => void handleDownloadAll()}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              Download
            </Button>
          </div>
        </div>
      </article>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex max-h-[95vh] max-w-5xl flex-col overflow-hidden">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="pr-8 text-lg">{item.label}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            {item.urls.map((url, idx) => (
              <div key={`${item.id}-${idx}`} className="space-y-3">
                {item.urls.length > 1 && (
                  <div className="flex items-center justify-between px-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      File {idx + 1} of {item.urls.length}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() =>
                          void downloadFile(
                            url,
                            suggestedDownloadName(item, url, idx)
                          )
                        }
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        New tab
                      </Button>
                    </div>
                  </div>
                )}
                <div className="overflow-hidden rounded-lg border bg-muted/50">
                  {url.toLowerCase().includes(".pdf") || item.fileKind === "pdf" ? (
                    <iframe
                      src={`${url}#toolbar=0`}
                      className="h-[65vh] w-full border-0"
                      title={`${item.label} ${idx + 1}`}
                    />
                  ) : (
                    <div className="flex items-center justify-center bg-black/5 p-4">
                      <img
                        src={url}
                        alt={`${item.label} ${idx + 1}`}
                        className="max-h-[65vh] w-auto max-w-full rounded object-contain"
                      />
                    </div>
                  )}
                </div>
                {item.urls.length > 1 && idx < item.urls.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => void handleDownloadAll()}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => window.open(firstUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open in new tab
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
