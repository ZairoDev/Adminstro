import {  getLocationVisitStats } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

const useVisitStats = () => {
  const [visitStats, setVisitStats] = useState<any[]>([]);
  const [visitStatsLoading, setVisitStatsLoading] = useState(false);
  const [visitStatsError, setVisitStatsError] = useState(false);
  const [visitStatsErrMsg, setVisitStatsErrMsg] = useState("");

  const fetchVisitStats = async () => {
    try {
      setVisitStatsLoading(true);
      setVisitStatsError(false);
      setVisitStatsErrMsg("");
      
      const response = await getLocationVisitStats();
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

  useEffect(() => {
    fetchVisitStats();
  }, []);

  return {
    visitStats,
    visitStatsLoading,
    setVisitStatsLoading,
    visitStatsError,
    setVisitStatsError,
    visitStatsErrMsg,
    setVisitStatsErrMsg,
    fetchVisitStats,
  };
};

export default useVisitStats;
