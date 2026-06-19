import { getListingCounts } from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type ListingFilters = { days?: string };

type ListingRow = {
  date: string;
  total: number;
  shortTerm: number;
  longTerm: number;
};

const ListingCounts = () => {
  const [filters, setFilters] = useState<ListingFilters>({ days: "this month" });
  const [activeListings, setActiveListings] = useState(0);
  const [inactiveListings, setInactiveListings] = useState(0);

  const { data: totalListings = [], isLoading, isError, error } = useQuery({
    queryKey: ["listingCounts", filters],
    queryFn: async (): Promise<ListingRow[]> => {
      const response = await getListingCounts({ days: filters.days });
      return response.map(
        ({
          date,
          total,
          shortTerm,
          longTerm,
        }: {
          date: string;
          total?: number;
          shortTerm: number;
          longTerm: number;
        }) => ({
          date,
          total: total ?? 0,
          shortTerm,
          longTerm,
        }),
      );
    },
  });

  const fetchListingCounts = ({ days }: { days?: string }) => {
    setFilters((prev) => ({ ...prev, days }));
  };

  return {
    loading: isLoading,
    setLoading: () => undefined,
    isError,
    setIsError: () => undefined,
    error: error instanceof Error ? error.message : "",
    setError: () => undefined,
    totalListings,
    setTotalListings: () => undefined,
    activeListings,
    setActiveListings,
    inactiveListings,
    setInactiveListings,
    fetchListingCounts,
  };
};

export default ListingCounts;
