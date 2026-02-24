"use client";

import {
  getAvailableLocations,
  getWeeklyTargetStats,
} from "@/actions/(VS)/queryActions";
import { useState, useEffect } from "react";

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

export const useTargetStats = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TargetStatsResponse | null>(null);
  const [locations, setLocations] = useState<string[]>([]);

  const fetchStats = async ({
    viewMode = "weekly",
    location,
    month = new Date().getMonth(),
    year = new Date().getFullYear(),
  }: {
    viewMode?: "weekly" | "10-day";
    location?: string;
    month?: number;
    year?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWeeklyTargetStats({
        viewMode,
        location: location === "all" ? undefined : location,
        month,
        year,
      });
      setStats(response);
    } catch (err: any) {
      console.error("❌ Error fetching target stats:", err);
      setError(err.message || "Failed to fetch target stats");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const locs = await getAvailableLocations();
      setLocations(locs);
    } catch (err) {
      console.error("❌ Error fetching locations:", err);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchStats({});
  }, []);

  return {
    loading,
    error,
    stats,
    locations,
    fetchStats,
  };
};
