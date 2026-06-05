"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  PersonalReminderItem,
  combineDateAndTime,
  dateToTimeString,
} from "./types";
import { reminderTheme } from "./reminderTheme";

const TIME_PRESETS = [
  { label: "9:00 AM", value: "09:00" },
  { label: "12:00 PM", value: "12:00" },
  { label: "5:00 PM", value: "17:00" },
  { label: "6:00 PM", value: "18:00" },
];

interface PersonalReminderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | undefined;
  editing: PersonalReminderItem | null;
  onSubmit: (data: {
    note: string;
    title?: string;
    scheduledAt: Date;
  }) => Promise<void>;
  loading?: boolean;
}

export function PersonalReminderForm({
  open,
  onOpenChange,
  selectedDate,
  editing,
  onSubmit,
  loading = false,
}: PersonalReminderFormProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [time, setTime] = useState("09:00");
  const [noteError, setNoteError] = useState("");

  useEffect(() => {
    if (!open) return;
    setNoteError("");
    if (editing) {
      setTitle(editing.title || "");
      setNote(editing.note || "");
      setTime(dateToTimeString(new Date(editing.scheduledAt)));
    } else {
      setTitle("");
      setNote("");
      setTime("09:00");
    }
  }, [open, editing]);

  const baseDate = editing
    ? new Date(editing.scheduledAt)
    : selectedDate ?? new Date();

  const dateLabel = baseDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setNoteError("Please add a note so you know what to remember.");
      return;
    }
    setNoteError("");
    const scheduledAt = combineDateAndTime(baseDate, time);
    await onSubmit({
      note: note.trim(),
      title: title.trim() || undefined,
      scheduledAt,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "flex w-full flex-col border sm:max-w-lg",
          reminderTheme.surface.card,
          reminderTheme.surface.cardBorder,
        )}
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-2xl font-bold text-foreground">
            {editing ? "Edit reminder" : "New reminder"}
          </SheetTitle>
          <SheetDescription className="text-base text-foreground/70">
            {dateLabel}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto pb-4"
        >
          <div className="space-y-2">
            <Label htmlFor="reminder-title" className="text-sm font-semibold text-foreground">
              Title{" "}
              <span className="font-normal text-foreground/60">(optional)</span>
            </Label>
            <Input
              id="reminder-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Follow up with client"
              className="h-11 rounded-xl border-border bg-background text-base text-foreground"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-note" className="text-sm font-semibold text-foreground">
              Note <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="reminder-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteError) setNoteError("");
              }}
              placeholder="What do you need to remember?"
              className={cn(
                "min-h-[140px] resize-none rounded-xl border-border bg-background text-base text-foreground",
                noteError && "border-destructive focus-visible:ring-destructive",
              )}
              maxLength={2000}
              aria-invalid={!!noteError}
              aria-describedby={noteError ? "note-error" : undefined}
            />
            {noteError ? (
              <p id="note-error" className="text-sm font-medium text-destructive" role="alert">
                {noteError}
              </p>
            ) : (
              <p className="text-xs text-foreground/60">
                This appears in your list and in the email we send you.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="reminder-time" className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-foreground/70" />
              Time
            </Label>
            <div className="flex flex-wrap gap-2">
              {TIME_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setTime(preset.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    time === preset.value
                      ? "border-indigo-300 bg-indigo-600 text-white shadow-sm dark:border-indigo-600 dark:bg-indigo-500"
                      : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-indigo-50 hover:text-indigo-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-200 dark:hover:bg-indigo-950/40",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <Input
              id="reminder-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-11 w-full max-w-[200px] rounded-xl border-border bg-background text-base text-foreground"
              required
            />
          </div>

          <SheetFooter className="mt-auto flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800 sm:flex-col">
            <Button
              type="submit"
              disabled={loading}
              className={cn("h-11 w-full rounded-lg text-base font-semibold", reminderTheme.primary.DEFAULT)}
            >
              {loading ? "Saving…" : editing ? "Save changes" : "Save reminder"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 w-full rounded-xl text-base font-medium text-foreground"
            >
              Cancel
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
