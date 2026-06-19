import { getLocationVisitStats } from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

const useVisitStats = () => {
  const [selectedVisitMonth, setSelectedVisitMonth] = useState<Date>(new Date());
  const [directionVisit, setDirectionVisit] = useState<"left" | "right">("right");
  const previousMonthRef = useRef<Date>(new Date());

  const monthKey = `${selectedVisitMonth.getFullYear()}-${selectedVisitMonth.getMonth()}`;

  const { data: visitStats = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["visitStats", "All", monthKey],
    queryFn: async () => {
      const response = await getLocationVisitStats(selectedVisitMonth);
      return response.visits;
    },
  });

  const handleMonthChange = (newMonth: Date) => {
    const prevTime = previousMonthRef.current.getTime();
    const newTime = newMonth.getTime();
    setDirectionVisit(newTime > prevTime ? "right" : "left");
    previousMonthRef.current = newMonth;
    setSelectedVisitMonth(newMonth);
  };

  const fetchVisitStats = (month: Date) => {
    handleMonthChange(month);
  };

  return {
    visitStats,
    visitStatsLoading: isLoading,
    setVisitStatsLoading: () => undefined,
    visitStatsError: isError,
    setVisitStatsError: () => undefined,
    visitStatsErrMsg: error instanceof Error ? error.message : "",
    setVisitStatsErrMsg: () => undefined,
    fetchVisitStats,
    selectedVisitMonth,
    setSelectedVisitMonth: handleMonthChange,
    directionVisit,
  };
};

export default useVisitStats;
