import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

import {
  getAllAgent,
  getGroupedLeads,
  getLeadsByLocation,
  getLeadsGroupCount,
  getRejectedLeadGroup,
} from "@/actions/(VS)/queryActions";
import { daysToWeeks } from "date-fns";
import { EmployeeInterface } from "@/util/type";

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

const useLeads = ({ date }: { date: DateRange | undefined }) => {
  const [leads, setLeads] = useState<GroupedLeads>();
  const [leadsGroupCount, setLeadsGroupCount] = useState<LeadsGroupCount[]>([]);
  const [rejectedLeadGroups, setRejectedLeadGroups] = useState<
    RejectedLeadGroup[]
  >([]);
  const [locationLeads,setLocationLeads] = useState<locationLeadsIn[]>([]);
  const [allEmployees,setAllEmployees] = useState<string[]>([]);

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

  const fetchLeadByLocation = async({days,createdBy}:{days?:string,createdBy?:string})=>{
    setIsLoading(true);
    setIsError(false);
    setError("");
    try {
      const response:locationLeadsIn[] = await getLeadsByLocation({days,createdBy});
      setLocationLeads(response);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const fetchAllEmployees = async()=>{
    try {
      const response = await getAllAgent();
      setAllEmployees(response);
      console.log("all employees: ", response);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    }
  }

  const fetchLeadStatus = async ({
    days,
    location,
    createdBy,
  }: {
    days?: string;
    location?: string;
    createdBy?: string;
  }) => {
    try {
      const response = await getLeadsGroupCount({ days, location ,createdBy});
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
    createdBy
  }: {
    days?: string;
    location?: string;
    createdBy?: string;
  }) => {
    try {
      const response = await getRejectedLeadGroup({ days, location,createdBy });
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
    fetchAllEmployees();
    fetchLeadByLocation({});
    fetchRejectedLeadGroup({});
  }, []);

  const refetch = () => fetchLeads({ date });
  const reset = () => fetchLeads({ date: undefined });

  return {
    leads,
    locationLeads,
    fetchLeadByLocation,
    leadsGroupCount,
    fetchLeadStatus,
    allEmployees,
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
