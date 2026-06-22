import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";

import { getTodayLeads } from "@/actions/(VS)/queryActions";
import {
  canNavigateToDay,
  isToday,
  startOfLocalDay,
  toDateKey,
} from "@/lib/date/dayKey";

const TODAY_STALE_MS = 60_000;
const PAST_DAY_STALE_MS = 10 * 60_000;

export function useLeadsByDay(selectedDate: Date, enabled = true) {
  const normalizedDate = startOfLocalDay(selectedDate);
  const dateKey = toDateKey(normalizedDate);
  const isCurrentDay = isToday(normalizedDate);

  return useQuery({
    queryKey: ["todayLeads", dateKey],
    queryFn: () => getTodayLeads(dateKey),
    enabled: enabled && canNavigateToDay(normalizedDate),
    staleTime: isCurrentDay ? TODAY_STALE_MS : PAST_DAY_STALE_MS,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: isCurrentDay,
  });
}
