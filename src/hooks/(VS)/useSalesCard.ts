import { getSalesCardDetails } from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";

interface SalesCardData {
  todayCount: number;
  yesterdayCount: number;
  difference: number;
  percentageChange: number;
  leads: unknown[];
}

const SalesCard = () => {
  const { data: salesCardData = null, isLoading, isError, error } = useQuery({
    queryKey: ["salesCard", null],
    queryFn: () => getSalesCardDetails({ days: "" }) as Promise<SalesCardData>,
  });

  return {
    loading: isLoading,
    setLoading: () => undefined,
    isError,
    error: error instanceof Error ? error.message : "",
    salesCardData,
  };
};

export default SalesCard;
