import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

import { getGroupedLeadsByAgents } from "@/actions/(VS)/queryActions";

interface LeadsByAgent {
  _id: string;
  count: number;
}

const useLeadsGroupedByAgents = ({
  location,
  date,
}: {
  location: string;
  date: DateRange | undefined;
}) => {
  const [leads, setLeads] = useState<LeadsByAgent[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  // Fetch Leads
  const fetchLeads = async () => {
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      const response = await getGroupedLeadsByAgents({ location, date });
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

export default useLeadsGroupedByAgents;
