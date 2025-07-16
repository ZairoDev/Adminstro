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

const useLeads = ({ date }: { date: DateRange | undefined }) => {
  const [leads, setLeads] = useState<GroupedLeads>();
  const [freshLeads, setFreshLeads] = useState(0);
  const [activeLeads, setActiveLeads] = useState(0);
  const [rejectedLeads, setRejectedLeads] = useState(0);
  const [reminderLeads, setReminderLeads] = useState(0);
  const [declinedLeads, setDeclinedLeads] = useState(0);
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

  const fetchLeadStatus = async () => {
    try {
      const response = await getLeadsGroupCount();
      setFreshLeads(response.freshLeads);
      setActiveLeads(response.activeLeads);
      setRejectedLeads(response.rejectedLeads);
      setReminderLeads(response.reminderLeads);
      setDeclinedLeads(response.declinedLeads);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    }
  };

  const fetchRejectedLeadGroup = async (days: string) => {
    try {
      const response = await getRejectedLeadGroup(days);
      setRejectedLeadGroups(response.rejectedLeadGroup);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    }
  };

  useEffect(() => {
    fetchLeads({ date });
    fetchLeadStatus();
    fetchRejectedLeadGroup("10 days");
  }, []);

  const refetch = () => fetchLeads({ date });
  const reset = () => fetchLeads({ date: undefined });

  return {
    leads,
    freshLeads,
    activeLeads,
    rejectedLeads,
    reminderLeads,
    declinedLeads,
    fetchRejectedLeadGroup,
    rejectedLeadGroups,
    isLoading,
    isError,
    error,
    refetch,
    reset,
  };
};

export default useLeads;
