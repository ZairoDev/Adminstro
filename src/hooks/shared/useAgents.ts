import { useQuery } from "@tanstack/react-query";

import { getAllAgent } from "@/actions/(VS)/queryActions";

/** LeadGen agent emails returned by getAllAgent (used in filter dropdowns). */
export type AgentEmail = string;

export function useAgents() {
  const { data, isLoading, isError, error } = useQuery<AgentEmail[]>({
    queryKey: ["agents"],
    queryFn: () => getAllAgent(),
    staleTime: 10 * 60 * 1000,
  });

  return {
    agents: data ?? [],
    isLoading,
    isError,
    error: error instanceof Error ? error.message : "",
  };
}
