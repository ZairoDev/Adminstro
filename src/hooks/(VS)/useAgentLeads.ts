import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

import { IQuery } from "@/util/type";
import { getLeadsByAgent } from "@/actions/(VS)/queryActions";

const useAgentLeads = (
  agentEmail: string,
  location: string,
  date: DateRange | undefined,
  page: number
) => {
  console.log("params agent & location: ", agentEmail, location, page);
  const [leads, setLeads] = useState<IQuery[]>();
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
      const response = await getLeadsByAgent(agentEmail, location, date, page);
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
  }, [agentEmail, location, page]);

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

export default useAgentLeads;
