"use client";

import { getBookingStats } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

export type BookingStat = {
  date: string;
  totalPaid: number;
  count: number;
};

export type LocationBreakdown = {
  location: string;
  totalPaid: number;
  count: number;
};

export type BookingStatsResponse = {
  selectedData: BookingStat[];
  comparisonData?: BookingStat[] | null;
  locationBreakdown?: LocationBreakdown[] | null;
};

const useBookingStats = () => {
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");
  const [bookingsByDate, setBookingsByDate] = useState<BookingStat[]>([]);
  const [comparisonData, setComparisonData] = useState<BookingStat[] | null>(
    null
  );
  const [locationBreakdown, setLocationBreakdown] = useState<
    LocationBreakdown[] | null
  >(null);

  const [activeBookings, setActiveBookings] = useState(0);
  const [inactiveBookings, setInactiveBookings] = useState(0);

  const fetchBookingStats = async ({
    days,
    location,
    comparisonMonth,
    comparisonYear,
    weekOffset,
    monthOffset,
    yearOffset,
  }: {
    days?: "12 days" | "1 year" | "last 3 years" | "this month" | "week";
    location?: string;
    comparisonMonth?: number;
    comparisonYear?: number;
    weekOffset?: number;
    monthOffset?: number;
    yearOffset?: number;
  }) => {
    try {
      setLoading(true);
      setIsError(false);
      setError("");

      const response = await getBookingStats({
        days,
        location,
        comparisonMonth,
        comparisonYear,
        weekOffset,
        monthOffset,
        yearOffset,
      });

      // console.log("Booking stats response:", response);

      /* Transform response */
      const transformedSelected = response.selectedData.map((item: any) => ({
        date: item._id,
        totalPaid: item.totalPaid ?? 0,
        count: item.count ?? 0,
      }));

      const transformedComparison = response.comparisonData
        ? response.comparisonData.map((item: any) => {
            // Keep the original date format from the database
            return {
              date: item._id,
              totalPaid: item.totalPaid ?? 0,
              count: item.count ?? 0,
            };
          })
        : null;

      const transformedLocationBreakdown = response.locationBreakdown || null;

      setBookingsByDate(transformedSelected);
      setComparisonData(transformedComparison);
      setLocationBreakdown(transformedLocationBreakdown);

      // console.log("✅ Booking stats transformed:", transformedSelected);
      // console.log("✅ Comparison data transformed:", transformedComparison);
      // console.log("✅ Location breakdown:", transformedLocationBreakdown);
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
    locationBreakdown,
    activeBookings,
    inactiveBookings,
    fetchBookingStats,
  };
};

export default useBookingStats;
