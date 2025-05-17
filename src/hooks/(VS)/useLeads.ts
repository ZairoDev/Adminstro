import { useEffect, useState } from "react";

import { getGroupedLeads } from "@/actions/(VS)/queryActions";
import { DateRange } from "react-day-picker";

interface GroupedLeads {
  leadsByAgent: {
    _id: string;
    count: number;
  }[];
  leadsByLocation: {
    _id: string;
    count: number;
  }[];
}

const useLeads = ({ date }: { date: DateRange | undefined }) => {
  const [leads, setLeads] = useState<GroupedLeads>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  // Fetch Leads
  const fetchLeads = async () => {
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      const response = await getGroupedLeads({ date });
      setLeads(response);
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
    isLoading,
    isError,
    error,
    refetch,
  };
};

export default useLeads;
