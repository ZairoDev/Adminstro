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
      
      console.log(`[Request ${requestId}] Fetching data for:`, month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
      
      const response = await getLocationLeadStats(month);
      
      console.log(`[Request ${requestId}] Received data for:`, month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
      
      // Only update if this is still the active request
      if (activeRequestRef.current === requestId) {
        setLeadStats(response.visits);
        console.log(`[Request ${requestId}] ✅ Applied data for:`, month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
      } else {
        console.log(`[Request ${requestId}] ❌ Discarded stale data for:`, month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), `(active: ${activeRequestRef.current})`);
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
    console.log("📅 Month changed to:", newMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    
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
    
    console.log(`[Request ${currentRequestId}] useEffect triggered for:`, selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    
    fetchLeadStats(selectedMonth, currentRequestId);

    // Cleanup function
    return () => {
      console.log(`[Request ${currentRequestId}] 🧹 Cleanup - cancelling request for:`, selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
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
