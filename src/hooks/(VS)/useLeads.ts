import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DateRange } from "react-day-picker";

import {
  getAllAgent,
  getAverage,
  getGroupedLeads,
  getLeadsByLocation,
  getLeadsGroupCount,
  getRejectedLeadGroup,
} from "@/actions/(VS)/queryActions";

interface GroupedLeads {
  leadsByAgent: {
    _id: string;
    count: number;
  }[];
  leadsByLocation: {
    _id: string;
    count: number;
  }[];
}

interface locationLeadsIn {
  _id: string;
  count: number;
}

interface RejectedLeadGroup {
  reason: string;
  count: number;
}

interface LeadsGroupCount {
  label: string;
  count: number;
}

interface CityData {
  [city: string]: number;
}

interface MessageStatusData {
  First: CityData;
  Second: CityData;
  Third: CityData;
  Fourth: CityData;
  Options: CityData;
  Visit: CityData;
}

type LeadStatusFilters = {
  days?: string;
  location?: string;
  createdBy?: string;
};

type LocationLeadsFilters = {
  days?: string;
  createdBy?: string;
  typeOfProperty?: string;
  dateFrom?: string;
  dateTo?: string;
};

const defaultStatusFilters: LeadStatusFilters = {
  days: "this month",
  location: "All",
  createdBy: "All",
};

const useLeads = ({ date }: { date: DateRange | undefined }) => {
  const queryClient = useQueryClient();
  const [leadStatusFilters, setLeadStatusFilters] =
    useState<LeadStatusFilters>(defaultStatusFilters);
  const [locationLeadsFilters, setLocationLeadsFilters] =
    useState<LocationLeadsFilters>({ days: "this month" });

  const dateFromKey = date?.from?.toISOString() ?? null;
  const dateToKey = date?.to?.toISOString() ?? null;

  const groupedQuery = useQuery({
    queryKey: ["leads", "grouped", dateFromKey, dateToKey],
    queryFn: () => getGroupedLeads({ date }),
  });

  const averageQuery = useQuery({
    queryKey: ["leads", "average"],
    queryFn: async () => {
      const response = await getAverage();
      return response.totalTarget as number;
    },
  });

  const groupCountQuery = useQuery({
    queryKey: [
      "leads",
      leadStatusFilters.location ?? "All",
      leadStatusFilters.days ?? "this month",
      leadStatusFilters.createdBy ?? "All",
    ],
    queryFn: async () => {
      const response = await getLeadsGroupCount(leadStatusFilters);
      return response.leadsGroupCount as LeadsGroupCount[];
    },
  });

  const rejectedQuery = useQuery({
    queryKey: [
      "leads",
      "rejected",
      leadStatusFilters.location ?? "All",
      leadStatusFilters.days ?? "this month",
      leadStatusFilters.createdBy ?? "All",
    ],
    queryFn: async () => {
      const response = await getRejectedLeadGroup(leadStatusFilters);
      return response.rejectedLeadGroup as RejectedLeadGroup[];
    },
  });

  const employeesQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => getAllAgent() as Promise<string[]>,
    staleTime: 10 * 60 * 1000,
  });

  const locationLeadsQuery = useQuery({
    queryKey: ["leads", "byLocation", locationLeadsFilters],
    queryFn: () =>
      getLeadsByLocation(locationLeadsFilters) as Promise<locationLeadsIn[]>,
  });

  const messageStatusQuery = useQuery({
    queryKey: ["leads", "messageStatus"],
    queryFn: async () => {
      const res = await fetch("/api/leads/getStatusCount");
      if (!res.ok) throw new Error("Failed to fetch message status");
      const data = await res.json();
      return data.statusSummary as MessageStatusData;
    },
    retry: false,
  });

  const isLoading = groupedQuery.isLoading || averageQuery.isLoading;
  const isError =
    groupedQuery.isError ||
    averageQuery.isError ||
    groupCountQuery.isError ||
    rejectedQuery.isError;
  const error =
    (groupedQuery.error instanceof Error ? groupedQuery.error.message : "") ||
    (averageQuery.error instanceof Error ? averageQuery.error.message : "") ||
    (groupCountQuery.error instanceof Error ? groupCountQuery.error.message : "") ||
    (rejectedQuery.error instanceof Error ? rejectedQuery.error.message : "");

  const fetchLeadByLocation = async (filters: LocationLeadsFilters) => {
    setLocationLeadsFilters((prev) => ({ ...prev, ...filters }));
  };

  const fetchLeadStatus = async (filters: LeadStatusFilters) => {
    setLeadStatusFilters((prev) => ({ ...prev, ...filters }));
  };

  const fetchRejectedLeadGroup = async (filters: LeadStatusFilters) => {
    setLeadStatusFilters((prev) => ({ ...prev, ...filters }));
  };

  const fetchMessageStatus = async () => {
    await messageStatusQuery.refetch();
  };

  const refetchLeads = () => {
    void groupedQuery.refetch();
  };

  const reset = async () => {
    const response = await getGroupedLeads({ date: undefined });
    queryClient.setQueryData(
      ["leads", "grouped", dateFromKey, dateToKey],
      response,
    );
  };

  return {
    leads: groupedQuery.data as GroupedLeads | undefined,
    locationLeads: locationLeadsQuery.data ?? [],
    fetchLeadByLocation,
    leadsGroupCount: groupCountQuery.data ?? [],
    fetchLeadStatus,
    average: averageQuery.data ?? 0,
    allEmployees: employeesQuery.data ?? [],
    rejectedLeadGroups: rejectedQuery.data ?? [],
    fetchRejectedLeadGroup,
    messageStatus: messageStatusQuery.data ?? null,
    fetchMessageStatus,
    isLoading,
    isError,
    error,
    refetch: refetchLeads,
    reset,
  };
};

export default useLeads;
