import { getLocationLeadStats } from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

const useLeadStats = () => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [direction, setDirection] = useState<"left" | "right">("right");
  const previousMonthRef = useRef<Date>(new Date());

  const monthKey = `${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`;

  const { data: leadStats = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leadStats", "All", monthKey],
    queryFn: async () => {
      const response = await getLocationLeadStats(selectedMonth);
      return response.visits;
    },
  });

  const handleMonthChange = (newMonth: Date) => {
    const prevTime = previousMonthRef.current.getTime();
    const newTime = newMonth.getTime();
    setDirection(newTime > prevTime ? "right" : "left");
    previousMonthRef.current = newMonth;
    setSelectedMonth(newMonth);
  };

  const fetchLeadStats = (month: Date) => {
    handleMonthChange(month);
  };

  return {
    leadStats,
    statsLoading: isLoading,
    setStatsLoading: () => undefined,
    statsError: isError,
    setStatsError: () => undefined,
    statsErrMsg: error instanceof Error ? error.message : "",
    setStatsErrMsg: () => undefined,
    fetchLeadStats,
    selectedMonth,
    setSelectedMonth: handleMonthChange,
    direction,
  };
};

export default useLeadStats;
