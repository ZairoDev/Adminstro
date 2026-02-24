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
  const activeRequestRef = useRef<number>(0);

  const fetchLeadStats = async (month: Date, requestId: number) => {
    try {
      setStatsLoading(true);
      setStatsError(false);
      setStatsErrMsg("");
      
      
      
      const response = await getLocationLeadStats(month);
      
      
      
      // Only update if this is still the active request
      if (activeRequestRef.current === requestId) {
        setLeadStats(response.visits);
        
      } else {
        
      }
    } catch (err: any) {
      if (activeRequestRef.current === requestId) {
        const error = new Error(err);
        setStatsError(true);
        setStatsErrMsg(error.message);
      }
    } finally {
      if (activeRequestRef.current === requestId) {
        setStatsLoading(false);
      }
    }
  };

  const handleMonthChange = (newMonth: Date) => {
    
    
    // Determine direction
    const prevTime = previousMonthRef.current.getTime();
    const newTime = newMonth.getTime();
    
    setDirection(newTime > prevTime ? "right" : "left");
    previousMonthRef.current = newMonth;
    
    // Update month state
    setSelectedMonth(newMonth);
  };

  // Fetch data whenever selectedMonth changes
  useEffect(() => {
    // Increment request ID to invalidate previous requests
    activeRequestRef.current += 1;
    const currentRequestId = activeRequestRef.current;
    
    
    
    fetchLeadStats(selectedMonth, currentRequestId);

    // Cleanup function
    return () => {
    };
  }, [selectedMonth]);

  return {
    leadStats,
    statsLoading,
    setStatsLoading,
    statsError,
    setStatsError,
    statsErrMsg,
    setStatsErrMsg,
    fetchLeadStats: (month: Date) => {
      activeRequestRef.current += 1;
      fetchLeadStats(month, activeRequestRef.current);
    },
    selectedMonth,
    setSelectedMonth: handleMonthChange,
    direction,
  };
};

export default useLeadStats;
