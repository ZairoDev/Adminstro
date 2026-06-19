"use client";

import {
  getAvailableLocations,
  getWeeklyTargetStats,
} from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export type PeriodData = {
  period: string;
  periodLabel: string;
  target: number;
  achieved: number;
  percentage: number;
  startDate: string;
  endDate: string;
};

export type TargetStatsResponse = {
  periods: PeriodData[];
  totalTarget: number;
  totalAchieved: number;
  overallPercentage: number;
  location: string;
  month: string;
  year: number;
};

type TargetStatsFilters = {
  viewMode?: "weekly" | "10-day";
  location?: string;
  month?: number;
  year?: number;
};

export const useTargetStats = () => {
  const [filters, setFilters] = useState<TargetStatsFilters>({
    viewMode: "weekly",
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  const locationsQuery = useQuery({
    queryKey: ["targetStats", "locations"],
    queryFn: () => getAvailableLocations(),
  });

  const statsQuery = useQuery({
    queryKey: [
      "targetStats",
      filters.viewMode,
      filters.location ?? "all",
      filters.month,
      filters.year,
    ],
    queryFn: () =>
      getWeeklyTargetStats({
        viewMode: filters.viewMode ?? "weekly",
        location: filters.location === "all" ? undefined : filters.location,
        month: filters.month ?? new Date().getMonth(),
        year: filters.year ?? new Date().getFullYear(),
      }),
  });

  const fetchStats = ({
    viewMode = "weekly",
    location,
    month = new Date().getMonth(),
    year = new Date().getFullYear(),
  }: TargetStatsFilters) => {
    setFilters({ viewMode, location, month, year });
  };

  const fetchLocations = async () => {
    await locationsQuery.refetch();
  };

  return {
    loading: statsQuery.isLoading,
    error: statsQuery.error instanceof Error ? statsQuery.error.message : null,
    stats: (statsQuery.data ?? null) as TargetStatsResponse | null,
    locations: locationsQuery.data ?? [],
    fetchStats,
    fetchLocations,
  };
};
