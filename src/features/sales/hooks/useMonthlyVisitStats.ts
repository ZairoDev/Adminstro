import {
  getMonthlyVisitStats,
  type MonthlyCityVisitStat,
} from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";

const useMonthlyVisitStats = (selectedMonth?: Date) => {
  const monthKey = selectedMonth
    ? `${selectedMonth.getUTCFullYear()}-${selectedMonth.getUTCMonth()}`
    : "current";

  const { data: monthlyStats = [], isLoading, isError, error, refetch } =
    useQuery({
      queryKey: ["monthlyVisitStats", monthKey],
      queryFn: () => getMonthlyVisitStats(selectedMonth),
    });

  const fetchMonthlyVisitStats = async (month?: Date) => {
    await refetch();
    void month;
  };

  return {
    monthlyStats: monthlyStats as MonthlyCityVisitStat[],
    loading: isLoading,
    error: isError,
    errMsg: error instanceof Error ? error.message : "",
    fetchMonthlyVisitStats,
  };
};

export default useMonthlyVisitStats;
