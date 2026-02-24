import { getBoostCounts } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

const BoostCounts = () => {
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");
  const [totalBoosts, setTotalBoosts] = useState<
    { date: string; total: number; newBoosts: number; reboosts: number ,posted: number}[]
  >([]);
  const [activeBoosts, setActiveBoosts] = useState(0);
  const [inactiveBoosts, setInactiveBoosts] = useState(0);

  const fetchBoostCounts = async ({ days }: { days?: string }) => {
    try {
      setLoading(true);
      setIsError(false);
      setError("");
      const response = await getBoostCounts({ days });
      const transformedResponse = response.map(
        ({ date, total, newBoosts, reboosts ,posted}) => ({
          date,
          total: total ?? 0,
          newBoosts,
          reboosts,
          posted

        })
      );
      setTotalBoosts(transformedResponse);
      // boost counts transformed
    } catch (err: any) {
      const error = new Error(err);
      setIsError(true);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoostCounts({ days: "this month" });
  }, []);

  return {
    loading,
    setLoading,
    isError,
    setIsError,
    error,
    setError,
    totalBoosts,
    setTotalBoosts,
    activeBoosts,
    setActiveBoosts,
    inactiveBoosts,
    setInactiveBoosts,
    fetchBoostCounts,
  };
};

export default BoostCounts;