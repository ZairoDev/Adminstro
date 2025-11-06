import { getLocationLeadStats } from "@/actions/(VS)/queryActions";
import { useEffect, useState, useRef } from "react";

const useLeadStats = () => {
  const [leadStats, setLeadStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [statsErrMsg, setStatsErrMsg] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [direction, setDirection] = useState<"left" | "right">("right");
  
  const previousMonthRef = useRef<Date>(new Date());

  const fetchLeadStats = async (month: Date) => {
    try {
      setStatsLoading(true);
      setStatsError(false);
      setStatsErrMsg("");
      
      const response = await getLocationLeadStats(month);
      setLeadStats(response.visits);
      console.log("leadStats: ", response.visits);
    } catch (err: any) {
      const error = new Error(err);
      setStatsError(true);
      setStatsErrMsg(error.message);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleMonthChange = (newMonth: Date) => {
    // Determine direction based on whether we're going forward or backward
    const prevTime = previousMonthRef.current.getTime();
    const newTime = newMonth.getTime();
    
    setDirection(newTime > prevTime ? "right" : "left");
    previousMonthRef.current = newMonth;
    setSelectedMonth(newMonth);
  };

  useEffect(() => {
    fetchLeadStats(selectedMonth);
  }, [selectedMonth]);

  return {
    leadStats,
    statsLoading,
    setStatsLoading,
    statsError,
    setStatsError,
    statsErrMsg,
    setStatsErrMsg,
    fetchLeadStats,
    selectedMonth,
    setSelectedMonth: handleMonthChange,
    direction,
  };
};

export default useLeadStats;