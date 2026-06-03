"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  getSortedLeadDocumentEntries,
  isPdfUrl,
} from "@/util/leadDocuments";

interface LeadDocumentsViewerProps {
  documents: Record<string, string> | undefined;
}

export function LeadDocumentsViewer({ documents }: LeadDocumentsViewerProps) {
  const { toast } = useToast();
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const entries = getSortedLeadDocumentEntries(documents);

  if (entries.length === 0) return null;

  const handleDownloadOne = async (key: string, url: string) => {
    setDownloadingKey(key);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const path = url.split("?")[0] ?? "";
      const filename =
        path.split("/").pop() ||
        `document-${key}${isPdfUrl(url) ? ".pdf" : ""}`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast({
        variant: "destructive",
        description: `Could not download document ${key}.`,
      });
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      <Label className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
        Lead Documents
      </Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {entries.map(({ key, url }) => (
          <div
            key={key}
            className="rounded-md border bg-muted/20 p-2 flex flex-col gap-2"
          >
            <span className="text-xs font-medium text-muted-foreground">
              Document {key}
            </span>
            {isPdfUrl(url) ? (
              <Link
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline min-h-[4rem]"
              >
                <FileText className="h-8 w-8 text-red-600 shrink-0" />
                <span className="flex items-center gap-1">
                  View
                  <ExternalLink className="h-3 w-3" />
                </span>
              </Link>
            ) : (
              <Link
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={url}
                  alt={`Lead document ${key}`}
                  className="w-full h-24 rounded-md object-cover border"
                />
                <span className="mt-1 flex items-center gap-1 text-xs text-primary">
                  View
                  <ExternalLink className="h-3 w-3" />
                </span>
              </Link>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 justify-start px-2"
              disabled={downloadingKey === key}
              onClick={() => handleDownloadOne(key, url)}
            >
              {downloadingKey === key ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              Download
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
