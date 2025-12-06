import { useEffect, useState } from "react";

import { getLeadGenLeadsCount, getTodayLeads } from "@/actions/(VS)/queryActions";

interface TodaysLeadsInterface {
  locations: {
    location: string;
    count: number;
  }[];
  total: number;
  agent: string;
  createdBy: string;
}


interface LeadGenChartData {
  date: string;
  [createdBy: string]: number | string; // dynamic keys for each createdBy
}

const useTodayLeads = () => {
  const [leads, setLeads] = useState<TodaysLeadsInterface[]>();
  const [chartData1, setChartData] = useState<LeadGenChartData[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  // const [average, setAverage] = useState(0);
  const locations = ["athens", "thessaloniki", "chania", "milan"];
  const [todayLeadStats, setTodayLeadStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  // Fetch Leads
  const fetchLeads = async () => {
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      const response = await getTodayLeads();
      // const res = await getAverage();
      // console.log("res", res.totalTarget);
      // setAverage(res.totalTarget);
      setLeads(response.serializedLeads);
      setTotalLeads(response.totalLeads);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeadsByLeadGen = async (period: "month" | "year" | "30days") => {
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      const response = await getLeadGenLeadsCount(period);

      setChartData(response.chartData as LeadGenChartData[]);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

 



  useEffect(() => {
    fetchLeads();
    fetchLeadsByLeadGen("month");
    // fetchAverage();
  }, []);

  useEffect(() => {
    // Compute todayLeadStats from the leads data we already fetched
    if (leads && leads.length > 0) {
      const leadsMap: Record<string, number> = {};
      locations.forEach((loc) => {
        // Sum up counts for each location across all agents
        let totalForLocation = 0;
        leads.forEach((lead) => {
          const locationData = lead.locations?.find(
            (l) => l.location?.toLowerCase() === loc.toLowerCase()
          );
          if (locationData) {
            totalForLocation += locationData.count;
          }
        });
        leadsMap[loc] = totalForLocation;
      });
      setTodayLeadStats(leadsMap);
    }
  }, [leads]);

  const refetch = () => fetchLeads();

  return {
    leads,
    totalLeads,
    todayLeadStats,
    isLoading,
    isError,
    error,
    refetch,
    fetchLeadsByLeadGen,
    chartData1
  };
};

export default useTodayLeads;
