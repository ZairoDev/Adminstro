"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

type ShareJobButtonProps = {
  title: string;
  slug: string;
  className?: string;
};

export function ShareJobButton({ title, slug, className }: ShareJobButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/careers/${slug}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title,
          text: `${title} at Zairo International`,
          url,
        });
        return;
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Unable to copy job link:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      className={
        className ??
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      }
      aria-live="polite"
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
      {copied ? "Link copied" : "Share job"}
    </button>
  );
}
