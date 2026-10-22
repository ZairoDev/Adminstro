"use client";

import * as React from "react";
import { ChevronDown, Euro } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface PriceRangeValue {
  from: string;
  to: string;
}

export interface PriceRangeFilterProps {
  value: PriceRangeValue;
  /** Called only on Apply / Clear, never per keystroke. */
  onChange: (value: PriceRangeValue) => void;
  triggerClassName?: string;
}

/**
 * Price-range filter with the same semantics as every lead budget filter
 * (see @/util/pricingRule): a lead counts by its max budget, and a value
 * at the "From" amount belongs to the lower band. Draft inputs are only
 * committed on Apply so parents don't refetch on each keystroke.
 */
export function PriceRangeFilter({
  value,
  onChange,
  triggerClassName,
}: PriceRangeFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<PriceRangeValue>(value);

  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const hasValue = value.from !== "" || value.to !== "";

  const draftFrom = draft.from === "" ? null : Number(draft.from);
  const draftTo = draft.to === "" ? null : Number(draft.to);
  const isInvalidRange =
    draftFrom !== null &&
    draftTo !== null &&
    Number.isFinite(draftFrom) &&
    Number.isFinite(draftTo) &&
    draftFrom >= draftTo;

  const triggerText = !hasValue
    ? "Price"
    : value.from !== "" && value.to !== ""
      ? `€${value.from}–€${value.to}`
      : value.from !== ""
        ? `Above €${value.from}`
        : `Up to €${value.to}`;

  const apply = () => {
    if (isInvalidRange) return;
    onChange(draft);
    setOpen(false);
  };

  const clear = () => {
    setDraft({ from: "", to: "" });
    onChange({ from: "", to: "" });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label="Price range filter"
          className={cn(
            "h-8 justify-between gap-1.5 px-2.5 text-xs font-normal",
            hasValue && "border-primary/50",
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Euro className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{triggerText}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="price-range-from" className="text-xs">
              From (€)
            </Label>
            <Input
              id="price-range-from"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="0"
              value={draft.from}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, from: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") apply();
              }}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price-range-to" className="text-xs">
              To (€)
            </Label>
            <Input
              id="price-range-to"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="2500"
              value={draft.to}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, to: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") apply();
              }}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {isInvalidRange ? (
          <p className="mt-2 text-xs text-destructive">
            To must be greater than From.
          </p>
        ) : (
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            Matched on the lead&apos;s max budget. An amount at
            &ldquo;From&rdquo; belongs to the lower band (e.g. €580 is in
            0–580, not 580–2500).
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={clear}
            disabled={!hasValue && draft.from === "" && draft.to === ""}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={apply}
            disabled={isInvalidRange}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
