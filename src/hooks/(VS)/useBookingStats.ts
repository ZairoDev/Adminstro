"use client";

import { getBookingStats } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

export type BookingStat = {
  date: string;
  totalPaid: number;
  count: number;
};

const useBookingStats = () => {
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");
  const [bookingsByDate, setBookingsByDate] = useState<BookingStat[]>([]);
  const [activeBookings, setActiveBookings] = useState(0);
  const [inactiveBookings, setInactiveBookings] = useState(0);

  const fetchBookingStats = async ({
    days,
    location,
  }: {
    days?: "12 days" | "1 year" | "last 3 years" | "this month";
    location?: string;
  }) => {
    try {
      setLoading(true);
      setIsError(false);
      setError("");

      // Fetch stats from backend
      const response = await getBookingStats({ days, location });

      console.log("Booking stats response:", response);

      // Transform backend data into a clean frontend-friendly format
      const transformed = response.map((item: any) => ({
        date: item._id,
        totalPaid: item.totalPaid ?? 0,
        count: item.count ?? 0,
      }));

      setBookingsByDate(transformed);
      console.log("Booking stats transformed:", transformed);
    } catch (err: any) {
      console.error("Error fetching booking stats:", err);
      setIsError(true);
      setError(err.message || "Failed to fetch booking stats");
    } finally {
      setLoading(false);
    }
  };

  // Default load: show last 12 days
  useEffect(() => {
    fetchBookingStats({ days: "this month" });
  }, []);

  return {
    loading,
    isError,
    error,
    bookingsByDate,
    activeBookings,
    inactiveBookings,
    fetchBookingStats, // so UI can trigger filters like “1 year” or “this month”
  };
};

export default useBookingStats;
