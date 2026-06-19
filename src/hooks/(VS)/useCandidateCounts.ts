import {
  getCandidateCounts,
  getCandidatePositions,
  getCandidateSummary,
} from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

export interface CandidateCountData {
  date: string;
  pending: number;
  shortlisted: number;
  selected: number;
  rejected: number;
  onboarding: number;
  interviews: number;
  rejectedAfterTraining: number;
  total: number;
}

export interface CandidateSummary {
  pending: number;
  shortlisted: number;
  selected: number;
  rejected: number;
  onboarding: number;
  interviews: number;
  rejectedAfterTraining: number;
  total: number;
}

export interface CandidateFilters {
  days?: string;
  position?: string;
  selectedMonth?: Date;
}

const defaultSummary: CandidateSummary = {
  pending: 0,
  shortlisted: 0,
  selected: 0,
  rejected: 0,
  onboarding: 0,
  interviews: 0,
  rejectedAfterTraining: 0,
  total: 0,
};

const useCandidateCounts = () => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [direction, setDirection] = useState<"left" | "right">("right");
  const previousMonthRef = useRef<Date>(new Date());
  const [filters, setFilters] = useState<CandidateFilters>({ days: "this month" });

  const monthKey = `${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`;

  const countsQuery = useQuery({
    queryKey: ["candidateCounts", filters.days, filters.position ?? null, monthKey],
    queryFn: async () => {
      const [countsResponse, summaryResponse] = await Promise.all([
        getCandidateCounts({
          days: filters.days,
          position: filters.position,
          selectedMonth,
        }),
        getCandidateSummary({
          position: filters.position,
          selectedMonth,
        }),
      ]);
      return {
        candidateCounts: countsResponse as CandidateCountData[],
        summary: summaryResponse as CandidateSummary,
      };
    },
  });

  const positionsQuery = useQuery({
    queryKey: ["candidateCounts", "positions"],
    queryFn: () => getCandidatePositions(),
  });

  const handleMonthChange = (newMonth: Date) => {
    const prevTime = previousMonthRef.current.getTime();
    const newTime = newMonth.getTime();
    setDirection(newTime > prevTime ? "right" : "left");
    previousMonthRef.current = newMonth;
    setSelectedMonth(newMonth);
  };

  const fetchCandidateCounts = (nextFilters: CandidateFilters) => {
    setFilters((prev) => ({ ...prev, ...nextFilters }));
    if (nextFilters.selectedMonth) {
      handleMonthChange(nextFilters.selectedMonth);
    }
  };

  return {
    loading: countsQuery.isLoading,
    isError: countsQuery.isError,
    error: countsQuery.error instanceof Error ? countsQuery.error.message : "",
    candidateCounts: countsQuery.data?.candidateCounts ?? [],
    positions: positionsQuery.data ?? [],
    summary: countsQuery.data?.summary ?? defaultSummary,
    fetchCandidateCounts,
    selectedMonth,
    setSelectedMonth: handleMonthChange,
    direction,
  };
};

export default useCandidateCounts;
