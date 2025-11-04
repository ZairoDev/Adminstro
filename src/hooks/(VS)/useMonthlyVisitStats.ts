import { getMonthlyVisitStats } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

const useMonthlyVisitStats = (monthName?: string) => {
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const fetchMonthlyVisitStats = async () => {
    try {
      setLoading(true);
      setError(false);
      setErrMsg("");

      // 🔹 call your backend action
      const response = await getMonthlyVisitStats(monthName);

      // if function returns array like [{ location: "Kanpur", visits: 120 }]
      setMonthlyStats(response);
      console.log("📆 Monthly Visit Stats:", response);

    } catch (err: any) {
      setError(true);
      setErrMsg(err.message || "Failed to fetch monthly visit stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyVisitStats();
  }, [monthName]);

  return {
    monthlyStats,
    loading,
    error,
    errMsg,
    fetchMonthlyVisitStats,
  };
};

export default useMonthlyVisitStats;
