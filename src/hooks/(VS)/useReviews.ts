import { getReviews } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

type ReviewBucket = { _id: string | null; count: number };

type NotReviewedBreakdownItem = {
  messageStatus: string;
  salesPriority: string;
  count: number;
  percent: number;
};

const useReview = () => {
  const [reviews, setReviews] = useState<ReviewBucket[]>([]);
  const [notReviewedBreakdown, setNotReviewedBreakdown] = useState<
    NotReviewedBreakdownItem[]
  >([]);
  const [revLoading, setRevLoading] = useState(false);
  const [revError, setRevError] = useState(false);
  const [revErr, setRevErr] = useState("");

  const fetchReviews = async ({
    days,
    location,
    createdBy,
  }: {
    days?: string;
    location?: string;
    createdBy?: string;
  }) => {
    try {
      setRevLoading(true);
      setRevError(false);
      setRevErr("");
      const response = await getReviews({ days, location, createdBy });
      setReviews(response.reviews);
      setNotReviewedBreakdown(response.notReviewedBreakdown ?? []);
    } catch (err: unknown) {
      const error = new Error(err instanceof Error ? err.message : String(err));
      setRevError(true);
      setRevErr(error.message);
    } finally {
      setRevLoading(false);
    }
  };

  useEffect(() => {
    void fetchReviews({ days: "this month" });
  }, []);

  return {
    reviews,
    notReviewedBreakdown,
    revLoading,
    setRevLoading,
    revError,
    setRevError,
    revErr,
    setRevErr,
    fetchReviews,
  };
};
export default useReview;