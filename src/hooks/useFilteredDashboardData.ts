"use client";

import { useMemo } from "react";
import { useLocationFilter } from "@/hooks/useDashboardAccess";

/**
 * Hook to filter dashboard data based on user's location access
 * Use this with any data array that has a location field
 */
export function useFilteredDashboardData<T extends { location?: string }>(
  data: T[],
  locationField: keyof T = "location" as keyof T
): T[] {
  const { filterDataByLocation, isAdmin, isLeadGen } = useLocationFilter();

  return useMemo(() => {
    // Admin and LeadGen can see all data
    if (isAdmin || isLeadGen) {
      return data;
    }

    return filterDataByLocation(data, locationField);
  }, [data, filterDataByLocation, isAdmin, isLeadGen, locationField]);
}

/**
 * Hook to get filtered location options for select dropdowns
 */
export function useLocationOptions(allLocations: string[]): string[] {
  const { userLocations, isAdmin, isLeadGen } = useLocationFilter();

  return useMemo(() => {
    if (isAdmin || isLeadGen) {
      return allLocations;
    }

    if (userLocations.length === 0) {
      return allLocations;
    }

    return allLocations.filter((loc) =>
      userLocations.some(
        (userLoc) => userLoc.toLowerCase() === loc.toLowerCase()
      )
    );
  }, [allLocations, userLocations, isAdmin, isLeadGen]);
}

/**
 * Hook to determine if location filter should be shown
 */
export function useShouldShowLocationFilter(): boolean {
  const { isAdmin, userLocations } = useLocationFilter();

  // Show filter for admins (they can filter)
  // Hide for restricted users (they already see filtered data)
  return isAdmin || userLocations.length === 0;
}

/**
 * Hook to get initial location filter value
 */
export function useInitialLocationFilter(): string {
  const { userLocations, isAdmin, isLeadGen } = useLocationFilter();

  // Admin and LeadGen default to "All"
  if (isAdmin || isLeadGen) {
    return "All";
  }

  // Sales team defaults to their first assigned location, or "All" if none
  return userLocations.length > 0 ? userLocations[0] : "All";
}

export default useFilteredDashboardData;

