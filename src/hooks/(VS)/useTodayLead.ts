import { useEffect, useState } from "react";
// import { DateRange } from "react-day-picker";

import { getTodayLeads } from "@/actions/(VS)/queryActions";

interface TodaysLeadsInterface {
  locations: {
    location: string;
    count: number;
  }[];
  total: number;
  agent: string;
  createdBy: string;
}

const useTodayLeads = () => {
  const [leads, setLeads] = useState<TodaysLeadsInterface[]>();
  const [totalLeads, setTotalLeads] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  // Fetch Leads
  const fetchLeads = async () => {
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      const response = await getTodayLeads();
      setLeads(response.serializedLeads);
      setTotalLeads(response.totalLeads);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const refetch = () => fetchLeads();

  return {
    leads,
    totalLeads,
    isLoading,
    isError,
    error,
    refetch,
  };
};

export default useTodayLeads;
