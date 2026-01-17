import { useState, useEffect } from "react";
import axios from "axios";

interface ReplyCountByLocation {
  location: string;
  replied: number;
  notReplied: number;
  notDelivered: number;
  total: number;
}

interface ReplyCountsFilters {
  days?: string;
  createdBy?: string;
}

const useReplyCountsByLocation = () => {
  const [replyCountsByLocation, setReplyCountsByLocation] = useState<ReplyCountByLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  const fetchReplyCountsByLocation = async (filters: ReplyCountsFilters = {}) => {
    setLoading(true);
    setIsError(false);
    setError("");

    try {
      const params = new URLSearchParams();
      if (filters.days) params.append("days", filters.days);
      if (filters.createdBy) params.append("createdBy", filters.createdBy);

      const response = await axios.get(
        `/api/leads/getReplyCountsByLocation?${params.toString()}`
      );
      if (response.data.success) {
        setReplyCountsByLocation(response.data.data || []);
      } else {
        setIsError(true);
        setError(response.data.message || "Failed to fetch reply counts");
      }
    } catch (err: any) {
      setIsError(true);
      setError(err.message || "Failed to fetch reply counts by location");
      console.error("Error fetching reply counts by location:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount with default filters
  useEffect(() => {
    fetchReplyCountsByLocation({ days: "this month" });
  }, []);

  return {
    replyCountsByLocation,
    loading,
    isError,
    error,
    fetchReplyCountsByLocation,
  };
};

export default useReplyCountsByLocation;
