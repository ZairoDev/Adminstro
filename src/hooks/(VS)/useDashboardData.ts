import { useEffect, useState } from "react";
// import { DateRange } from "react-day-picker";

import { getDashboardData } from "@/actions/(VS)/queryActions";

const useDashboardData = () => {
  const [dashboardData, setDashboardData] = useState<any[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      const response = await getDashboardData();
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
    fetchDashboardData();
  }, []);

  const refetch = () => fetchDashboardData();

  return {
    dashboardData,
    isLoading,
    isError,
    error,
    refetch,
  };
};

export default useDashboardData;
