"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import axios from "@/util/axios";
import type { PersonalReminderItem } from "@/components/reminders/types";

interface DueRemindersResponse {
  reminders: PersonalReminderItem[];
  count: number;
  overdueCount: number;
  dueTodayCount: number;
  nextScheduledAt: string | null;
}

async function fetchDueReminders(): Promise<DueRemindersResponse> {
  const res = await axios.get<DueRemindersResponse>("/api/personal-reminders/due");
  return {
    reminders: res.data?.reminders ?? [],
    count: res.data?.count ?? 0,
    overdueCount: res.data?.overdueCount ?? 0,
    dueTodayCount: res.data?.dueTodayCount ?? 0,
    nextScheduledAt: res.data?.nextScheduledAt ?? null,
  };
}

export function usePersonalReminders() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["personalReminders"],
    queryFn: fetchDueReminders,
    staleTime: 15 * 1000,
    refetchInterval: 60 * 1000,
  });

  const nextScheduledAt = data?.nextScheduledAt ?? null;

  useEffect(() => {
    if (!nextScheduledAt) return;
    const delay = new Date(nextScheduledAt).getTime() - Date.now();
    if (delay <= 0) {
      void refetch();
      return;
    }
    const timer = window.setTimeout(() => {
      void refetch();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [nextScheduledAt, refetch]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refetch();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetch]);

  return {
    reminders: data?.reminders ?? [],
    dueCount: data?.count ?? 0,
    isLoading,
    isError,
    refetch,
  };
}
