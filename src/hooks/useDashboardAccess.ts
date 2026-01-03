"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/AuthStore";
import {
  DashboardSection,
  TeamType,
  LocationType,
  getAccessibleSections,
  canAccessSection,
  requiresLocationFilter,
  getTeamForRole,
  isLeadGenTeam,
  isSalesTeam,
  isAdminRole,
  isTeamLead,
  hasLocationRestriction,
  filterLocationsByAccess,
  LOCATIONS,
  LOCATION_EXEMPT_ROLES,
  DASHBOARD_SECTIONS_CONFIG,
  DashboardSectionConfig,
} from "@/config/dashboardConfig";

export interface DashboardAccessState {
  // User info
  role: string;
  userLocations: string[];
  userId: string;
  userName: string;
  userEmail: string;

  // Team membership
  team: TeamType | null;
  isLeadGen: boolean;
  isSales: boolean;
  isAdmin: boolean;
  isTeamLead: boolean;
  hasLocationRestriction: boolean;

  // Access control
  accessibleSections: DashboardSection[];
  accessibleLocations: string[];
  sectionsConfig: DashboardSectionConfig[];

  // Helper functions
  canAccess: (section: DashboardSection) => boolean;
  needsLocationFilter: (section: DashboardSection) => boolean;
  getFilteredLocations: (allLocations: string[]) => string[];
}

/**
 * Hook for dashboard access control
 * Provides role-based and location-based access information
 */
export function useDashboardAccess(): DashboardAccessState {
  const { token } = useAuthStore();

  const role = token?.role || "";
  const userLocations = useMemo(() => {
    const areas = token?.allotedArea;
    if (!areas) return [];
    // Handle both string and array formats
    if (typeof areas === "string") {
      return areas.split(",").map((a) => a.trim()).filter(Boolean);
    }
    if (Array.isArray(areas)) {
      return areas;
    }
    return [];
  }, [token?.allotedArea]);

  const accessibleSections = useMemo(() => {
    return getAccessibleSections(role);
  }, [role]);

  const accessibleLocations = useMemo(() => {
    return filterLocationsByAccess([...LOCATIONS], userLocations, role);
  }, [userLocations, role]);

  const sectionsConfig = useMemo(() => {
    return DASHBOARD_SECTIONS_CONFIG.filter((config) =>
      accessibleSections.includes(config.id)
    ).sort((a, b) => a.order - b.order);
  }, [accessibleSections]);

  const canAccess = (section: DashboardSection): boolean => {
    return canAccessSection(role, section);
  };

  const needsLocationFilter = (section: DashboardSection): boolean => {
    return requiresLocationFilter(role, section);
  };

  const getFilteredLocations = (allLocations: string[]): string[] => {
    return filterLocationsByAccess(allLocations, userLocations, role);
  };

  return {
    // User info
    role,
    userLocations,
    userId: token?.id || "",
    userName: token?.name || "",
    userEmail: token?.email || "",

    // Team membership
    team: getTeamForRole(role),
    isLeadGen: isLeadGenTeam(role),
    isSales: isSalesTeam(role),
    isAdmin: isAdminRole(role),
    isTeamLead: isTeamLead(role),
    hasLocationRestriction: hasLocationRestriction(role),

    // Access control
    accessibleSections,
    accessibleLocations,
    sectionsConfig,

    // Helper functions
    canAccess,
    needsLocationFilter,
    getFilteredLocations,
  };
}

/**
 * Hook for location-based data filtering
 */
export function useLocationFilter() {
  const { token } = useAuthStore();
  
  const role = token?.role || "";
  const userLocations = useMemo(() => {
    const areas = token?.allotedArea;
    if (!areas) return [];
    if (typeof areas === "string") {
      return areas.split(",").map((a) => a.trim()).filter(Boolean);
    }
    if (Array.isArray(areas)) {
      return areas;
    }
    return [];
  }, [token?.allotedArea]);

  // Check if role is exempt from location restrictions
  const isLocationExempt = LOCATION_EXEMPT_ROLES.includes(role);

  /**
   * Get location filter value for API calls
   * Returns user's locations for restricted roles, "All" for exempt roles
   */
  const getLocationFilter = (): LocationType | string[] => {
    if (isLocationExempt || isAdminRole(role) || isLeadGenTeam(role)) {
      return "All";
    }
    return userLocations.length > 0 ? userLocations : "All";
  };

  /**
   * Check if user can view data for a specific location
   */
  const canViewLocation = (location: string): boolean => {
    if (isLocationExempt || isAdminRole(role) || isLeadGenTeam(role)) {
      return true;
    }
    return userLocations.some(
      (loc) => loc.toLowerCase() === location.toLowerCase()
    );
  };

  /**
   * Filter data array by location field
   */
  const filterDataByLocation = <T extends { location?: string }>(
    data: T[],
    locationField: keyof T = "location" as keyof T
  ): T[] => {
    if (isLocationExempt || isAdminRole(role) || isLeadGenTeam(role)) {
      return data;
    }

    if (userLocations.length === 0) {
      return data;
    }

    return data.filter((item) => {
      const itemLocation = item[locationField] as string;
      if (!itemLocation) return true;
      return userLocations.some(
        (loc) => loc.toLowerCase() === itemLocation.toLowerCase()
      );
    });
  };

  return {
    userLocations,
    role,
    getLocationFilter,
    canViewLocation,
    filterDataByLocation,
    isAdmin: isAdminRole(role),
    isLeadGen: isLeadGenTeam(role),
    isSales: isSalesTeam(role),
    isTeamLead: isTeamLead(role),
    isLocationExempt,
  };
}

export default useDashboardAccess;
