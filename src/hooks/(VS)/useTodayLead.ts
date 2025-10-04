import { useEffect, useState } from "react";
// import { DateRange } from "react-day-picker";

import { getAverage, getLeadGenLeadsCount, getTodayLeads } from "@/actions/(VS)/queryActions";
import { get } from "http";
import { set } from "mongoose";
import axios from "axios";

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

  const fetchLeadsByLeadGen = async () => {
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      const response = await getLeadGenLeadsCount("30days");
      console.log("response", response);
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
    fetchLeadsByLeadGen();
    // fetchAverage();
  }, []);

  useEffect(() => {
    const fetchLeadStats = async () => {
      try {
        const res = await axios.get("/api/getLeadStats");
        const data: { location: string; totalLeads: number }[] = res.data;

        const leadsMap: Record<string, number> = {};
        locations.forEach((loc) => {
          const found = data.find((d) => d.location === loc);
          leadsMap[loc] = found?.totalLeads || 0;
        });

        setTodayLeadStats(leadsMap);
      } catch (err) {
        console.error(err);
      }
    };

    fetchLeadStats();
  }, []);

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
