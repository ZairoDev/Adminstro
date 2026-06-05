"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "@/util/axios";
import { PersonalReminderItem, toDateKey } from "./types";
import { getReminderAccent, reminderTheme } from "./reminderTheme";

interface PersonalReminderCalendarProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  refreshKey?: number;
  className?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonthGrid(viewMonth: Date): Date[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTimeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function PersonalReminderCalendar({
  selectedDate,
  onSelectDate,
  refreshKey = 0,
  className,
}: PersonalReminderCalendarProps) {
  const [month, setMonth] = useState(() => selectedDate ?? new Date());
  const [monthReminders, setMonthReminders] = useState<PersonalReminderItem[]>([]);

  const gridDays = useMemo(() => buildMonthGrid(month), [month]);

  const fetchMonthReminders = useCallback(async (days: Date[]) => {
    if (days.length === 0) return;
    const from = new Date(days[0]);
    from.setHours(0, 0, 0, 0);
    const to = new Date(days[days.length - 1]);
    to.setHours(23, 59, 59, 999);
    try {
      const res = await axios.get("/api/personal-reminders", {
        params: { from: from.toISOString(), to: to.toISOString() },
      });
      setMonthReminders(res.data?.reminders ?? []);
    } catch {
      setMonthReminders([]);
    }
  }, []);

  useEffect(() => {
    fetchMonthReminders(gridDays);
  }, [gridDays, refreshKey, fetchMonthReminders]);

  const remindersByDay = useMemo(() => {
    const map = new Map<string, PersonalReminderItem[]>();
    for (const r of monthReminders) {
      const key = toDateKey(new Date(r.scheduledAt));
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    for (const [, list] of map) {
      list.sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );
    }
    return map;
  }, [monthReminders]);

  const today = useMemo(() => new Date(), []);
  const viewMonthIndex = month.getMonth();

  const monthLabel = month.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const goToPrevMonth = () =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToToday = () => {
    const now = new Date();
    setMonth(now);
    onSelectDate(now);
  };

  return (
    <section
      className={cn(
        "flex h-full min-h-[520px] flex-col overflow-hidden rounded-xl border shadow-sm",
        reminderTheme.surface.card,
        reminderTheme.surface.cardBorder,
        className,
      )}
    >
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-4 border-b px-4 py-4 sm:px-5 sm:py-5",
          reminderTheme.surface.cardBorder,
          "bg-gradient-to-r from-indigo-50/40 via-white to-violet-50/30",
          "dark:from-indigo-950/20 dark:via-zinc-900 dark:to-violet-950/10",
        )}
      >
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50 sm:text-[1.75rem]">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={goToToday}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              reminderTheme.primary.soft,
              "hover:opacity-90",
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={goToPrevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-zinc-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-zinc-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div
        className={cn(
          "grid shrink-0 grid-cols-7 border-b",
          reminderTheme.surface.grid,
        )}
      >
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className={cn(
              "border-r py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-stone-500 last:border-r-0 dark:text-stone-400",
              reminderTheme.surface.grid,
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {gridDays.map((day, idx) => {
          const inMonth = day.getMonth() === viewMonthIndex;
          const isToday = isSameDay(day, today);
          const isSelected =
            selectedDate != null && isSameDay(day, selectedDate);
          const dayKey = toDateKey(day);
          const dayReminders = remindersByDay.get(dayKey) ?? [];
          const visible = dayReminders.slice(0, 3);
          const overflow = dayReminders.length - visible.length;
          const dayNum = day.getDate();
          const isLastCol = idx % 7 === 6;
          const isLastRow = idx >= 35;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              aria-pressed={isSelected}
              aria-label={`${day.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}${dayReminders.length ? `, ${dayReminders.length} reminders` : ""}`}
              className={cn(
                "flex min-h-[4.5rem] flex-col border-b border-r p-1 text-left align-top transition-colors duration-150",
                reminderTheme.surface.grid,
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/50",
                "sm:min-h-[5.5rem] md:min-h-[6.5rem] lg:min-h-[7rem]",
                isLastCol && "border-r-0",
                isLastRow && "border-b-0",
                isSelected && reminderTheme.surface.selectedCell,
                !isSelected && inMonth && reminderTheme.surface.hoverCell,
                !inMonth && "bg-stone-50/60 dark:bg-zinc-950/40",
              )}
            >
              <div className="flex justify-end px-0.5 pt-0.5">
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm font-medium tabular-nums",
                    !inMonth && "text-stone-300 dark:text-stone-600",
                    inMonth && !isToday && !isSelected && "text-stone-800 dark:text-stone-100",
                    isToday && reminderTheme.today.circle,
                    isSelected &&
                      !isToday &&
                      "bg-indigo-600 font-semibold text-white shadow-sm shadow-indigo-500/20",
                  )}
                >
                  {dayNum}
                </span>
              </div>

              <div className="mt-0.5 flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden px-0.5 pb-0.5">
                {visible.map((r) => {
                  const accent = getReminderAccent(r._id);
                  return (
                    <div
                      key={r._id}
                      className={cn(
                        "flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5",
                        accent.chip,
                      )}
                      title={`${r.title || "Reminder"} · ${formatTimeShort(r.scheduledAt)}`}
                    >
                      <span
                        className={cn("h-3 w-0.5 shrink-0 rounded-full", accent.bar)}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[10px] font-medium leading-tight sm:text-[11px]",
                          accent.text,
                        )}
                      >
                        {r.title || "Reminder"}
                      </span>
                      <span
                        className={cn(
                          "hidden shrink-0 text-[9px] opacity-70 sm:inline",
                          accent.text,
                        )}
                      >
                        {formatTimeShort(r.scheduledAt)}
                      </span>
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <span className="truncate px-0.5 text-[10px] font-medium text-stone-500 dark:text-stone-400">
                    +{overflow} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export { toDateKey };
