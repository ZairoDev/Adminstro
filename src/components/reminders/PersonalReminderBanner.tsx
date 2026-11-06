"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "@/util/axios";
import { formatReminderDateTime, type PersonalReminderItem } from "./types";
import { cn } from "@/lib/utils";
import { usePersonalReminders } from "@/hooks/shared/usePersonalReminders";
import {
  isDesktopNotificationSupported,
  requestDesktopNotificationPermission,
  showDesktopNotification,
} from "@/lib/whatsapp/browserDesktopNotify";

const REMINDER_CHIME_SRC = "/sounds/reminder-chime.wav";
const REMINDER_ICON = "/icons/reminder-bell.png";
const ANNOUNCED_KEY = "adminstro-announced-reminders";
const announcedIds = new Set<string>();
const openDesktopNotifications = new Map<string, Notification>();
let announcedLoaded = false;

function ensureAnnounced() {
  if (announcedLoaded || typeof window === "undefined") return;
  announcedLoaded = true;
  try {
    const raw = sessionStorage.getItem(ANNOUNCED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      for (const id of parsed) announcedIds.add(String(id));
    }
  } catch {
    /* Ignore a blocked or corrupt session store. */
  }
}

function isAnnounced(id: string) {
  ensureAnnounced();
  return announcedIds.has(id);
}

function markAnnounced(id: string) {
  ensureAnnounced();
  if (announcedIds.has(id)) return;
  announcedIds.add(id);
  try {
    sessionStorage.setItem(ANNOUNCED_KEY, JSON.stringify([...announcedIds]));
  } catch {
    /* The in-memory set still stops a repeat in this page. */
  }
}

let chimeEl: HTMLAudioElement | null = null;
let chimeBlocked = false;

function getChime() {
  if (!chimeEl) {
    chimeEl = new Audio(REMINDER_CHIME_SRC);
    chimeEl.preload = "auto";
  }
  chimeEl.volume = 0.9;
  return chimeEl;
}

function playReminderChime() {
  const audio = getChime();
  audio.currentTime = 0;
  const attempt = audio.play();
  if (!attempt) return;
  void attempt.then(() => {
    chimeBlocked = false;
  }).catch(() => {
    chimeBlocked = true;
  });
}

function unlockReminderChime() {
  const audio = getChime();
  if (chimeBlocked) {
    playReminderChime();
    return;
  }
  const attempt = audio.play();
  void attempt?.then(() => {
    audio.pause();
    audio.currentTime = 0;
  }).catch(() => {});
}

interface DueRemindersCache {
  reminders: PersonalReminderItem[];
  count: number;
  overdueCount: number;
  dueTodayCount: number;
  nextScheduledAt: string | null;
}

