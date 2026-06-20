import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  getAllAgent,
  getAverage,
  getLeadsGroupCount,
  getRejectedLeadGroup,
} from "@/actions/(VS)/queryActions";

interface RejectedLeadGroup {
  reason: string;
  count: number;
}

interface LeadsGroupCount {
  label: string;
  count: number;
}

type LeadStatusFilters = {
  days?: string;
  location?: string;
  createdBy?: string;
};

const defaultStatusFilters: LeadStatusFilters = {
  days: "this month",
  location: "All",
  createdBy: "All",
};

/** Data for the "Sales Performance by Agent" section on the main dashboard only. */
const useSalesByAgentSection = (enabled = true) => {
  const [leadStatusFilters, setLeadStatusFilters] =
    useState<LeadStatusFilters>(defaultStatusFilters);

  const averageQuery = useQuery({
    queryKey: ["leads", "average"],
    queryFn: async () => {
      const response = await getAverage();
      return response.totalTarget as number;
    },
    staleTime: 5 * 60 * 1000,
    enabled,
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
    enabled,
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
    enabled,
  });

  const employeesQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => getAllAgent() as Promise<string[]>,
    staleTime: 10 * 60 * 1000,
    enabled,
  });

  const isLoading = averageQuery.isLoading;
  const isError =
    averageQuery.isError ||
    groupCountQuery.isError ||
    rejectedQuery.isError;
  const error =
    (averageQuery.error instanceof Error ? averageQuery.error.message : "") ||
    (groupCountQuery.error instanceof Error ? groupCountQuery.error.message : "") ||
    (rejectedQuery.error instanceof Error ? rejectedQuery.error.message : "");

  const fetchLeadStatus = async (filters: LeadStatusFilters) => {
    setLeadStatusFilters((prev) => ({ ...prev, ...filters }));
  };

  const fetchRejectedLeadGroup = async (filters: LeadStatusFilters) => {
    setLeadStatusFilters((prev) => ({ ...prev, ...filters }));
  };

  return {
    leadsGroupCount: groupCountQuery.data ?? [],
    fetchLeadStatus,
    average: averageQuery.data ?? 0,
    allEmployees: employeesQuery.data ?? [],
    rejectedLeadGroups: rejectedQuery.data ?? [],
    fetchRejectedLeadGroup,
    isLoading,
    isError,
    error,
  };
};

export default useSalesByAgentSection;
