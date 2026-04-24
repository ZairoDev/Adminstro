"use client";

import { useState } from "react";
import { Phone, Mail, Copy, Check, ArrowBigRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactCellProps {
  phone?: string;
  email?: string;
  className?: string;
}

function CopyIcon({ value, icon: Icon }: { value: string; icon: React.ElementType }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silently fail */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${value}`}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {copied ? (
        <Check size={13} className="text-green-500" />
      ) : (
        <Icon size={13} />
      )}  
      {/* <ArrowBigRightIcon className="w-4 h-4" size={13} /> */}
      {/* <span className="max-w-[140px] truncate">{value}</span> */}
    </button>
  );
}

export function ContactCell({ phone, email, className }: ContactCellProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {phone && <CopyIcon value={phone} icon={Phone} />}
      {email && <CopyIcon value={email} icon={Mail} />}
    </div>
  );
}
