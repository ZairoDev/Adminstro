/**
 * Dashboard Configuration
 * Defines role-based access control and dashboard visibility rules
 */

// Available locations in the system
export const LOCATIONS = [
  "Athens",
  "Thessaloniki", 
  "Chania",
  "Milan",
  "Barcelona",
  "Lisbon",
] as const;

export type LocationType = typeof LOCATIONS[number] | "All";

// Team types for dashboard grouping
export type TeamType = "LeadGeneration" | "Sales" | "HR" | "Admin" | "Advert";

// Dashboard section identifiers
export type DashboardSection =
  // Lead Generation Dashboards
  | "leadGenOverview"
  | "leadsByLocation"
  | "reviewsDashboard"
  | "leadStatistics"
  | "websiteLeads"
  // Sales Dashboards
  | "visitStatistics"
  | "newOwners"
  | "propertyBoost"
  | "targetPerformance"
  | "retargetingStatistics"
  | "salesByAgent"
  | "revenueAnalytics"
  | "moleculeVisualization"
  // Admin/HR Dashboards
  | "loggedInEmployees"
  | "candidateStats"
  | "bookingChart"
  | "weeklyTarget"
  | "propertyCount"
  | "listingsCreated";

// Role to Team mapping - Updated for all roles
export const ROLE_TEAM_MAP: Record<string, TeamType[]> = {
  SuperAdmin: ["LeadGeneration", "Sales", "HR", "Admin", "Advert"],
  HR: ["HR", "LeadGeneration"],
  Admin: ["Admin", "LeadGeneration", "Sales"],
  "LeadGen-TeamLead": ["LeadGeneration"],
  LeadGen: ["LeadGeneration"],
  "Sales-TeamLead": ["Sales", "Admin"], // Full Sales access + some admin features
  Sales: ["Sales"],
  Advert: ["Advert"],
  Developer: ["LeadGeneration", "Sales", "HR", "Admin", "Advert"],
  Content: ["LeadGeneration"],
  Intern: ["LeadGeneration"], // Basic access
  Guest: [], // No dashboard access
  "Subscription-Sales": ["Sales"],
};

// Dashboard sections accessible by each team
export const TEAM_DASHBOARDS: Record<TeamType, DashboardSection[]> = {
  LeadGeneration: [
    "leadGenOverview",
    "leadsByLocation",
    "reviewsDashboard",
    "leadStatistics",
    "websiteLeads",
    "salesByAgent", // Added for LeadGen team
  ],
  Sales: [
    "visitStatistics",
    "newOwners",
    "propertyBoost",
    "targetPerformance",
    "retargetingStatistics",
    "salesByAgent",
    "revenueAnalytics",
    "moleculeVisualization",
  ],
  HR: [
    "loggedInEmployees",
    "candidateStats",
  ],
  Admin: [
    "bookingChart",
    "weeklyTarget",
    "propertyCount",
    "retargetingStatistics",
    "revenueAnalytics",
  ],
  Advert: [
    "listingsCreated",
    "propertyBoost",
    "newOwners",
    "moleculeVisualization",
  ],
};

// Custom role-specific section overrides (for roles that need specific sections beyond team mapping)
export const ROLE_SECTION_OVERRIDES: Record<string, DashboardSection[]> = {
  "Sales-TeamLead": [
    "visitStatistics",
    "newOwners",
    "propertyBoost",
    "targetPerformance",
    "retargetingStatistics",
    "salesByAgent",
    "revenueAnalytics",
    "moleculeVisualization",
    "bookingChart",
  ],
  Advert: [
    "moleculeVisualization",
    "newOwners",
    "listingsCreated",
    "propertyBoost",
  ],
};

// Dashboard sections that require location filtering for Sales team
// Note: Sales-TeamLead is excluded from location restrictions
export const LOCATION_FILTERED_SECTIONS: DashboardSection[] = [
  "visitStatistics",
  "newOwners",
  "propertyBoost",
  "targetPerformance",
  "retargetingStatistics",
  "salesByAgent",
  "revenueAnalytics",
  "moleculeVisualization",
];

