"use client";

import { getBookingStats } from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

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

export type BookingStatsFilterParams = {
  days?: "12 days" | "1 year" | "last 3 years" | "this month" | "week";
  location?: string;
  comparisonMonth?: number;
  comparisonYear?: number;
  weekOffset?: number;
  monthOffset?: number;
  yearOffset?: number;
};

const DEFAULT_FILTERS: BookingStatsFilterParams = { days: "this month" };

async function fetchAndTransformBookingStats(
  filters: BookingStatsFilterParams,
): Promise<{
  bookingsByDate: BookingStat[];
  comparisonData: BookingStat[] | null;
  locationBreakdown: LocationBreakdown[] | null;
}> {
  const response = await getBookingStats(filters);

  const transformedSelected = response.selectedData.map((item: { _id: string; totalPaid?: number; count?: number }) => ({
    date: item._id,
    totalPaid: item.totalPaid ?? 0,
    count: item.count ?? 0,
  }));

  const transformedComparison = response.comparisonData
    ? response.comparisonData.map((item: { _id: string; totalPaid?: number; count?: number }) => ({
        date: item._id,
        totalPaid: item.totalPaid ?? 0,
        count: item.count ?? 0,
      }))
    : null;

  return {
    bookingsByDate: transformedSelected,
    comparisonData: transformedComparison,
    locationBreakdown: response.locationBreakdown || null,
  };
}

const useBookingStats = (externalFilters?: BookingStatsFilterParams) => {
  const [internalFilters, setInternalFilters] =
    useState<BookingStatsFilterParams>(DEFAULT_FILTERS);
  const filters = externalFilters ?? internalFilters;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "bookingStats",
      filters.days,
      filters.location ?? "",
      filters.comparisonMonth ?? null,
      filters.comparisonYear ?? null,
      filters.weekOffset ?? null,
      filters.monthOffset ?? null,
      filters.yearOffset ?? null,
    ],
    queryFn: () => fetchAndTransformBookingStats(filters),
  });

  const fetchBookingStats = (newFilters: BookingStatsFilterParams) => {
    setInternalFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return {
    loading: isLoading,
    isError,
    error: error instanceof Error ? error.message : "",
    bookingsByDate: data?.bookingsByDate ?? [],
    comparisonData: data?.comparisonData ?? null,
    locationBreakdown: data?.locationBreakdown ?? null,
    activeBookings: 0,
    inactiveBookings: 0,
    fetchBookingStats,
  };
};

export default useBookingStats;
