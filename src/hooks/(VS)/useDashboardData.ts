import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";

import { getDashboardData } from "@/actions/(VS)/queryActions";

const useDashboardData = ({ date }: { date: DateRange | undefined }) => {
  const dateFromKey = date?.from?.toISOString() ?? null;
  const dateToKey = date?.to?.toISOString() ?? null;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboardData", dateFromKey, dateToKey],
    queryFn: async () => {
      const response = await getDashboardData({ date });
      return response.dashboardData;
    },
  });

  const refetchDashboardData = () => {
    void refetch();
  };

  const resetDashboardData = async () => {
    const response = await getDashboardData({ date: undefined });
    return response.dashboardData;
  };

  return {
    dashboardData: data,
    isLoading,
    isError,
    error: error instanceof Error ? error.message : "",
    refetch: refetchDashboardData,
    reset: resetDashboardData,
  };
};

export default useDashboardData;