// Roles that are exempt from location filtering (can see all locations)
export const LOCATION_EXEMPT_ROLES: string[] = [
  "SuperAdmin",
  "Admin",
  "Developer",
  "HR",
  "Sales-TeamLead", // Sales Team Lead has no location restriction
  "LeadGen-TeamLead",
  "LeadGen", // LeadGen can see all locations
  "Advert",
];

// Dashboard sections that are exempt from location filtering (visible to all locations)
export const LOCATION_EXEMPT_SECTIONS: DashboardSection[] = [
  "leadGenOverview",
  "leadsByLocation",
  "reviewsDashboard",
  "leadStatistics",
  "websiteLeads",
  "loggedInEmployees",
  "candidateStats",
  "listingsCreated",
];

// Dashboard section metadata
export interface DashboardSectionConfig {
  id: DashboardSection;
  title: string;
  description: string;
  team: TeamType;
  requiresLocationFilter: boolean;
  order: number;
}

export const DASHBOARD_SECTIONS_CONFIG: DashboardSectionConfig[] = [
  // Lead Generation sections
  {
    id: "leadGenOverview",
    title: "Lead Generation Overview",
    description: "Overview of lead generation performance",
    team: "LeadGeneration",
    requiresLocationFilter: false,
    order: 1,
  },
  {
    id: "leadsByLocation",
    title: "Leads by Location",
    description: "Distribution of leads across locations",
    team: "LeadGeneration",
    requiresLocationFilter: false,
    order: 2,
  },
  {
    id: "reviewsDashboard",
    title: "Reviews Dashboard",
    description: "Lead review statistics",
    team: "LeadGeneration",
    requiresLocationFilter: false,
    order: 3,
  },
  {
    id: "leadStatistics",
    title: "Lead Statistics",
    description: "Detailed lead statistics by location",
    team: "LeadGeneration",
    requiresLocationFilter: false,
    order: 4,
  },
  {
    id: "websiteLeads",
    title: "Website Leads",
    description: "Leads from website sources",
    team: "LeadGeneration",
    requiresLocationFilter: false,
    order: 5,
  },
  // Sales sections
  {
    id: "visitStatistics",
    title: "Visit Statistics",
    description: "Property visit statistics",
    team: "Sales",
    requiresLocationFilter: true,
    order: 10,
  },
  {
    id: "newOwners",
    title: "New Owners",
    description: "New property owner registrations",
    team: "Sales",
    requiresLocationFilter: true,
    order: 11,
  },
  {
    id: "moleculeVisualization",
    title: "Owner Network",
    description: "Visualization of owner connections",
    team: "Sales",
    requiresLocationFilter: false,
    order: 12,
  },
  {
    id: "propertyBoost",
    title: "Property Boost Performance",
    description: "Boost performance metrics",
    team: "Sales",
    requiresLocationFilter: true,
    order: 13,
  },
  {
    id: "targetPerformance",
    title: "Target Performance",
    description: "Sales target achievement",
    team: "Sales",
    requiresLocationFilter: true,
    order: 14,
  },
  {
    id: "revenueAnalytics",
    title: "Revenue Analytics",
    description: "Revenue and booking analytics",
    team: "Sales",
    requiresLocationFilter: true,
    order: 15,
  },
  {
    id: "retargetingStatistics",
    title: "Retargeting Statistics",
    description: "Retargeting campaign performance",
    team: "Sales",
    requiresLocationFilter: true,
    order: 16,
  },
  {
    id: "salesByAgent",
    title: "Sales by Agent",
    description: "Sales performance by agent",
    team: "Sales",
    requiresLocationFilter: true,
    order: 17,
  },
  // HR sections
  {
    id: "loggedInEmployees",
    title: "Logged In Employees",
    description: "Currently active employees",
    team: "HR",
    requiresLocationFilter: false,
    order: 20,
  },
  {
    id: "candidateStats",
    title: "Candidate Statistics",
    description: "Recruitment statistics",
    team: "HR",
    requiresLocationFilter: false,
    order: 21,
  },
  // Admin sections
  {
    id: "bookingChart",
    title: "Booking Statistics",
    description: "Booking performance chart",
    team: "Admin",
    requiresLocationFilter: false,
    order: 30,
  },
  {
    id: "weeklyTarget",
    title: "Weekly Target",
    description: "Weekly target dashboard",
    team: "Admin",
    requiresLocationFilter: false,
    order: 31,
  },
  {
    id: "propertyCount",
    title: "Property Count",
    description: "Total property statistics",
    team: "Admin",
    requiresLocationFilter: false,
    order: 32,
  },
  // Advert sections
  {
    id: "listingsCreated",
    title: "Listings Created",
    description: "New listing statistics",
    team: "Advert",
    requiresLocationFilter: false,
    order: 40,
  },
];

