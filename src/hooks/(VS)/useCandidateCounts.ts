import { getCandidateCounts, getCandidatePositions, getCandidateSummary } from "@/actions/(VS)/queryActions";
import { useEffect, useState, useCallback } from "react";

export interface CandidateCountData {
  date: string;
  pending: number;
  shortlisted: number;
  selected: number;
  rejected: number;
  onboarding: number;
  total: number;
}

export interface CandidateSummary {
  pending: number;
  shortlisted: number;
  selected: number;
  rejected: number;
  onboarding: number;
  total: number;
}

export interface CandidateFilters {
  days?: string;
  position?: string;
}

const useCandidateCounts = () => {
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");
  const [candidateCounts, setCandidateCounts] = useState<CandidateCountData[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [summary, setSummary] = useState<CandidateSummary>({
    pending: 0,
    shortlisted: 0,
    selected: 0,
    rejected: 0,
    onboarding: 0,
    total: 0,
  });

  const fetchCandidateCounts = useCallback(async (filters: CandidateFilters) => {
    try {
      setLoading(true);
      setIsError(false);
      setError("");
      
      const [countsResponse, summaryResponse] = await Promise.all([
        getCandidateCounts(filters),
        getCandidateSummary({ position: filters.position }),
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

  useEffect(() => {
    fetchCandidateCounts({ days: "this month" });
    fetchPositions();
  }, [fetchCandidateCounts, fetchPositions]);

  return {
    loading,
    isError,
    error,
    candidateCounts,
    positions,
    summary,
    fetchCandidateCounts,
  };
};

export default useCandidateCounts;
