"use client";

import { useEffect, useRef } from "react";
import { FileText, Loader2, Plus, X } from "lucide-react";

import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  assignNumberedKeys,
  getSortedLeadDocumentEntries,
  isAllowedLeadDocumentType,
  isPdfUrl,
  MAX_LEAD_DOCUMENTS,
} from "@/util/leadDocuments";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LeadDocumentsUploadProps {
  value: Record<string, string>;
  onChange: (docs: Record<string, string>) => void;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
}

export function LeadDocumentsUpload({
  value,
  onChange,
  onUploadingChange,
  disabled = false,
}: LeadDocumentsUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles, loading } = useBunnyUpload();
  const entries = getSortedLeadDocumentEntries(value);
  const atLimit = entries.length >= MAX_LEAD_DOCUMENTS;

  useEffect(() => {
    onUploadingChange?.(loading);
  }, [loading, onUploadingChange]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    const files = Array.from(fileList);

    for (const file of files) {
      if (!isAllowedLeadDocumentType(file)) {
        toast({
          variant: "destructive",
          description: "JPEG, PNG, WebP, or PDF only.",
        });
        e.target.value = "";
        return;
      }
      if (file.size / 1024 / 1024 > 20) {
        toast({
          variant: "destructive",
          description: "Max 20MB per file.",
        });
        e.target.value = "";
        return;
      }
    }

    if (entries.length + files.length > MAX_LEAD_DOCUMENTS) {
      toast({
        variant: "destructive",
        description: `Max ${MAX_LEAD_DOCUMENTS} documents.`,
      });
      e.target.value = "";
      return;
    }

    try {
      const { imageUrls, error } = await uploadFiles(files, "LeadDocuments");
      if (error) {
        toast({ variant: "destructive", description: error });
        return;
      }

      const successfulUrls = imageUrls.filter((url) => Boolean(url));
      if (successfulUrls.length === 0) {
        toast({
          variant: "destructive",
          description: "Upload failed. Try again.",
        });
        return;
      }

      const existingUrls = entries.map((entry) => entry.url);
      onChange(assignNumberedKeys([...existingUrls, ...successfulUrls]));
      toast({ description: `${successfulUrls.length} file(s) added.` });
    } catch {
      toast({
        variant: "destructive",
        description: "Upload failed.",
      });
    } finally {
      e.target.value = "";
    }
  };

  const removeDocument = (key: string) => {
    const remaining = entries
      .filter((entry) => entry.key !== key)
      .map((entry) => entry.url);
    onChange(assignNumberedKeys(remaining));
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-medium text-muted-foreground">
            Documents
            <span className="ml-1.5 tabular-nums text-foreground/60">
              ({entries.length}/{MAX_LEAD_DOCUMENTS})
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground hidden sm:block">
            Image or PDF · max 20MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          disabled={disabled || loading}
          onChange={handleFileChange}
        />

        <div className="flex flex-wrap gap-2">
          {entries.map(({ key, url }) => (
            <div
              key={key}
              className="group relative h-14 w-14 shrink-0 rounded-md border bg-muted/30 overflow-hidden"
            >
              {isPdfUrl(url) ? (
                <div className="flex h-full w-full items-center justify-center">
                  <FileText className="h-6 w-6 text-red-500" aria-hidden />
                </div>
              ) : (
                <img
                  src={url}
                  alt={`Document ${key}`}
                  className="h-full w-full object-cover"
                />
              )}
              <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-[9px] text-center text-white py-0.5">
                {key}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full shadow-sm sm:opacity-90"
                disabled={disabled || loading}
                onClick={() => removeDocument(key)}
                aria-label={`Remove document ${key}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {!atLimit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={disabled || loading}
                  onClick={() => inputRef.current?.click()}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="Add documents"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Add images or PDFs
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
