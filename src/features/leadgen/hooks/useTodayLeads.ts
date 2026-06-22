import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getLeadGenLeadsCount, getTodayLeads } from "@/actions/(VS)/queryActions";
import { toDateKey } from "@/lib/date/dayKey";

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
  [createdBy: string]: number | string;
}

const LOCATIONS = ["athens", "thessaloniki", "chania", "milan"];

const useTodayLeads = () => {
  const [chartPeriod, setChartPeriod] = useState<"month" | "year" | "30days">(
    "month",
  );

  const todayKey = toDateKey(new Date());

  const todayQuery = useQuery({
    queryKey: ["todayLeads", todayKey],
    queryFn: () => getTodayLeads(todayKey),
  });

  const chartQuery = useQuery({
    queryKey: ["todayLeads", "chart", chartPeriod],
    queryFn: () => getLeadGenLeadsCount(chartPeriod),
  });

  const leads = todayQuery.data?.serializedLeads as TodaysLeadsInterface[] | undefined;
  const totalLeads = todayQuery.data?.totalLeads ?? 0;
  const chartData1 = (chartQuery.data?.chartData ?? []) as LeadGenChartData[];

  const todayLeadStats = useMemo(() => {
    if (!leads?.length) {
      return {} as Record<string, number>;
    }
    const leadsMap: Record<string, number> = {};
    LOCATIONS.forEach((loc) => {
      let totalForLocation = 0;
      leads.forEach((lead) => {
        const locationData = lead.locations?.find(
          (l) => l.location?.toLowerCase() === loc.toLowerCase(),
        );
        if (locationData) {
          totalForLocation += locationData.count;
        }
      });
      leadsMap[loc] = totalForLocation;
    });
    return leadsMap;
  }, [leads]);

  const isLoading = todayQuery.isLoading || chartQuery.isLoading;
  const isError = todayQuery.isError || chartQuery.isError;
  const error =
    (todayQuery.error instanceof Error ? todayQuery.error.message : "") ||
    (chartQuery.error instanceof Error ? chartQuery.error.message : "");

  const fetchLeadsByLeadGen = (period: "month" | "year" | "30days") => {
    setChartPeriod(period);
  };

  const refetchTodayLeads = () => {
    void todayQuery.refetch();
  };

  return {
    leads,
    totalLeads,
    todayLeadStats,
    isLoading,
    isError,
    error,
    refetch: refetchTodayLeads,
    fetchLeadsByLeadGen,
    chartData1,
  };
};

export default useTodayLeads;
