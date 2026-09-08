"use client";

import type React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function OnboardingPageShell({
  children,
  footer,
  narrow = false,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-[#f6f3ee] dark:bg-background">
      <div
        className={cn(
          "mx-auto w-full px-4 pt-5 sm:px-6 sm:pt-10",
          narrow ? "max-w-lg" : "max-w-2xl sm:max-w-3xl",
          footer ? "pb-[calc(7.5rem+env(safe-area-inset-bottom))]" : "pb-10"
        )}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}

export function OnboardingHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6 sm:mb-8">
      {eyebrow ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground sm:text-base">
        {description}
      </p>
    </header>
  );
}

export function OnboardingAlert({
  tone,
  title,
  children,
}: {
  tone: "success" | "error" | "warning" | "info";
  title: string;
  children?: React.ReactNode;
}) {
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "error"
        ? AlertCircle
        : Info;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-5 flex gap-3 rounded-xl border px-4 py-3.5",
        tone === "success" &&
          "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-900 dark:text-emerald-100",
        tone === "error" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "warning" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
        tone === "info" && "border-border bg-card text-foreground"
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-5">{title}</p>
        {children ? (
          <div className="mt-1 text-sm leading-5 opacity-90">{children}</div>
        ) : null}
      </div>
    </div>
  );
}

export function OnboardingCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6",
        className
      )}
    >
      {children}
    </section>
  );
}

export function OnboardingField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium leading-5 text-foreground"
      >
        {label}
        {required ? (
          <span className="ml-1 text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-sm leading-5 text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function OnboardingFact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/50 px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium leading-5 text-foreground">
        {value || "—"}
      </p>
    </div>
  );
}

export function OnboardingSegmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-lg px-3 text-sm font-medium transition-colors duration-200",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function OnboardingStickyBar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl px-4 py-3 sm:max-w-3xl sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}

export const onboardingControlClass =
  "h-11 w-full text-base sm:text-sm";

const SIGNATURE_PHOTO_STEPS = [
  {
    title: "Sign on blank white paper",
    body: "Use a black or blue pen. Keep the paper in portrait — taller than it is wide. Sign once, clearly, with no extra marks.",
  },
  {
    title: "Photograph in portrait",
    body: "Hold the phone upright. Fill the frame with the signature. Use even light, keep the paper flat, and avoid shadows, glare, or anything else in the shot.",
  },
  {
    title: "Remove the background",
    body: "The paper must not appear in the file you upload. Open remove.bg, upload the photo, and download the PNG with a transparent background so only the ink remains.",
  },
  {
    title: "Upload that PNG here",
    body: "Use the transparent file from remove.bg — not the original camera photo.",
  },
] as const;

export function OnboardingSignaturePhotoGuide() {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="mb-4 flex items-start gap-3">
        <div
          className="mt-0.5 flex h-12 w-8 shrink-0 flex-col items-center justify-end rounded-[6px] border-2 border-foreground/80 bg-background pb-1.5 pt-1"
          aria-hidden
        >
          <svg
            viewBox="0 0 24 12"
            className="h-3.5 w-5 text-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          >
            <path d="M2 9c2.5-5 5-7 8-4 2.5 2.5 4 1 6-2 1.5-2 4-1 6 2" />
          </svg>
          <span className="mt-1 h-1 w-2.5 rounded-full bg-foreground/50" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Photo setup for your signature
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Portrait photo, no background. Only the signature ink should be
            visible.
          </p>
        </div>
      </div>

      <ol className="space-y-3.5">
        {SIGNATURE_PHOTO_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium leading-5 text-foreground">
                {step.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {step.body}
              </p>
              {index === 2 ? (
                <a
                  href="https://www.remove.bg/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground"
                >
                  Open remove.bg
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function OnboardingPdfPreview({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Open
        </a>
      </div>
      <iframe
        src={url}
        title={title}
        className="hidden h-72 w-full border-0 bg-background sm:block"
      />
      <p className="px-4 py-5 text-center text-sm leading-6 text-muted-foreground sm:hidden">
        Open the document to review it on this device. Large PDFs are easier to
        read in a dedicated viewer.
      </p>
    </div>
  );
}

export function OnboardingProgress({
  complete,
  total,
}: {
  complete: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((complete / total) * 100);
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {complete} of {total} sections complete
        </span>
        <span>{pct}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
