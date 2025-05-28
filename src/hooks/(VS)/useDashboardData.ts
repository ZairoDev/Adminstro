import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

import { getDashboardData } from "@/actions/(VS)/queryActions";

const useDashboardData = ({ date }: { date: DateRange | undefined }) => {
  const [dashboardData, setDashboardData] = useState<any[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  // Fetch Dashboard Data
  const fetchDashboardData = async ({ date }: { date: DateRange | undefined }) => {
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      const response = await getDashboardData({ date });
      // console.log("dathboard data: ", response);
      setDashboardData(response.dashboardData);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData({ date });
  }, []);

  const refetch = () => fetchDashboardData({ date });
  const reset = () => fetchDashboardData({ date: undefined });

  return {
    dashboardData,
    isLoading,
    isError,
    error,
    refetch,
    reset,
  };
};

export default useDashboardData;
