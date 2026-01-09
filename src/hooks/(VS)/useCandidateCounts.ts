import { getCandidateCounts, getCandidatePositions, getCandidateSummary } from "@/actions/(VS)/queryActions";
import { useEffect, useState, useCallback, useRef } from "react";

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

const useCandidateCounts = () => {
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");
  const [candidateCounts, setCandidateCounts] = useState<CandidateCountData[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [direction, setDirection] = useState<"left" | "right">("right");
  const previousMonthRef = useRef<Date>(new Date());
  const [summary, setSummary] = useState<CandidateSummary>({
    pending: 0,
    shortlisted: 0,
    selected: 0,
    rejected: 0,
    onboarding: 0,
    interviews: 0,
    rejectedAfterTraining: 0,
    total: 0,
  });

  const handleMonthChange = (newMonth: Date) => {
    // Determine direction based on whether we're going forward or backward
    const prevTime = previousMonthRef.current.getTime();
    const newTime = newMonth.getTime();
    
    setDirection(newTime > prevTime ? "right" : "left");
    previousMonthRef.current = newMonth;
    setSelectedMonth(newMonth);
  };

  const fetchCandidateCounts = useCallback(async (filters: CandidateFilters) => {
    try {
      setLoading(true);
      setIsError(false);
      setError("");
      
      const [countsResponse, summaryResponse] = await Promise.all([
        getCandidateCounts({
          days: filters.days,
          position: filters.position,
          selectedMonth: filters.selectedMonth,
        }),
        getCandidateSummary({ 
          position: filters.position,
          selectedMonth: filters.selectedMonth,
        }),
      ]);
      
      setCandidateCounts(countsResponse);
      setSummary(summaryResponse);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPositions = useCallback(async () => {
    try {
      const positionsResponse = await getCandidatePositions();
      setPositions(positionsResponse);
    } catch (err) {
      console.error("Error fetching positions:", err);
    }
  }, []);

  // Fetch data whenever selectedMonth changes
  useEffect(() => {
    fetchCandidateCounts({ 
      days: "this month",
      selectedMonth: selectedMonth 
    });
  }, [selectedMonth, fetchCandidateCounts]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return {
    loading,
    isError,
    error,
    candidateCounts,
    positions,
    summary,
    fetchCandidateCounts,
    selectedMonth,
    setSelectedMonth: handleMonthChange,
    direction,
  };
};

export default useCandidateCounts;
