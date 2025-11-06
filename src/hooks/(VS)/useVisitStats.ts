import {  getLocationVisitStats } from "@/actions/(VS)/queryActions";
import { useEffect, useRef, useState } from "react";

const useVisitStats = () => {
  const [visitStats, setVisitStats] = useState<any[]>([]);
  const [visitStatsLoading, setVisitStatsLoading] = useState(false);
  const [visitStatsError, setVisitStatsError] = useState(false);
  const [visitStatsErrMsg, setVisitStatsErrMsg] = useState("");
   const [selectedVisitMonth, setSelectedVisitMonth] = useState<Date>(new Date());
    const [directionVisit, setDirectionVisit] = useState<"left" | "right">("right");
    

      const previousMonthRef = useRef<Date>(new Date());

  const fetchVisitStats = async (month:Date) => {
    try {
      setVisitStatsLoading(true);
      setVisitStatsError(false);
      setVisitStatsErrMsg("");
      
      const response = await getLocationVisitStats(month);
      setVisitStats(response.visits); // our function returns { visits }
      console.log("leadStats: ", response.visits
        
      );
    } catch (err: any) {
      const error = new Error(err);
      setVisitStatsError(true);
      setVisitStatsErrMsg(error.message);
    } finally {
      setVisitStatsLoading(false);
    }
  };

    const handleMonthChange = (newMonth: Date) => {
    // Determine direction based on whether we're going forward or backward
    const prevTime = previousMonthRef.current.getTime();
    const newTime = newMonth.getTime();
    
    setDirectionVisit(newTime > prevTime ? "right" : "left");
    previousMonthRef.current = newMonth;
    setSelectedVisitMonth(newMonth);
  };



  useEffect(() => {
    fetchVisitStats(selectedVisitMonth);
  }, [selectedVisitMonth]);

  return {
    visitStats,
    visitStatsLoading,
    setVisitStatsLoading,
    visitStatsError,
    setVisitStatsError,
    visitStatsErrMsg,
    setVisitStatsErrMsg,
    fetchVisitStats,
     selectedVisitMonth,
    setSelectedVisitMonth: handleMonthChange,
    directionVisit,
  };
};

export default useVisitStats;
