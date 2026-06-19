import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";

import { IQuery } from "@/util/type";
import { getLeadsByAgent } from "@/actions/(VS)/queryActions";

const useAgentLeads = (
  agentEmail: string,
  location: string,
  date: DateRange | undefined,
  page: number,
) => {
  const dateFromKey = date?.from?.toISOString() ?? null;
  const dateToKey = date?.to?.toISOString() ?? null;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["agentLeads", agentEmail, location, page, dateFromKey, dateToKey],
    queryFn: () => getLeadsByAgent(agentEmail, location, date, page),
    enabled: Boolean(agentEmail),
  });

  return {
    leads: data?.serializedLeads as IQuery[] | undefined,
    totalLeads: data?.totalLeads ?? 0,
    isLoading,
    isError,
    error: error instanceof Error ? error.message : "",
    refetch: () => {
      void refetch();
    },
  };
};

export default useAgentLeads;
