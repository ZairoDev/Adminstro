import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

import {
  getGroupedLeads,
  getLeadsGroupCount,
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

const useLeads = ({ date }: { date: DateRange | undefined }) => {
  const [leads, setLeads] = useState<GroupedLeads>();
  const [freshLeads, setFreshLeads] = useState(0);
  const [activeLeads, setActiveLeads] = useState(0);
  const [rejectedLeads, setRejectedLeads] = useState(0);
  const [reminderLeads, setReminderLeads] = useState(0);
  const [declinedLeads, setDeclinedLeads] = useState(0);
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

  const fetchUntouchedLeads = async () => {
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

  useEffect(() => {
    fetchLeads({ date });
    fetchUntouchedLeads();
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
    isLoading,
    isError,
    error,
    refetch,
    reset,
  };
};

export default useLeads;
