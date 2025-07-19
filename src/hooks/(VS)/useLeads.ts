import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

import {
  getGroupedLeads,
  getLeadsGroupCount,
  getRejectedLeadGroup,
} from "@/actions/(VS)/queryActions";
import { daysToWeeks } from "date-fns";

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

interface RejectedLeadGroup {
  reason: string;
  count: number;
}

interface LeadsGroupCount {
  label: string;
  count: number;
}

const useLeads = ({ date }: { date: DateRange | undefined }) => {
  const [leads, setLeads] = useState<GroupedLeads>();
  const [leadsGroupCount, setLeadsGroupCount] = useState<LeadsGroupCount[]>([]);
  const [rejectedLeadGroups, setRejectedLeadGroups] = useState<
    RejectedLeadGroup[]
  >([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  // Fetch Leads
  const fetchLeads = async ({ date }: { date: DateRange | undefined }) => {
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      const response = await getGroupedLeads({ date });
      setLeads(response);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeadStatus = async ({
    days,
    location,
  }: {
    days?: string;
    location?: string;
  }) => {
    try {
      const response = await getLeadsGroupCount({ days, location });
      setLeadsGroupCount(response.leadsGroupCount);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    }
  };

  const fetchRejectedLeadGroup = async ({
    days,
    location,
  }: {
    days?: string;
    location?: string;
  }) => {
    try {
      const response = await getRejectedLeadGroup({ days, location });
      setRejectedLeadGroups(response.rejectedLeadGroup);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    }
  };

  useEffect(() => {
    fetchLeads({ date });
    fetchLeadStatus({});
    fetchRejectedLeadGroup({});
  }, []);

  const refetch = () => fetchLeads({ date });
  const reset = () => fetchLeads({ date: undefined });

  return {
    leads,

    leadsGroupCount,
    fetchLeadStatus,

    rejectedLeadGroups,
    fetchRejectedLeadGroup,
    isLoading,
    isError,
    error,
    refetch,
    reset,
  };
};

export default useLeads;