export function PersonalReminderBanner() {
  const queryClient = useQueryClient();
  const { reminders, isLoading } = usePersonalReminders();
  const [mounted, setMounted] = useState(false);
  const [tabVisible, setTabVisible] = useState(false);
  const [exitingIds, setExitingIds] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    const sync = () => setTabVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    if (!isDesktopNotificationSupported() || Notification.permission !== "default") return;
    const ask = () => {
      unlockReminderChime();
      void requestDesktopNotificationPermission();
      window.removeEventListener("pointerdown", ask);
      window.removeEventListener("keydown", ask);
    };
    window.addEventListener("pointerdown", ask);
    window.addEventListener("keydown", ask);
    return () => {
      window.removeEventListener("pointerdown", ask);
      window.removeEventListener("keydown", ask);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/reminder-sw.js");
    const onMessage = (event: MessageEvent) => {
      const id = event.data?.type === "personal-reminder-dismiss" ? String(event.data.id ?? "") : "";
      if (!id) return;
      queryClient.setQueryData<DueRemindersCache>(["personalReminders"], (current) => {
        if (!current) return current;
        const next = current.reminders.filter((reminder) => reminder._id !== id);
        return { ...current, reminders: next, count: next.length };
      });
      void axios.post(`/api/personal-reminders/${id}/dismiss`).catch(() => null);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [queryClient]);

  useEffect(() => {
    if (!mounted || isLoading) return;
    for (const reminder of reminders) {
      if (isAnnounced(reminder._id)) continue;
      markAnnounced(reminder._id);
      playReminderChime();
      if (!tabVisible) void showReminderDesktopNotification(reminder);
    }
  }, [mounted, isLoading, tabVisible, reminders]);

  const dismissOne = async (id: string) => {
    setExitingIds((current) => current.filter((item) => item !== id));
    queryClient.setQueryData<DueRemindersCache>(["personalReminders"], (current) => {
      if (!current) return current;
      const next = current.reminders.filter((reminder) => reminder._id !== id);
      return {
        ...current,
        reminders: next,
        count: next.length,
      };
    });
    await axios.post(`/api/personal-reminders/${id}/dismiss`).catch(() => null);
  };

  if (!mounted || isLoading || !tabVisible || reminders.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-0 right-0 z-[80] flex w-[min(22.5rem,calc(100vw-1rem))] flex-col-reverse gap-3 p-3"
      aria-live="polite"
    >
      {reminders.map((reminder) => (
        <ReminderPopup
          key={reminder._id}
          reminder={reminder}
          skipEnter={isAnnounced(reminder._id)}
          exiting={exitingIds.includes(reminder._id)}
          onClose={() =>
            setExitingIds((current) =>
              current.includes(reminder._id) ? current : [...current, reminder._id],
            )
          }
          onExited={() => dismissOne(reminder._id)}
        />
      ))}
    </div>,
    document.body,
  );
}

async function showReminderDesktopNotification(reminder: PersonalReminderItem) {
  if (!isDesktopNotificationSupported() || Notification.permission !== "granted") return;

  const when = formatReminderDateTime(reminder.scheduledAt);
  const title = reminder.title || "Reminder";
  const body = reminder.note ? `${when}\n${reminder.note}` : when;
  const tag = `personal-reminder-${reminder._id}`;
  const data = { id: reminder._id, url: "/dashboard/my-reminders" };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration | null>((resolve) => {
          window.setTimeout(() => resolve(null), 2000);
        }),
      ]);
      if (registration) {
        await registration.showNotification(title, {
          body,
          tag,
          icon: REMINDER_ICON,
          badge: REMINDER_ICON,
          requireInteraction: true,
          silent: false,
          data,
          actions: [
            { action: "open", title: "View reminder" },
            { action: "dismiss", title: "Dismiss" },
          ],
        });
        return;
      }
    }
  } catch {
    /* Fall back to the basic notification below. */
  }

  const notification = showDesktopNotification({
    title,
    body,
    tag,
    icon: REMINDER_ICON,
    requireInteraction: true,
  });
  if (!notification) return;
  openDesktopNotifications.set(reminder._id, notification);
  notification.onclick = () => {
    notification.close();
    window.focus();
    if (window.location.pathname !== "/dashboard/my-reminders") {
      window.location.assign("/dashboard/my-reminders");
    }
  };
  notification.onclose = () => {
    openDesktopNotifications.delete(reminder._id);
  };
}

function ReminderPopup({
  reminder,
  exiting,
  skipEnter,
  onClose,
  onExited,
}: {
  reminder: PersonalReminderItem;
  exiting: boolean;
  skipEnter: boolean;
  onClose: () => void;
  onExited: () => void;
}) {
  const [entered, setEntered] = useState(skipEnter);
  const reduceMotion = usePrefersReducedMotion();
  const finishedRef = React.useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onExited();
  };

  useEffect(() => {
    if (skipEnter) return;
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [skipEnter]);

  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(finish, 360);
    return () => window.clearTimeout(timer);
  }, [exiting]);

  const offscreen = !entered || exiting;

  return (
    <article
      role="status"
      onTransitionEnd={(event) => {
        if (event.propertyName !== "transform" || !exiting) return;
        finish();
      }}
      className={cn(
        "pointer-events-auto overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.18),0_0_1px_rgba(0,0,0,0.24)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-safe:animate-reminder-glow motion-reduce:transition-none dark:border-white/10 dark:bg-[#292929]",
        offscreen ? "translate-x-[120%]" : "translate-x-0",
      )}
    >
      <div className="flex items-center gap-2 bg-red-600 px-3 py-2 text-white">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Bell className="h-5 w-5 origin-top motion-safe:animate-reminder-bell" aria-hidden />
        </div>
        <p className="min-w-0 flex-1 text-sm font-semibold uppercase tracking-wide">Reminder</p>
        <button
          type="button"
          onClick={() => {
            if (reduceMotion || !entered) {
              finish();
              return;
            }
            onClose();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white hover:bg-white/15"
          aria-label="Dismiss reminder"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-3.5 py-3">
        <p className="truncate text-[15px] font-semibold leading-5 text-neutral-900 dark:text-neutral-50">
          {reminder.title || "Reminder"}
        </p>
        <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-300">
          {formatReminderDateTime(reminder.scheduledAt)}
        </p>
        {reminder.note && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-neutral-700 dark:text-neutral-200">
            {reminder.note}
          </p>
        )}
        <Link
          href="/dashboard/my-reminders"
          className="mt-2 inline-flex text-[13px] font-semibold text-red-600 hover:underline dark:text-red-400"
        >
          View reminder
        </Link>
      </div>
    </article>
  );
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return reduce;
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
