"use client";

import { cn } from "@/lib/utils";

export function maskPeoplePhone(phone?: string | number | null): string {
  if (phone === undefined || phone === null) return "";
  const value = String(phone).trim();
  if (!value) return "";
  return `****${value.slice(-4)}`;
}

interface RevealablePhoneProps {
  phone?: string | number | null;
  revealed: boolean;
  onToggle: () => void;
  className?: string;
}

export function RevealablePhone({
  phone,
  revealed,
  onToggle,
  className,
}: RevealablePhoneProps) {
  const full = phone === undefined || phone === null ? "" : String(phone).trim();
  if (!full) {
    return <span>—</span>;
  }

  const masked = maskPeoplePhone(full);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      aria-pressed={revealed}
      aria-label={
        revealed
          ? `Hide phone number ${full}`
          : `Show phone number, currently ${masked}`
      }
      title={revealed ? "Click to hide" : "Click to show"}
      className={cn(
        "inline-flex min-h-8 cursor-pointer items-center rounded-sm text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        revealed && "text-foreground",
        className
      )}
    >
      {revealed ? full : masked}
    </button>
  );
}
