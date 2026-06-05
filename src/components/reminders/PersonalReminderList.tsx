"use client";

import React, { useMemo, useState } from "react";
import { Bell, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { PersonalReminderItem, formatReminderDateTime } from "./types";
import { getReminderAccent, reminderTheme } from "./reminderTheme";

interface PersonalReminderListProps {
  reminders: PersonalReminderItem[];
  selectedDate?: Date;
  onEdit: (item: PersonalReminderItem) => void;
  onDelete: (id: string) => void;
  onAddReminder?: () => void;
  loading?: boolean;
  className?: string;
}

function statusBadge(status: PersonalReminderItem["status"], scheduledAt: string) {
  const isOverdue =
    status === "pending" && new Date(scheduledAt).getTime() < Date.now();
  if (status === "sent") {
    return (
      <Badge variant="outline" className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", reminderTheme.status.sent)}>
        Email sent
      </Badge>
    );
  }
  if (isOverdue) {
    return (
      <Badge variant="outline" className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", reminderTheme.status.overdue)}>
        Overdue
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", reminderTheme.status.scheduled)}>
      Scheduled
    </Badge>
  );
}

function ReminderRow({
  item,
  onEdit,
  onDelete,
}: {
  item: PersonalReminderItem;
  onEdit: (item: PersonalReminderItem) => void;
  onDelete: (id: string) => void;
}) {
  const accent = getReminderAccent(item._id);
  return (
    <article
      className={cn(
        "rounded-xl border p-4 shadow-sm transition-all duration-150",
        reminderTheme.surface.card,
        reminderTheme.surface.cardBorder,
        "hover:shadow-md hover:border-indigo-200/60 dark:hover:border-indigo-800/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            accent.chip,
          )}
        >
          <Bell className={cn("h-5 w-5", accent.icon)} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug text-stone-900 dark:text-stone-50">
              {item.title || "Reminder"}
            </h3>
            {statusBadge(item.status, item.scheduledAt)}
          </div>
          <p className="mt-1 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            {formatReminderDateTime(item.scheduledAt)}
          </p>
          {item.note ? (
            <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {item.note}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 gap-1.5 rounded-lg font-medium"
          onClick={() => onEdit(item)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 gap-1.5 rounded-lg font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(item._id)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </article>
  );
}

export function PersonalReminderList({
  reminders,
  selectedDate,
  onEdit,
  onDelete,
  onAddReminder,
  loading,
  className,
}: PersonalReminderListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { upcoming, past, totalFiltered } = useMemo(() => {
    const now = Date.now();
    const filtered = selectedDate
      ? reminders.filter((r) => {
          const d = new Date(r.scheduledAt);
          return (
            d.getFullYear() === selectedDate.getFullYear() &&
            d.getMonth() === selectedDate.getMonth() &&
            d.getDate() === selectedDate.getDate()
          );
        })
      : reminders;

    const up: PersonalReminderItem[] = [];
    const pa: PersonalReminderItem[] = [];

    for (const r of filtered) {
      if (r.status === "pending" && new Date(r.scheduledAt).getTime() >= now) {
        up.push(r);
      } else {
        pa.push(r);
      }
    }

    up.sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
    pa.sort(
      (a, b) =>
        new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
    );

    return { upcoming: up, past: pa, totalFiltered: filtered.length };
  }, [reminders, selectedDate]);

  const titleLabel = selectedDate
    ? selectedDate.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "All reminders";

  const confirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const showDayAddButton = Boolean(selectedDate && onAddReminder);

  const addReminderButton = showDayAddButton ? (
    <Button
      type="button"
      onClick={onAddReminder}
      className={cn("gap-2 rounded-lg font-semibold", reminderTheme.primary.DEFAULT)}
    >
      <Plus className="h-4 w-4" />
      Add reminder
    </Button>
  ) : null;

  return (
    <>
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
            "shrink-0 border-b px-4 py-4 sm:px-5 sm:py-5",
            reminderTheme.surface.cardBorder,
            "bg-gradient-to-br from-stone-50/80 to-indigo-50/30 dark:from-zinc-900 dark:to-indigo-950/20",
          )}
        >
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50 sm:text-xl">
            {titleLabel}
          </h2>
          <p className="mt-1 text-sm font-medium text-stone-600 dark:text-stone-400">
            {loading
              ? "Loading reminders…"
              : totalFiltered === 0
                ? "No reminders for this day"
                : `${totalFiltered} reminder${totalFiltered !== 1 ? "s" : ""}`}
          </p>
          {showDayAddButton && totalFiltered > 0 && (
            <div className="mt-4">{addReminderButton}</div>
          )}
        </header>

        <div className="min-h-0 flex-1 p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl bg-muted"
                  aria-hidden
                />
              ))}
            </div>
          ) : upcoming.length === 0 && past.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-indigo-200/60 bg-indigo-50/30 px-6 py-12 text-center dark:border-indigo-800/40 dark:bg-indigo-950/20">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/50">
                <Bell className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-lg font-semibold text-foreground">
                Nothing here yet
              </p>
              <p className="mt-2 max-w-xs text-sm text-stone-600 dark:text-stone-400">
                {selectedDate
                  ? "Schedule a note and time for this date."
                  : "Switch to Selected day on the calendar, or add from the page header."}
              </p>
              {showDayAddButton && <div className="mt-6">{addReminderButton}</div>}
            </div>
          ) : (
            <ScrollArea className="h-full max-h-[min(68vh,680px)] pr-1">
              <div className="space-y-6 pb-2">
                {upcoming.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground/60">
                      Upcoming
                    </h3>
                    <div className="space-y-3">
                      {upcoming.map((item) => (
                        <ReminderRow
                          key={item._id}
                          item={item}
                          onEdit={onEdit}
                          onDelete={setDeleteId}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground/60">
                      Past & completed
                    </h3>
                    <div className="space-y-3">
                      {past.map((item) => (
                        <ReminderRow
                          key={item._id}
                          item={item}
                          onEdit={onEdit}
                          onDelete={setDeleteId}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </section>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. You will not receive an email for this
              reminder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
