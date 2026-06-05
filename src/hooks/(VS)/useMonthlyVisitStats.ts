import {
  getMonthlyVisitStats,
  type MonthlyCityVisitStat,
} from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

const useMonthlyVisitStats = (selectedMonth?: Date) => {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyCityVisitStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const fetchMonthlyVisitStats = async (month?: Date) => {
    try {
      setLoading(true);
      setError(false);
      setErrMsg("");

      const response = await getMonthlyVisitStats(month ?? selectedMonth);

      // if function returns array like [{ location: "Kanpur", visits: 120 }]
      setMonthlyStats(response);
      // console.log("📆 Monthly Visit Stats:", response);

    } catch (err: unknown) {
      setError(true);
      setErrMsg(
        err instanceof Error ? err.message : "Failed to fetch monthly visit stats",
      );
    } finally {
      setLoading(false);
    }
  };

  const monthKey = selectedMonth
    ? `${selectedMonth.getUTCFullYear()}-${selectedMonth.getUTCMonth()}`
    : "current";

  useEffect(() => {
    void fetchMonthlyVisitStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  return {
    monthlyStats,
    loading,
    error,
    errMsg,
    fetchMonthlyVisitStats,
  };
};

export default useMonthlyVisitStats;