/**
 * Get accessible dashboard sections for a role
 */
export function getAccessibleSections(role: string): DashboardSection[] {
  // Check for role-specific overrides first
  if (ROLE_SECTION_OVERRIDES[role]) {
    return ROLE_SECTION_OVERRIDES[role];
  }

  const teams = ROLE_TEAM_MAP[role] || [];
  const sections = new Set<DashboardSection>();

  teams.forEach((team) => {
    TEAM_DASHBOARDS[team]?.forEach((section) => {
      sections.add(section);
    });
  });

  return Array.from(sections);
}

/**
 * Check if a role can access a specific dashboard section
 */
export function canAccessSection(
  role: string,
  section: DashboardSection
): boolean {
  const accessibleSections = getAccessibleSections(role);
  return accessibleSections.includes(section);
}

/**
 * Check if a section requires location filtering for a role
 */
export function requiresLocationFilter(
  role: string,
  section: DashboardSection
): boolean {
  // Check if role is exempt from location filtering
  if (LOCATION_EXEMPT_ROLES.includes(role)) {
    return false;
  }

  // Check if section is exempt from location filtering
  if (LOCATION_EXEMPT_SECTIONS.includes(section)) {
    return false;
  }

  return LOCATION_FILTERED_SECTIONS.includes(section);
}

/**
 * Get the team type for a role
 */
export function getTeamForRole(role: string): TeamType | null {
  const teams = ROLE_TEAM_MAP[role];
  return teams && teams.length > 0 ? teams[0] : null;
}

/**
 * Check if role belongs to Lead Generation team
 */
export function isLeadGenTeam(role: string): boolean {
  const teams = ROLE_TEAM_MAP[role] || [];
  return teams.includes("LeadGeneration");
}

/**
 * Check if role belongs to Sales team
 */
export function isSalesTeam(role: string): boolean {
  const teams = ROLE_TEAM_MAP[role] || [];
  return teams.includes("Sales");
}

/**
 * Check if role is admin level (can see all data)
 */
export function isAdminRole(role: string): boolean {
  return ["SuperAdmin", "Admin", "Developer"].includes(role);
}

/**
 * Check if role is a team lead (has elevated permissions)
 */
export function isTeamLead(role: string): boolean {
  return ["LeadGen-TeamLead", "Sales-TeamLead"].includes(role);
}

/**
 * Check if role has location restriction
 */
export function hasLocationRestriction(role: string): boolean {
  return !LOCATION_EXEMPT_ROLES.includes(role);
}

/**
 * Filter locations based on user's assigned areas
 */
export function filterLocationsByAccess(
  allLocations: string[],
  userLocations: string[] | undefined,
  role: string
): string[] {
  // Roles exempt from location filtering can see all locations
  if (LOCATION_EXEMPT_ROLES.includes(role)) {
    return allLocations;
  }

  // Admin roles can see all locations
  if (isAdminRole(role)) {
    return allLocations;
  }

  // Lead Gen team can see all locations (no location restriction)
  if (isLeadGenTeam(role) && !isSalesTeam(role)) {
    return allLocations;
  }

  // Sales team (non-TeamLead) can only see assigned locations
  if (isSalesTeam(role) && userLocations && userLocations.length > 0) {
    return allLocations.filter((loc) => 
      userLocations.some(
        (userLoc) => userLoc.toLowerCase() === loc.toLowerCase()
      )
    );
  }

  // Default: return assigned locations or all if none assigned
  return userLocations && userLocations.length > 0 ? userLocations : allLocations;
}
