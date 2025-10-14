import { getUnregisteredOwnerCounts } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

const useUnregisteredOwnerCounts = () => {
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");
  const [unregisteredOwnerCounts, setUnregisteredOwnerCounts] = useState<{ date: string; owners: number }[]>([]);

  const fetchUnregisteredOwnerCounts = async ({ days }: { days?: string }) => {
    try {
      setLoading(true);
      setIsError(false);
      setError("");

      const response = await getUnregisteredOwnerCounts({ days });
      console.log("Unregistered owner counts response:", response);

      // Normalize / ensure correct format
      const transformedResponse = response.map(({ date, owners }: { date: string; owners: number }) => ({
        date,
        owners: owners ?? 0,
      }));
      console.log("transformedResponse", transformedResponse);

      setUnregisteredOwnerCounts(transformedResponse);
    } catch (err: any) {
      console.error("Error fetching unregistered owner counts:", err);
      setIsError(true);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnregisteredOwnerCounts({ days: "12 days" });
  }, []);

  return {
    loading,
    isError,
    error,
    unregisteredOwnerCounts,
    fetchUnregisteredOwnerCounts,
    setUnregisteredOwnerCounts,
  };
};

export default useUnregisteredOwnerCounts;
