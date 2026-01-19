import { useState, useEffect } from "react";
import { Candidate } from "../types";

export function useCandidate(candidateId: string) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/candidates/${candidateId}`);
      const result = await response.json();

      if (result.success) {
        setCandidate(result.data);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch candidate");
      }
    } catch (err) {
      console.error("Error fetching candidate:", err);
      setError("Failed to fetch candidate");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (candidateId) {
      fetchCandidate();
    }
  }, [candidateId]);

  return {
    candidate,
    loading,
    error,
    refreshCandidate: fetchCandidate,
    setCandidate,
  };
}

