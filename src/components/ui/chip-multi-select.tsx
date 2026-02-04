"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface ChipMultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  chipClassName?: string;
}

export function ChipMultiSelect({
  options,
  value,
  onChange,
  label = "Selected",
  placeholder = "Add...",
  disabled = false,
  className,
  chipClassName,
}: ChipMultiSelectProps) {
  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const availableOptions = React.useMemo(
    () => options.filter((o) => o && !selectedSet.has(o)),
    [options, selectedSet]
  );

  const handleAdd = React.useCallback(
    (newVal: string) => {
      if (!newVal || selectedSet.has(newVal)) return;
      onChange([...value, newVal]);
    },
    [value, selectedSet, onChange]
  );

  const handleRemove = React.useCallback(
    (toRemove: string) => {
      onChange(value.filter((v) => v !== toRemove));
    },
    [value, onChange]
  );

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-foreground">{label}</Label>
      )}
      <div className="flex flex-col gap-2">
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {value.map((item) => (
              <span
                key={item}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border bg-secondary px-2.5 py-1 text-sm font-medium transition-colors",
                  !disabled && "hover:bg-secondary/80",
                  chipClassName
                )}
              >
                <span>{item}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    className="rounded-full p-0.5 opacity-70 hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label={`Remove ${item}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {!disabled && availableOptions.length > 0 && (
          <Select key={value.length} onValueChange={handleAdd}>
            <SelectTrigger className="h-9 w-full min-w-[140px] max-w-xs">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!disabled && availableOptions.length === 0 && value.length > 0 && (
          <p className="text-xs text-muted-foreground">All options selected.</p>
        )}
      </div>
    </div>
  );
}
