"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface MultiSelectFilterProps {
  /** Filter name shown on the trigger, e.g. "Location". Empty selection = All. */
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  triggerClassName?: string;
  /** Format an option for display (value stays the raw option). */
  formatOption?: (option: string) => string;
}

/**
 * Compact multi-select for filter bars. Empty selection means "All",
 * so it is a drop-in replacement for a single-select "All + items" filter
 * without taking more space in the bar. Selected values are summarised on
 * the trigger (name for one, count for many); the full list lives in the
 * popover with search, so it scales to long option lists.
 */
export function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
  triggerClassName,
  formatOption,
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const visibleOptions = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.toLowerCase().includes(term));
  }, [options, search]);

  const display = (option: string) =>
    formatOption ? formatOption(option) : option;

  const toggle = (option: string, checked: boolean) => {
    onChange(
      checked
        ? [...value, option]
        : value.filter((item) => item !== option),
    );
  };

  const triggerText =
    value.length === 0
      ? label
      : value.length === 1
        ? display(value[0])
        : `${label} · ${value.length}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`${label} filter`}
          className={cn(
            "h-8 justify-between gap-1.5 px-2.5 text-xs font-normal",
            triggerClassName,
          )}
        >
          <span className="truncate">
            {value.length > 0 && value.length === 1 ? (
              triggerText
            ) : (
              <>
                <span className="text-muted-foreground">{label}: </span>
                {value.length === 0 ? "All" : value.length}
              </>
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="h-8 pl-7 text-xs"
          />
        </div>

        <button
          type="button"
          onClick={() => onChange([])}
          className="mt-2 flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs font-medium hover:bg-accent"
        >
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-sm border",
              value.length === 0
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/40",
            )}
          >
            {value.length === 0 ? <Check className="h-3 w-3" /> : null}
          </span>
          All {label.toLowerCase()}
        </button>

        <ScrollArea className="mt-1 max-h-56">
          <div className="space-y-0.5 pr-2">
            {visibleOptions.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No matches
              </p>
            ) : (
              visibleOptions.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                >
                  <Checkbox
                    checked={selectedSet.has(option)}
                    onCheckedChange={(checked) =>
                      toggle(option, checked === true)
                    }
                  />
                  <span className="truncate">{display(option)}</span>
                </label>
              ))
            )}
          </div>
        </ScrollArea>

        {value.length > 0 ? (
          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
            <span className="px-1 text-[11px] text-muted-foreground">
              {value.length} selected
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onChange([])}
            >
              Clear
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
