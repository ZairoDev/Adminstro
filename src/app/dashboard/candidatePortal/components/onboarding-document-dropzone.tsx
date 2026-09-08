"use client";

import type React from "react";
import { Check, Eye, FileText, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingUploadedFile {
  url: string;
  name: string;
}

interface OnboardingSectionHeaderProps {
  step: React.ReactNode;
  title: string;
  description?: string;
}

export function OnboardingSectionHeader({
  step,
  title,
  description,
}: OnboardingSectionHeaderProps) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {step}
      </div>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-lg font-semibold leading-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface OnboardingDocumentDropzoneProps {
  id: string;
  label: string;
  file: OnboardingUploadedFile | null;
  uploading: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  locked?: boolean;
  needsReupload?: boolean;
  hint?: string;
  compact?: boolean;
}

function looksLikeImage(file: OnboardingUploadedFile): boolean {
  return /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name) ||
    /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(file.url);
}

export function OnboardingDocumentDropzone({
  id,
  label,
  file,
  uploading,
  onChange,
  required = true,
  locked = false,
  needsReupload = false,
  hint,
  compact = false,
}: OnboardingDocumentDropzoneProps) {
  const disabled = uploading || locked;
  const uploaded = Boolean(file?.url);
  const inputId = `onboarding-doc-${id}`;

  return (
    <div className="space-y-2">
      <div className="flex min-h-6 flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
          {required ? (
            <span className="ml-1 text-destructive" aria-hidden>
              *
            </span>
          ) : null}
        </label>
        {uploading ? (
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
        {locked ? (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            Verified
          </span>
        ) : null}
        {needsReupload ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
            Re-upload required
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border transition-colors duration-200",
          locked &&
            "border-emerald-500/30 bg-emerald-500/5",
          !locked && needsReupload && !uploaded &&
            "border-amber-500/40 bg-amber-500/5",
          !locked && uploaded &&
            "border-emerald-500/35 bg-emerald-500/[0.06]",
          !locked && !uploaded &&
            "border-dashed border-border bg-muted/40",
          !disabled && !uploaded &&
            "hover:border-primary/40 hover:bg-muted/70",
          disabled && "opacity-70"
        )}
      >
        <label
          htmlFor={inputId}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 px-4 py-5 text-center",
            compact ? "min-h-[7rem] sm:min-h-[7.5rem]" : "min-h-[8rem]",
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          )}
        >
          {uploaded && file ? (
            <div className="flex w-full items-center gap-3 text-left">
              {looksLikeImage(file) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.url}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                  <FileText className="h-6 w-6 text-muted-foreground" aria-hidden />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  Uploaded
                </p>
                <p className="truncate text-xs text-muted-foreground">{file.name}</p>
                {!locked ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tap to replace
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-5 w-5" aria-hidden />
                )}
              </span>
              <span className="text-sm font-medium text-foreground">
                {uploading ? "Uploading…" : "Tap to upload"}
              </span>
              <span className="text-xs text-muted-foreground">PDF, JPG, or PNG</span>
            </>
          )}
        </label>
        <input
          id={inputId}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={onChange}
          className="sr-only"
          disabled={disabled}
          required={required && !uploaded}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {uploaded && file?.url ? (
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            View file
          </a>
        ) : null}
        {hint && !uploaded ? (
          <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
