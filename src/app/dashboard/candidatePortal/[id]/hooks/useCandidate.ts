import { useState, useEffect, useCallback } from "react";
import { Candidate } from "../types";

export function useCandidate(candidateId: string) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidate = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      if (!candidateId) return;

      const showSpinner = mode === "initial";
      try {
        if (showSpinner) setLoading(true);
        const response = await fetch(`/api/candidates/${candidateId}`);
        const result = await response.json();

        if (result.success) {
          setCandidate(result.data);
          setError(null);
        } else if (showSpinner) {
          setError(result.error || "Failed to fetch candidate");
        }
      } catch (err) {
        console.error("Error fetching candidate:", err);
        if (showSpinner) {
          setError("Failed to fetch candidate");
        }
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [candidateId]
  );

  useEffect(() => {
    void fetchCandidate("initial");
  }, [fetchCandidate]);

  return {
    candidate,
    loading,
    error,
    refreshCandidate: () => fetchCandidate("refresh"),
    setCandidate,
  };
}
