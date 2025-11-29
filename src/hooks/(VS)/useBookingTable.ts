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
      console.log("📤 Fetching stats with: ", {
        viewMode,
        location,
        month,
        year,
      });

      setLoading(true);
      setError(null);
      
      const response = await getWeeklyTargetStats({
        viewMode,
        location: location === "all" ? undefined : location,
        month,
        year,
      });

      console.log("📥 Stats API response:", response);

      setStats(response);
    } catch (err: any) {
      console.error("❌ Error fetching target stats:", err);
      setError(err.message || "Failed to fetch target stats");
    } finally {
      console.log("⏳ Stats fetch finished");
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      console.log("📤 Fetching available locations...");

      const locs = await getAvailableLocations();

      console.log("📥 Locations received:", locs);

      setLocations(locs);
    } catch (err) {
      console.error("❌ Error fetching locations:", err);
    }
  };

  useEffect(() => {
    console.log(
      "🚀 useTargetStats mounted → fetching locations + initial stats..."
    );
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
