import { getLocationLeadStats } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

const useLeadStats = () => {
  const [leadStats, setLeadStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [statsErrMsg, setStatsErrMsg] = useState("");

  const fetchLeadStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError(false);
      setStatsErrMsg("");
      
      const response = await getLocationLeadStats();
      setLeadStats(response.visits); // our function returns { visits }
      console.log("leadStats: ", response.visits
        
      );
    } catch (err: any) {
      const error = new Error(err);
      setStatsError(true);
      setStatsErrMsg(error.message);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadStats();
  }, []);

  return {
    leadStats,
    statsLoading,
    setStatsLoading,
    statsError,
    setStatsError,
    statsErrMsg,
    setStatsErrMsg,
    fetchLeadStats,
  };
};

export default useLeadStats;
