import { getReviews } from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type ReviewBucket = { _id: string | null; count: number };

type NotReviewedBreakdownItem = {
  messageStatus: string;
  salesPriority: string;
  count: number;
  percent: number;
};

type ReviewFilters = {
  days?: string;
  location?: string;
  createdBy?: string;
};

const useReview = () => {
  const [filters, setFilters] = useState<ReviewFilters>({ days: "this month" });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reviews", filters.location ?? "All", filters.days, filters.createdBy],
    queryFn: async () => {
      const response = await getReviews(filters);
      return {
        reviews: response.reviews as ReviewBucket[],
        notReviewedBreakdown: (response.notReviewedBreakdown ??
          []) as NotReviewedBreakdownItem[],
      };
    },
  });

  const fetchReviews = ({
    days,
    location,
    createdBy,
  }: {
    days?: string;
    location?: string;
    createdBy?: string;
  }) => {
    setFilters((prev) => ({
      ...prev,
      ...(days !== undefined ? { days } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(createdBy !== undefined ? { createdBy } : {}),
    }));
  };

  return {
    reviews: data?.reviews ?? [],
    notReviewedBreakdown: data?.notReviewedBreakdown ?? [],
    revLoading: isLoading,
    setRevLoading: () => undefined,
    revError: isError,
    setRevError: () => undefined,
    revErr: error instanceof Error ? error.message : "",
    setRevErr: () => undefined,
    fetchReviews,
  };
};

export default useReview;
