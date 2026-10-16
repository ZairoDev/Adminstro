import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const sheetFrameClass =
  "flex h-[calc(100dvh-7.5rem)] min-h-[32rem] flex-col bg-background";

export const sheetToolbarClass =
  "max-h-[46vh] flex-none space-y-4 overflow-y-auto border-b border-border bg-background px-4 py-4";

export const sheetScrollClass = "min-h-0 flex-1 overflow-auto";

export const sheetTableClass = "w-full border-collapse text-[13px]";

export const sheetThClass =
  "sticky top-0 z-10 whitespace-nowrap border-b border-border bg-muted px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export const sheetTdClass =
  "border-b border-border px-3 py-2.5 align-middle text-[13px] leading-5 text-foreground";

export const sheetFooterClass =
  "flex flex-none flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-4 py-3";

export function sheetRowClass(index: number, className?: string): string {
  return cn(
    "motion-safe:transition-colors hover:bg-muted/80",
    index % 2 === 0 ? "bg-background" : "bg-muted/30",
    className,
  );
}

export function FinanceSheetSkeleton() {
  return (
    <div className="flex-1 space-y-2 p-4" role="status" aria-live="polite">
      <span className="sr-only">Loading records</span>
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-11 w-full motion-reduce:animate-none" />
      ))}
    </div>
  );
}

export function FinanceSheetEmpty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-16">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

export function FinanceSheetError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-16" role="alert">
      <p className="text-base font-semibold text-foreground">Could not load this sheet</p>
      <p className="max-w-lg text-sm leading-6 text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-10 cursor-pointer items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}

export function SheetStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        tone === "warning"
          ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          : "border-border bg-muted/40",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
