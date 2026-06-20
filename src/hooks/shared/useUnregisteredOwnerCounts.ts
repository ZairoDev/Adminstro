import { getUnregisteredOwnerCounts } from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type UnregisteredOwnerFilters = { days?: string };

const useUnregisteredOwnerCounts = () => {
  const [filters, setFilters] = useState<UnregisteredOwnerFilters>({
    days: "12 days",
  });

  const { data: unregisteredOwnerCounts = [], isLoading, isError, error } =
    useQuery({
      queryKey: ["unregisteredOwnerCounts", filters],
      queryFn: async () => {
        const response = await getUnregisteredOwnerCounts({ days: filters.days });
        return response.map(({ date, owners }: { date: string; owners: number }) => ({
          date,
          owners: owners ?? 0,
        }));
      },
    });

  const fetchUnregisteredOwnerCounts = ({ days }: { days?: string }) => {
    setFilters((prev) => ({ ...prev, days }));
  };

  return {
    loading: isLoading,
    isError,
    error: error instanceof Error ? error.message : "",
    unregisteredOwnerCounts,
    fetchUnregisteredOwnerCounts,
    setUnregisteredOwnerCounts: () => undefined,
  };
};

export default useUnregisteredOwnerCounts;
