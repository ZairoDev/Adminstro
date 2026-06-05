"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CalendarDays, List, Plus } from "lucide-react";
import { toast } from "sonner";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { PersonalReminderCalendar } from "@/components/reminders/PersonalReminderCalendar";
import { PersonalReminderForm } from "@/components/reminders/PersonalReminderForm";
import { PersonalReminderList } from "@/components/reminders/PersonalReminderList";
import { PersonalReminderItem } from "@/components/reminders/types";
import { cn } from "@/lib/utils";
import { reminderTheme } from "@/components/reminders/reminderTheme";

export default function MyRemindersPage() {
  const [reminders, setReminders] = useState<PersonalReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterByDay, setFilterByDay] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalReminderItem | null>(null);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/personal-reminders");
      setReminders(res.data?.reminders ?? []);
    } catch {
      toast.error("Could not load reminders");
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: PersonalReminderItem) => {
    setEditing(item);
    setSelectedDate(new Date(item.scheduledAt));
    setFilterByDay(true);
    setFormOpen(true);
  };

  const handleSubmit = async (data: {
    note: string;
    title?: string;
    scheduledAt: Date;
  }) => {
    if (!editing && data.scheduledAt.getTime() <= Date.now()) {
      toast.error("Please choose a future date and time");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await axios.patch(`/api/personal-reminders/${editing._id}`, {
          note: data.note,
          title: data.title,
          scheduledAt: data.scheduledAt.toISOString(),
        });
        toast.success("Reminder updated");
      } else {
        await axios.post("/api/personal-reminders", {
          note: data.note,
          title: data.title,
          scheduledAt: data.scheduledAt.toISOString(),
        });
        toast.success("Reminder added");
      }
      setFormOpen(false);
      setEditing(null);
      await fetchReminders();
      bumpRefresh();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Something went wrong";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/personal-reminders/${id}`);
      toast.success("Reminder removed");
      await fetchReminders();
      bumpRefresh();
    } catch {
      toast.error("Could not delete reminder");
    }
  };

  return (
    <div
      className={cn(
        "flex w-full min-h-[calc(100dvh-5rem)] flex-col px-3 py-4 sm:px-5 sm:py-6 md:px-6 lg:px-8",
        reminderTheme.surface.page,
      )}
    >
      <header className="mb-5 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50 md:text-3xl">
            My Reminders
          </h1>
          <p className="mt-1.5 max-w-2xl text-base text-stone-600 dark:text-stone-400">
            Select a date on the calendar, then use Add reminder to set a note and
            time. You&apos;ll get a dashboard alert and email when it&apos;s due.
          </p>
        </div>
        {!filterByDay && (
          <Button
            onClick={openCreate}
            className={cn(
              "h-11 shrink-0 gap-2 self-start rounded-lg px-6 font-semibold shadow-sm sm:self-center",
              reminderTheme.primary.DEFAULT,
            )}
          >
            <Plus className="h-4 w-4" />
            Add reminder
          </Button>
        )}
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Show:</span>
        <div className="inline-flex rounded-lg border border-stone-200/80 bg-white/80 p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <button
            type="button"
            onClick={() => setFilterByDay(true)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              filterByDay
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-stone-500 hover:text-indigo-700 dark:text-stone-400 dark:hover:text-indigo-300",
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Selected day
          </button>
          <button
            type="button"
            onClick={() => setFilterByDay(false)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              !filterByDay
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-stone-500 hover:text-indigo-700 dark:text-stone-400 dark:hover:text-indigo-300",
            )}
          >
            <List className="h-4 w-4" />
            All reminders
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6 xl:gap-8">
        <div className="lg:col-span-7 xl:col-span-8">
          <PersonalReminderCalendar
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setFilterByDay(true);
            }}
            refreshKey={refreshKey}
            className="h-full min-h-[min(72vh,720px)]"
          />
        </div>
        <div className="lg:col-span-5 xl:col-span-4">
          <PersonalReminderList
            reminders={reminders}
            selectedDate={filterByDay ? selectedDate : undefined}
            onEdit={openEdit}
            onDelete={handleDelete}
            onAddReminder={filterByDay ? openCreate : undefined}
            loading={loading}
            className="h-full min-h-[min(72vh,720px)]"
          />
        </div>
      </div>

      <PersonalReminderForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        selectedDate={selectedDate}
        editing={editing}
        onSubmit={handleSubmit}
        loading={saving}
      />
    </div>
  );
}
