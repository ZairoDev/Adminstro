import { getWebsiteLeadsCounts } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

const useWebsiteLeadsCounts = () => {
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");
  const [websiteLeads, setWebsiteLeads] = useState<
    { date: string; leads: number }[]
  >([]);

  const fetchWebsiteLeadsCounts = async ({ days }: { days?: string }) => {
    try {
      setLoading(true);
      setIsError(false);
      setError("");
      const response = await getWebsiteLeadsCounts({ days });
      setWebsiteLeads(response);
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsiteLeadsCounts({ days: "this month" });
  }, []);

  return {
    loading,
    setLoading,
    isError,
    setIsError,
    error,
    setError,
    websiteLeads,
    setWebsiteLeads,
    fetchWebsiteLeadsCounts,
  };
};

export default useWebsiteLeadsCounts;

