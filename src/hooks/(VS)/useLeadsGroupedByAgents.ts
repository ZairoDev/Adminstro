import { useQuery } from "@tanstack/react-query";
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
  const dateFromKey = date?.from?.toISOString() ?? null;
  const dateToKey = date?.to?.toISOString() ?? null;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leadsGroupedByAgents", location, dateFromKey, dateToKey],
    queryFn: () => getGroupedLeadsByAgents({ location, date }),
    enabled: Boolean(location),
  });

  return {
    leads: data as LeadsByAgent[] | undefined,
    isLoading,
    isError,
    error: error instanceof Error ? error.message : "",
    refetch: () => {
      void refetch();
    },
  };
};

export default useLeadsGroupedByAgents;
