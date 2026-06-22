"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getTodayLeads } from "@/actions/(VS)/queryActions";
import {
  addLocalDays,
  canGoToNextDay,
  canGoToPreviousDay,
  formatDayLabel,
  generateRecentDays,
  isSameLocalDay,
  isToday,
  startOfLocalDay,
  toDateKey,
} from "@/lib/date/dayKey";

interface DaySelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  prefetchAdjacent?: boolean;
}

export function DaySelector({
  selectedDate,
  onDateChange,
  prefetchAdjacent = true,
}: DaySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const recentDays = generateRecentDays(30);

  const prefetchDay = useCallback(
    (date: Date) => {
      if (!prefetchAdjacent) return;
      const dateKey = toDateKey(date);
      if (queryClient.getQueryData(["todayLeads", dateKey]) !== undefined) {
        return;
      }
      void queryClient.prefetchQuery({
        queryKey: ["todayLeads", dateKey],
        queryFn: () => getTodayLeads(dateKey),
        staleTime: isToday(date) ? 60_000 : 10 * 60_000,
      });
    },
    [prefetchAdjacent, queryClient],
  );

  const handlePrevious = () => {
    if (!canGoToPreviousDay(selectedDate)) return;
    const prev = addLocalDays(selectedDate, -1);
    onDateChange(prev);
  };

  const handleNext = () => {
    if (!canGoToNextDay(selectedDate)) return;
    const next = addLocalDays(selectedDate, 1);
    onDateChange(next);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={handlePrevious}
        onMouseEnter={() => prefetchDay(addLocalDays(selectedDate, -1))}
        disabled={!canGoToPreviousDay(selectedDate)}
        aria-label="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="min-w-[220px] justify-start gap-2"
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">{formatDayLabel(selectedDate)}</span>
            {isToday(selectedDate) && (
              <span className="ml-auto shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-xs text-white">
                Current
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0" align="center">
          <div className="max-h-[320px] overflow-y-auto">
            {recentDays.map((day) => {
              const selected = isSameLocalDay(day, selectedDate);
              const current = isToday(day);
              return (
                <button
                  key={toDateKey(day)}
                  type="button"
                  onClick={() => {
                    onDateChange(startOfLocalDay(day));
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => prefetchDay(day)}
                  className={[
                    "w-full px-4 py-2.5 text-left transition-colors hover:bg-muted",
                    selected ? "bg-muted font-semibold" : "",
                    current ? "border-l-4 border-emerald-500" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{formatDayLabel(day)}</span>
                    {current && (
                      <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-xs text-white">
                        Current
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={handleNext}
        onMouseEnter={() => prefetchDay(addLocalDays(selectedDate, 1))}
        disabled={!canGoToNextDay(selectedDate)}
        aria-label="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
