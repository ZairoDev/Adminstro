import { getWebsiteLeadsCounts } from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type WebsiteLeadsFilters = { days?: string };

const useWebsiteLeadsCounts = () => {
  const [filters, setFilters] = useState<WebsiteLeadsFilters>({
    days: "this month",
  });

  const { data: websiteLeads = [], isLoading, isError, error } = useQuery({
    queryKey: ["websiteLeadsCounts", filters],
    queryFn: () => getWebsiteLeadsCounts({ days: filters.days }),
  });

  const fetchWebsiteLeadsCounts = ({ days }: { days?: string }) => {
    setFilters((prev) => ({ ...prev, days }));
  };

  return {
    loading: isLoading,
    setLoading: () => undefined,
    isError,
    setIsError: () => undefined,
    error: error instanceof Error ? error.message : "",
    setError: () => undefined,
    websiteLeads,
    setWebsiteLeads: () => undefined,
    fetchWebsiteLeadsCounts,
  };
};

export default useWebsiteLeadsCounts;
