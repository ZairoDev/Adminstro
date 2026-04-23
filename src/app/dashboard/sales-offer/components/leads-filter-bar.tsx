"use client";

import { useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DropdownOption {
  label: string;
  value: string;
}

export interface FilterFieldConfig {
  key: string;
  label: string;
  type: "search" | "dropdown" | "date";
  options?: DropdownOption[];
  placeholder?: string;
}

export type FilterValues = Record<string, string>;

interface LeadsFilterBarProps {
  fields: FilterFieldConfig[];
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  onReset?: () => void;
  isLoading?: boolean;
}

export function LeadsFilterBar({ fields, values, onChange, onReset, isLoading }: LeadsFilterBarProps) {
  const set = useCallback(
    (key: string, val: string) => onChange({ ...values, [key]: val }),
    [values, onChange],
  );

  const hasActiveFilters = fields.some((f) => !!values[f.key]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {fields.map((field) => {
        if (field.type === "search") {
          return (
            <div key={field.key} className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-7 h-8 text-sm w-48"
                placeholder={field.placeholder ?? field.label}
                value={values[field.key] ?? ""}
                onChange={(e) => set(field.key, e.target.value)}
                disabled={isLoading}
              />
            </div>
          );
        }

        if (field.type === "dropdown") {
          return (
            <Select
              key={field.key}
              value={values[field.key] ?? ""}
              onValueChange={(v) => set(field.key, v === "__all__" ? "" : v)}
              disabled={isLoading}
            >
              <SelectTrigger className="h-8 text-sm w-44">
                <SelectValue placeholder={field.placeholder ?? field.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All {field.label}s</SelectItem>
                {(field.options ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        if (field.type === "date") {
          return (
            <div key={field.key} className="flex flex-col gap-0.5">
              <label className="text-[10px] text-muted-foreground leading-none">{field.label}</label>
              <Input
                type="date"
                className="h-8 text-sm w-36"
                value={values[field.key] ?? ""}
                onChange={(e) => set(field.key, e.target.value)}
                disabled={isLoading}
              />
            </div>
          );
        }

        return null;
      })}

      {hasActiveFilters && onReset && (
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onReset}>
          <X size={13} className="mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
