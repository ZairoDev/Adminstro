"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "@/util/axios";
import {
  formatReminderDateTime,
} from "./types";
import { reminderTheme } from "./reminderTheme";
import { cn } from "@/lib/utils";
import { usePersonalReminders } from "@/hooks/shared/usePersonalReminders";

interface PersonalReminderBannerProps {
  onDismissAll?: () => void;
}

export function PersonalReminderBanner({ onDismissAll }: PersonalReminderBannerProps) {
  const queryClient = useQueryClient();
  const { reminders, isLoading } = usePersonalReminders();
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const toastShownRef = React.useRef(false);

  useEffect(() => {
    if (isLoading || reminders.length === 0 || toastShownRef.current) return;

    toastShownRef.current = true;
    const next = reminders[0];
    toast.message(next.title || "Reminder due", {
      description: formatReminderDateTime(next.scheduledAt),
      action: {
        label: "Open",
        onClick: () => {
          window.location.href = "/dashboard/my-reminders";
        },
      },
    });
  }, [isLoading, reminders]);

  const dismissAll = async () => {
    await Promise.all(
      reminders.map((r) =>
        axios.post(`/api/personal-reminders/${r._id}/dismiss`).catch(() => null),
      ),
    );
    queryClient.setQueryData(["personalReminders"], {
      reminders: [],
      count: 0,
      overdueCount: 0,
      dueTodayCount: 0,
    });
    setHidden(true);
    onDismissAll?.();
  };

  if (isLoading || hidden || reminders.length === 0) return null;

  const summary =
    reminders.length === 1
      ? "1 reminder needs your attention"
      : `${reminders.length} reminders need your attention`;

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50/90 via-white to-violet-50/50 p-4 shadow-sm animate-in slide-in-from-top-4 duration-300 dark:border-indigo-800/50 dark:from-indigo-950/30 dark:via-zinc-900 dark:to-violet-950/20"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 shadow-sm shadow-indigo-500/25">
            <Bell className="h-5 w-5 text-white" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-stone-900 dark:text-stone-50">{summary}</p>
            {!expanded && reminders[0] && (
              <p className="mt-1 truncate text-sm font-medium text-stone-600 dark:text-stone-400">
                {reminders[0].title} — {formatReminderDateTime(reminders[0].scheduledAt)}
              </p>
            )}
            {expanded && (
              <ul className="mt-3 space-y-2">
                {reminders.map((r) => (
                  <li
                    key={r._id}
                    className="rounded-lg border border-indigo-100 bg-white/80 px-3 py-2 text-sm dark:border-indigo-900/50 dark:bg-zinc-900/80"
                  >
                    <span className="font-semibold text-stone-900 dark:text-stone-50">{r.title}</span>
                    <span className="block text-stone-500 dark:text-stone-400">
                      {formatReminderDateTime(r.scheduledAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {reminders.length > 1 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-indigo-100/80 dark:hover:bg-indigo-950/50"
              aria-label={expanded ? "Show less" : "Show all due reminders"}
            >
              {expanded ? (
                <ChevronUp className="h-5 w-5 text-indigo-700 dark:text-indigo-300" />
              ) : (
                <ChevronDown className="h-5 w-5 text-indigo-700 dark:text-indigo-300" />
              )}
            </button>
          )}
          <Button
            size="sm"
            className={cn("rounded-lg font-semibold", reminderTheme.primary.DEFAULT)}
            asChild
          >
            <Link href="/dashboard/my-reminders">Open</Link>
          </Button>
          <button
            type="button"
            onClick={dismissAll}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800"
            aria-label="Dismiss reminders for now"
          >
            <X className="h-5 w-5 text-stone-500 dark:text-stone-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PersonalReminderNavBell() {
  const { dueCount } = usePersonalReminders();

  return (
    <Button variant="outline" size="sm" className="relative" asChild>
      <Link href="/dashboard/my-reminders" aria-label={`My reminders${dueCount > 0 ? `, ${dueCount} due` : ""}`}>
        My Reminders
        {dueCount > 0 && (
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {dueCount > 99 ? "99+" : dueCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
