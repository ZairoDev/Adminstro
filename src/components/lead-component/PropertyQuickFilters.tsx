"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WordsCount {
  "1bhk": number;
  "2bhk": number;
  "3bhk": number;
  "4bhk": number;
  studio: number;
  sharedApartment: number;
}

interface FilterChip {
  key: string;
  label: string;
  shortLabel: string;
  countKey: keyof WordsCount;
  idleCountBg: string;
  idleCountText: string;
  activeChipBg: string;
  activeChipBorder: string;
  activeLabel: string;
  activeCountBg: string;
  checkColor: string;
}

const FILTER_CHIPS: FilterChip[] = [
  {
    key: "1-bedroom",
    label: "1 Bedroom",
    shortLabel: "1 BR",
    countKey: "1bhk",
    idleCountBg: "bg-sky-500/12",
    idleCountText: "text-sky-700 dark:text-sky-300",
    activeChipBg: "bg-sky-500/12 dark:bg-sky-500/20",
    activeChipBorder: "border-sky-500",
    activeLabel: "text-sky-900 dark:text-sky-100",
    activeCountBg: "bg-sky-500",
    checkColor: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "2-bedroom",
    label: "2 Bedrooms",
    shortLabel: "2 BR",
    countKey: "2bhk",
    idleCountBg: "bg-emerald-500/12",
    idleCountText: "text-emerald-700 dark:text-emerald-300",
    activeChipBg: "bg-emerald-500/12 dark:bg-emerald-500/20",
    activeChipBorder: "border-emerald-500",
    activeLabel: "text-emerald-900 dark:text-emerald-100",
    activeCountBg: "bg-emerald-500",
    checkColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "3-bedroom",
    label: "3 Bedrooms",
    shortLabel: "3 BR",
    countKey: "3bhk",
    idleCountBg: "bg-violet-500/12",
    idleCountText: "text-violet-700 dark:text-violet-300",
    activeChipBg: "bg-violet-500/12 dark:bg-violet-500/20",
    activeChipBorder: "border-violet-500",
    activeLabel: "text-violet-900 dark:text-violet-100",
    activeCountBg: "bg-violet-500",
    checkColor: "text-violet-600 dark:text-violet-400",
  },
  {
    key: "4-bedroom",
    label: "4 Bedrooms",
    shortLabel: "4 BR",
    countKey: "4bhk",
    idleCountBg: "bg-orange-500/12",
    idleCountText: "text-orange-700 dark:text-orange-300",
    activeChipBg: "bg-orange-500/12 dark:bg-orange-500/20",
    activeChipBorder: "border-orange-500",
    activeLabel: "text-orange-900 dark:text-orange-100",
    activeCountBg: "bg-orange-500",
    checkColor: "text-orange-600 dark:text-orange-400",
  },
  {
    key: "studio",
    label: "Studio",
    shortLabel: "Studio",
    countKey: "studio",
    idleCountBg: "bg-rose-500/12",
    idleCountText: "text-rose-700 dark:text-rose-300",
    activeChipBg: "bg-rose-500/12 dark:bg-rose-500/20",
    activeChipBorder: "border-rose-500",
    activeLabel: "text-rose-900 dark:text-rose-100",
    activeCountBg: "bg-rose-500",
    checkColor: "text-rose-600 dark:text-rose-400",
  },
  {
    key: "shared-apartment",
    label: "Shared Apt",
    shortLabel: "Shared",
    countKey: "sharedApartment",
    idleCountBg: "bg-amber-500/12",
    idleCountText: "text-amber-700 dark:text-amber-300",
    activeChipBg: "bg-amber-500/12 dark:bg-amber-500/20",
    activeChipBorder: "border-amber-500",
    activeLabel: "text-amber-900 dark:text-amber-100",
    activeCountBg: "bg-amber-500",
    checkColor: "text-amber-600 dark:text-amber-400",
  },
];

interface PropertyQuickFiltersProps {
  wordsCount: WordsCount[];
  selected: string[];
  onToggle: (key: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export default function PropertyQuickFilters({
  wordsCount,
  selected,
  onToggle,
  onClearAll,
  className,
}: PropertyQuickFiltersProps) {
  const counts = wordsCount[0];
  const hasSelection = selected.length > 0;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-nowrap sm:overflow-x-auto sm:scrollbar-hide",
        className,
      )}
    >
      {FILTER_CHIPS.map((chip) => {
        const isActive = selected.includes(chip.key);
        const count = counts?.[chip.countKey] ?? 0;
        const isEmpty = count === 0;

        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onToggle(chip.key)}
            aria-pressed={isActive}
            title={chip.label}
            className={cn(
              "relative inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-2.5",
              "text-sm transition-all duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              !isActive && [
                "border-border/70 bg-background",
                "hover:border-border hover:bg-muted/40 hover:shadow-sm",
              ],
              isActive && [
                "border-2 shadow-md",
                chip.activeChipBg,
                chip.activeChipBorder,
              ],
              isEmpty && !isActive && "opacity-60 hover:opacity-90",
            )}
          >
            {/* active left accent bar */}
            {isActive && (
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full",
                  chip.activeCountBg,
                )}
                aria-hidden
              />
            )}

            <span
              className={cn(
                "flex h-6 min-w-[1.75rem] items-center justify-center rounded-md px-1",
                "text-sm font-bold tabular-nums leading-none transition-colors duration-200",
                isActive
                  ? cn(chip.activeCountBg, "text-white shadow-sm")
                  : cn(chip.idleCountBg, chip.idleCountText),
              )}
            >
              {count}
            </span>

            <span
              className={cn(
                "whitespace-nowrap transition-colors duration-200",
                isActive
                  ? cn("font-semibold", chip.activeLabel)
                  : "font-medium text-foreground/75",
              )}
            >
              <span className="hidden md:inline">{chip.label}</span>
              <span className="md:hidden">{chip.shortLabel}</span>
            </span>

            {isActive && (
              <Check
                className={cn("h-3.5 w-3.5 shrink-0", chip.checkColor)}
                strokeWidth={2.5}
                aria-hidden
              />
            )}
          </button>
        );
      })}

      {hasSelection && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          title="Clear all filters"
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-dashed border-border bg-muted/20 px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
