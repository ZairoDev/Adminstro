import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

import { getGroupedLeadsByLocation } from "@/actions/(VS)/queryActions";

interface LeadsByLocation {
  _id: string;
  count: number;
}

const useLeadsGroupedByLocation = ({
  agentEmail,
  date,
}: {
  agentEmail: string;
  date: DateRange | undefined;
}) => {
  const [leads, setLeads] = useState<LeadsByLocation[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  // Fetch Leads
  const fetchLeads = async () => {
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      console.log("agentEmail in useLeadsGroupedByLocation: ", agentEmail);
      const response = await getGroupedLeadsByLocation({ agentEmail, date });
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

export default useLeadsGroupedByLocation;
