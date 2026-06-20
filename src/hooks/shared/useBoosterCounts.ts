import { getBoostCounts } from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type BoostFilters = { days?: string };

type BoostRow = {
  date: string;
  total: number;
  newBoosts: number;
  reboosts: number;
  posted: number;
};

const BoostCounts = () => {
  const [filters, setFilters] = useState<BoostFilters>({ days: "this month" });
  const [activeBoosts, setActiveBoosts] = useState(0);
  const [inactiveBoosts, setInactiveBoosts] = useState(0);

  const { data: totalBoosts = [], isLoading, isError, error } = useQuery({
    queryKey: ["boostCounts", filters],
    queryFn: async (): Promise<BoostRow[]> => {
      const response = await getBoostCounts({ days: filters.days });
      return response.map(
        ({
          date,
          total,
          newBoosts,
          reboosts,
          posted,
        }: {
          date: string;
          total?: number;
          newBoosts: number;
          reboosts: number;
          posted: number;
        }) => ({
          date,
          total: total ?? 0,
          newBoosts,
          reboosts,
          posted,
        }),
      );
    },
  });

  const fetchBoostCounts = ({ days }: { days?: string }) => {
    setFilters((prev) => ({ ...prev, days }));
  };

  return {
    loading: isLoading,
    setLoading: () => undefined,
    isError,
    setIsError: () => undefined,
    error: error instanceof Error ? error.message : "",
    setError: () => undefined,
    totalBoosts,
    setTotalBoosts: () => undefined,
    activeBoosts,
    setActiveBoosts,
    inactiveBoosts,
    setInactiveBoosts,
    fetchBoostCounts,
  };
};

export default BoostCounts;
