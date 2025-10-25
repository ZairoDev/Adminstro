"use client";

import { getBookingStats } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

export type BookingStat = {
  date: string;
  totalPaid: number;
  count: number;
};

export type BookingStatsResponse = {
  selectedData: BookingStat[];
  comparisonData?: BookingStat[] | null;
};

const useBookingStats = () => {
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");
  const [bookingsByDate, setBookingsByDate] = useState<BookingStat[]>([]);
  const [comparisonData, setComparisonData] = useState<BookingStat[] | null>(
    null
  );

  const [activeBookings, setActiveBookings] = useState(0);
  const [inactiveBookings, setInactiveBookings] = useState(0);

  const fetchBookingStats = async ({
    days,
    location,
    comparisonMonth,
    comparisonYear,
  }: {
    days?: "12 days" | "1 year" | "last 3 years" | "this month";
    location?: string;
    comparisonMonth?: number;
    comparisonYear?: number;
  }) => {
    try {
      setLoading(true);
      setIsError(false);
      setError("");

      // 🧠 Adjust comparison range dynamically
      let adjustedComparisonMonth = comparisonMonth;
      let adjustedComparisonYear = comparisonYear;

      if (days === "1 year") {
        // For 1-year view, fetch the full previous year’s data
        adjustedComparisonMonth = undefined;
        adjustedComparisonYear = new Date().getFullYear() - 1;
      }

      const response = await getBookingStats({
        days,
        location,
        comparisonMonth: adjustedComparisonMonth,
        comparisonYear: adjustedComparisonYear,
      });

      console.log("Booking stats response:", response);

      /* Transform response */
      const transformedSelected = response.selectedData.map((item: any) => ({
        date: item._id,
        totalPaid: item.totalPaid ?? 0,
        count: item.count ?? 0,
      }));

      const transformedComparison = response.comparisonData
        ? response.comparisonData.map((item: any) => {
            const currentDate = new Date(item._id);
            const adjustedDate = new Date(currentDate);

            if (days === "12 days" || days === "this month") {
              adjustedDate.setFullYear(new Date().getFullYear());
              return {
                date: adjustedDate.toISOString().split("T")[0],
                totalPaid: item.totalPaid ?? 0,
                count: item.count ?? 0,
              };
            }

            if (days === "1 year") {
              const month = (adjustedDate.getMonth() + 1)
                .toString()
                .padStart(2, "0");
              const year = new Date().getFullYear();
              return {
                date: `${year}-${month}`,
                totalPaid: item.totalPaid ?? 0,
                count: item.count ?? 0,
              };
            }

            if (days === "last 3 years") {
              return {
                date: adjustedDate.getFullYear().toString(),
                totalPaid: item.totalPaid ?? 0,
                count: item.count ?? 0,
              };
            }

            return {
              date: adjustedDate.toISOString().split("T")[0],
              totalPaid: item.totalPaid ?? 0,
              count: item.count ?? 0,
            };
          })
        : null;

      setBookingsByDate(transformedSelected);
      setComparisonData(transformedComparison);

      console.log("✅ Booking stats transformed:", transformedSelected);
      console.log("✅ Comparison data transformed:", transformedComparison);
    } catch (err: any) {
      console.error("Error fetching booking stats:", err);
      setIsError(true);
      setError(err.message || "Failed to fetch booking stats");
    } finally {
      setLoading(false);
    }
  };
  

  // Default load: show "this month"
  useEffect(() => {
    fetchBookingStats({ days: "this month" });
  }, []);

  return {
    loading,
    isError,
    error,
    bookingsByDate,
    comparisonData,
    activeBookings,
    inactiveBookings,
    fetchBookingStats,
  };
};

export default useBookingStats;
