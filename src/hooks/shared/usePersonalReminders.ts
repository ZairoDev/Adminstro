import { useQuery } from "@tanstack/react-query";

import axios from "@/util/axios";
import type { PersonalReminderItem } from "@/components/reminders/types";

interface DueRemindersResponse {
  reminders: PersonalReminderItem[];
  count: number;
  overdueCount: number;
  dueTodayCount: number;
}

async function fetchDueReminders(): Promise<DueRemindersResponse> {
  const res = await axios.get<DueRemindersResponse>("/api/personal-reminders/due");
  return {
    reminders: res.data?.reminders ?? [],
    count: res.data?.count ?? 0,
    overdueCount: res.data?.overdueCount ?? 0,
    dueTodayCount: res.data?.dueTodayCount ?? 0,
  };
}

export function usePersonalReminders() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["personalReminders"],
    queryFn: fetchDueReminders,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    reminders: data?.reminders ?? [],
    dueCount: data?.count ?? 0,
    isLoading,
    isError,
    refetch,
  };
}
