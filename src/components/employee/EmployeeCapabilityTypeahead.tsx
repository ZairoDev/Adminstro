"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import axios from "@/util/axios";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type CapabilityOption = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle?: string;
  employeeCode?: string | null;
};

type Props = {
  capability: "trainer" | "reportingManager";
  label: string;
  optional?: boolean;
  value: CapabilityOption | null;
  onChange: (next: CapabilityOption | null) => void;
  excludeId?: string;
  className?: string;
  placeholder?: string;
};

export function EmployeeCapabilityTypeahead({
  capability,
  label,
  optional = true,
  value,
  onChange,
  excludeId,
  className,
  placeholder,
}: Props) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CapabilityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (value) {
      setQuery("");
      setOptions([]);
      setOpen(false);
    }
  }, [value?.id]);

  useEffect(() => {
    if (value) return;
    const q = query.trim();
    if (q.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          capability,
          q,
          ...(excludeId ? { excludeId } : {}),
        });
        const res = await axios.get(
          `/api/employee/search-capability?${params.toString()}`,
        );
        setOptions(Array.isArray(res.data?.data) ? res.data.data : []);
        setOpen(true);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, capability, excludeId, value]);

  if (value) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label>
          {label}
          {optional ? (
            <span className="text-muted-foreground font-normal"> (optional)</span>
          ) : null}
        </Label>
        <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 bg-background">
          <div className="min-w-0 flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{value.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[value.jobTitle || value.role, value.email]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Clear selection"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 relative", className)} ref={wrapRef}>
      <Label>
        {label}
        {optional ? (
          <span className="text-muted-foreground font-normal"> (optional)</span>
        ) : null}
      </Label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (options.length > 0) setOpen(true);
          }}
          placeholder={
            placeholder ||
            `Type at least 2 letters to find a ${
              capability === "trainer" ? "trainer" : "manager"
            }…`
          }
          className="w-full px-3 py-2 border border-muted rounded bg-background text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none h-11 text-sm"
          autoComplete="off"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {open && query.trim().length >= 2 ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
          {options.length === 0 && !loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No matches. Mark people as{" "}
              {capability === "trainer" ? "Trainer" : "Reporting Manager"} in
              Add-ons first.
            </p>
          ) : (
            options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                onClick={() => {
                  onChange(opt);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span className="font-medium">{opt.name}</span>
                <span className="block text-xs text-muted-foreground truncate">
                  {[opt.jobTitle || opt.role, opt.email]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Suggestions appear after you type. List stays empty until then.
      </p>
    </div>
  );
}
