import { useQuery } from "@tanstack/react-query";
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
  const dateFromKey = date?.from?.toISOString() ?? null;
  const dateToKey = date?.to?.toISOString() ?? null;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leadsGroupedByLocation", agentEmail, dateFromKey, dateToKey],
    queryFn: () => getGroupedLeadsByLocation({ agentEmail, date }),
    enabled: Boolean(agentEmail),
  });

  return {
    leads: data as LeadsByLocation[] | undefined,
    isLoading,
    isError,
    error: error instanceof Error ? error.message : "",
    refetch: () => {
      void refetch();
    },
  };
};

export default useLeadsGroupedByLocation;
