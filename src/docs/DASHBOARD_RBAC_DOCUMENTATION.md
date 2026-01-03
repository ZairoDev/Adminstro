# Role-Based Dashboard Access Control (RBAC) Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration Files](#configuration-files)
4. [Role-Based Access Control](#role-based-access-control)
5. [Location-Based Filtering](#location-based-filtering)
6. [Dashboard Components](#dashboard-components)
7. [Hooks and Utilities](#hooks-and-utilities)
8. [Middleware Integration](#middleware-integration)
9. [Adding New Roles/Dashboards](#adding-new-rolesdashboards)
10. [Access Control Matrix](#access-control-matrix)

---

## Overview

The dashboard system implements a comprehensive **Role-Based Access Control (RBAC)** combined with **Location-Based Data Filtering** to ensure:

- Each user sees only the dashboards relevant to their role
- Sales team members only see data for their assigned locations
- Team Leads have elevated access without location restrictions
- Data exposure is strictly controlled based on user permissions

### Key Principles

1. **Separation of Concerns**: Configuration is separate from UI components
2. **Scalability**: Easy to add new roles, teams, or dashboard sections
3. **Security**: No unauthorized data exposure across teams or locations
4. **Flexibility**: Role overrides for special cases

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Login                               │
│                    (Token with role & allotedArea)               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Middleware (middleware.ts)                  │
│              Route-level access control per role                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Dashboard Configuration                        │
│                  (src/config/dashboardConfig.ts)                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  ROLE_TEAM_MAP  │  │ TEAM_DASHBOARDS │  │ LOCATION_EXEMPT │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Access Control Hooks                          │
│               (src/hooks/useDashboardAccess.ts)                  │
│  ┌──────────────────────┐  ┌────────────────────────────────┐   │
│  │  useDashboardAccess  │  │      useLocationFilter         │   │
│  │  - canAccess()       │  │  - filterDataByLocation()      │   │
│  │  - isAdmin           │  │  - getLocationFilter()         │   │
│  │  - isTeamLead        │  │  - canViewLocation()           │   │
│  └──────────────────────┘  └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Dashboard Components                           │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          │
│  │ AdminDashboard│ │LeadGenDashboard│ │SalesDashboard │          │
│  └───────────────┘ └───────────────┘ └───────────────┘          │
│                    ┌───────────────┐                             │
│                    │AdvertDashboard│                             │
│                    └───────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Main Dashboard Page                         │
│            (src/app/dashboard/(dashboard)/page.tsx)              │
│         Dynamically renders components based on role             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration Files

### 1. Dashboard Configuration (`src/config/dashboardConfig.ts`)

This is the **central configuration** for all dashboard access control.

#### Key Exports:

```typescript
// Available locations
export const LOCATIONS = ["Athens", "Thessaloniki", "Chania", "Milan", ...];

// Team types
export type TeamType = "LeadGeneration" | "Sales" | "HR" | "Admin" | "Advert";

// Dashboard section identifiers
export type DashboardSection = 
  | "leadGenOverview" | "leadsByLocation" | "reviewsDashboard" | ...
  | "visitStatistics" | "newOwners" | "revenueAnalytics" | ...;
```

#### Role to Team Mapping

```typescript
export const ROLE_TEAM_MAP: Record<string, TeamType[]> = {
  SuperAdmin: ["LeadGeneration", "Sales", "HR", "Admin", "Advert"], // All teams
  HR: ["HR", "LeadGeneration"],
  "LeadGen-TeamLead": ["LeadGeneration"],
  LeadGen: ["LeadGeneration"],
  "Sales-TeamLead": ["Sales", "Admin"],  // Sales + Admin access
  Sales: ["Sales"],
  Advert: ["Advert"],
  // ... more roles
};
```

**How it works**: Each role is mapped to one or more teams. The user gets access to all dashboard sections available to their teams.

#### Team Dashboards

```typescript
export const TEAM_DASHBOARDS: Record<TeamType, DashboardSection[]> = {
  LeadGeneration: [
    "leadGenOverview",
    "leadsByLocation",
    "reviewsDashboard",
    "leadStatistics",
    "websiteLeads",
    "salesByAgent",
  ],
  Sales: [
    "visitStatistics",
    "newOwners",
    "revenueAnalytics",
    "targetPerformance",
    // ...
  ],
  // ... other teams
};
```

**How it works**: Each team has a list of dashboard sections. When determining access, the system combines all sections from all teams the user belongs to.

#### Role-Specific Overrides

```typescript
export const ROLE_SECTION_OVERRIDES: Record<string, DashboardSection[]> = {
  "Sales-TeamLead": [
    "visitStatistics", "newOwners", "revenueAnalytics", "bookingChart", // etc.
  ],
  Advert: [
    "moleculeVisualization", "newOwners", "listingsCreated", "propertyBoost",
  ],
};
```

**How it works**: Some roles need specific sections that don't fit the team model. Overrides take precedence over team-based access.

#### Location Filtering

```typescript
// Sections that require location filtering
export const LOCATION_FILTERED_SECTIONS: DashboardSection[] = [
  "visitStatistics", "newOwners", "propertyBoost", "targetPerformance", ...
];

// Roles exempt from location filtering
export const LOCATION_EXEMPT_ROLES: string[] = [
  "SuperAdmin", "Admin", "Developer", "HR", 
  "Sales-TeamLead",  // Team Leads have no restriction
  "LeadGen-TeamLead", 
  "LeadGen",          // LeadGen sees all locations
  "Advert",
];
```

**How it works**: 
- If a role is in `LOCATION_EXEMPT_ROLES`, they see ALL locations
- If a section is in `LOCATION_FILTERED_SECTIONS` AND the user is NOT exempt, data is filtered by their `allotedArea`

---

## Role-Based Access Control

### How Access is Determined

```typescript
export function getAccessibleSections(role: string): DashboardSection[] {
  // 1. Check for role-specific overrides first
  if (ROLE_SECTION_OVERRIDES[role]) {
    return ROLE_SECTION_OVERRIDES[role];
  }

  // 2. Get teams for this role
  const teams = ROLE_TEAM_MAP[role] || [];
  
  // 3. Combine all sections from all teams
  const sections = new Set<DashboardSection>();
  teams.forEach((team) => {
    TEAM_DASHBOARDS[team]?.forEach((section) => {
      sections.add(section);
    });
  });

  return Array.from(sections);
}
```

### Example Flow

```
User: Sales-TeamLead logs in
  │
  ├─► Check ROLE_SECTION_OVERRIDES["Sales-TeamLead"]
  │   └─► Found! Return override sections
  │
  └─► Result: visitStatistics, newOwners, revenueAnalytics, 
              moleculeVisualization, bookingChart, etc.
```

```
User: Regular "Sales" logs in
  │
  ├─► Check ROLE_SECTION_OVERRIDES["Sales"]
  │   └─► Not found
  │
  ├─► Get ROLE_TEAM_MAP["Sales"] = ["Sales"]
  │
  ├─► Get TEAM_DASHBOARDS["Sales"]
  │   └─► visitStatistics, newOwners, propertyBoost, etc.
  │
  └─► Result: Sales team dashboard sections
```

---

## Location-Based Filtering

### Token Structure

The user's token contains:
```typescript
interface TokenInterface {
  id: string;
  name: string;
  email: string;
  role: string;
  allotedArea?: string | string[];  // Assigned locations
}
```

### How Location Filtering Works

```typescript
// In useDashboardAccess hook
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
```

### Filtering Logic

```typescript
// Check if role is exempt from location filtering
const isLocationExempt = LOCATION_EXEMPT_ROLES.includes(role);

// Filter data by location
const filterDataByLocation = (data) => {
  // Exempt roles see all data
  if (isLocationExempt || isAdminRole(role) || isLeadGenTeam(role)) {
    return data;
  }

  // No assigned locations = see all (fallback)
  if (userLocations.length === 0) {
    return data;
  }

  // Filter by user's assigned locations
  return data.filter((item) => {
    if (!item.location) return true;
    return userLocations.some(
      (loc) => loc.toLowerCase() === item.location.toLowerCase()
    );
  });
};
```

### Example

```
User: "Sales" with allotedArea: ["Athens", "Thessaloniki"]

visitStats = [
  { location: "Athens", achieved: 50 },      ✅ Visible
  { location: "Thessaloniki", achieved: 30 }, ✅ Visible
  { location: "Milan", achieved: 40 },        ❌ Hidden
  { location: "Chania", achieved: 20 },       ❌ Hidden
]

Filtered Result: Only Athens and Thessaloniki data shown
```

```
User: "Sales-TeamLead" (location exempt)

visitStats = [
  { location: "Athens", achieved: 50 },       ✅ Visible
  { location: "Thessaloniki", achieved: 30 }, ✅ Visible
  { location: "Milan", achieved: 40 },        ✅ Visible
  { location: "Chania", achieved: 20 },       ✅ Visible
]

Filtered Result: ALL locations visible
```

---

## Dashboard Components

### 1. AdminDashboard (`src/components/dashboards/AdminDashboard.tsx`)

**Purpose**: HR and SuperAdmin specific views

**Sections**:
- Logged In Employees
- Candidate Statistics (HR)
- Booking Statistics
- Weekly Target Dashboard
- Property Count by Country
- Listings Created

**Access**: SuperAdmin, HR, Admin

### 2. LeadGenDashboard (`src/components/dashboards/LeadGenDashboard.tsx`)

**Purpose**: Lead generation team analytics

**Sections**:
- Lead Generation Overview
- Today Leads (Stacked Bar Chart)
- Leads by Location (Pie Chart)
- Reviews Dashboard (Pie Chart)
- Lead Statistics Cards
- Website Leads

**Access**: LeadGen, LeadGen-TeamLead, SuperAdmin, Developer

### 3. SalesDashboard (`src/components/dashboards/SalesDashboard.tsx`)

**Purpose**: Sales team performance metrics

**Sections**:
- Revenue Analytics (Booking Chart)
- Target Performance (Weekly Target)
- Retargeting Statistics
- Visit Statistics
- New Owners
- Molecule Visualization
- Property Boost Performance

**Access**: Sales, Sales-TeamLead, SuperAdmin, Developer

**Location Filtering**: 
- Sales: Filtered by assigned locations
- Sales-TeamLead: No filtering (sees all)

### 4. AdvertDashboard (`src/components/dashboards/AdvertDashboard.tsx`)

**Purpose**: Advert team specific views

**Sections**:
- Molecule Visualization
- New Owners
- Listings Created Graph
- Property Boost Performance

**Access**: Advert only

---

## Hooks and Utilities

### useDashboardAccess()

Main hook for access control in components.

```typescript
const {
  // User info
  role,           // "Sales", "LeadGen", etc.
  userLocations,  // ["Athens", "Milan"]
  userId,
  userName,
  userEmail,

  // Team membership
  team,           // Primary team type
  isLeadGen,      // boolean
  isSales,        // boolean
  isAdmin,        // boolean
  isTeamLead,     // boolean
  hasLocationRestriction, // boolean

  // Access control
  accessibleSections,   // ["visitStatistics", "newOwners", ...]
  accessibleLocations,  // Filtered list of locations user can see
  sectionsConfig,       // Full config for accessible sections

  // Helper functions
  canAccess,            // (section) => boolean
  needsLocationFilter,  // (section) => boolean
  getFilteredLocations, // (allLocations) => filteredLocations
} = useDashboardAccess();
```

**Usage in components**:
```tsx
function MyDashboard() {
  const { canAccess, isAdmin, accessibleLocations } = useDashboardAccess();

  return (
    <div>
      {canAccess("visitStatistics") && <VisitStats />}
      {canAccess("newOwners") && <NewOwners />}
      {isAdmin && <AdminOnlySection />}
    </div>
  );
}
```

### useLocationFilter()

Specialized hook for data filtering.

```typescript
const {
  userLocations,         // User's assigned locations
  role,
  getLocationFilter,     // () => "All" | string[]
  canViewLocation,       // (location) => boolean
  filterDataByLocation,  // (data[]) => filteredData[]
  isAdmin,
  isLeadGen,
  isSales,
  isTeamLead,
  isLocationExempt,      // Whether user is exempt from filtering
} = useLocationFilter();
```

---

## Middleware Integration

### Route Access Control (`src/middleware.ts`)

```typescript
const roleAccess: { [key: string]: (string | RegExp)[] } = {
  SuperAdmin: [
    "/dashboard",
    /^\/dashboard\/.*$/,  // All dashboard routes
  ],
  LeadGen: [
    "/dashboard",         // Main dashboard
    "/dashboard/createquery",
    /^\/dashboard\/createquery\/.*$/,
  ],
  Sales: [
    "/dashboard",
    "/dashboard/visits",
    "/dashboard/rolebaseLead",
    "/dashboard/bookings",
    // ...
  ],
  // ... other roles
};
```

**How it works**:
1. User makes request to `/dashboard/visits`
2. Middleware extracts role from JWT token
3. Checks if role has access to that path
4. If no access, redirects to default route for that role

---

## Adding New Roles/Dashboards

### Adding a New Role

1. **Update `dashboardConfig.ts`**:

```typescript
// Add to ROLE_TEAM_MAP
export const ROLE_TEAM_MAP = {
  // ... existing roles
  "NewRole": ["Sales", "LeadGeneration"], // Teams this role belongs to
};

// Optional: Add role-specific override
export const ROLE_SECTION_OVERRIDES = {
  // ... existing overrides
  "NewRole": ["specificSection1", "specificSection2"],
};

// If location exempt
export const LOCATION_EXEMPT_ROLES = [
  // ... existing
  "NewRole",
];
```

2. **Update `middleware.ts`**:

```typescript
const roleAccess = {
  // ... existing roles
  "NewRole": [
    "/dashboard",
    "/dashboard/specific-page",
    // ... routes this role can access
  ],
};

export const defaultRoutes = {
  // ... existing
  "NewRole": "/dashboard",
};
```

### Adding a New Dashboard Section

1. **Add section type**:

```typescript
export type DashboardSection =
  | /* existing sections */
  | "newSection";
```

2. **Add to team dashboards**:

```typescript
export const TEAM_DASHBOARDS = {
  Sales: [
    // ... existing
    "newSection",
  ],
};
```

3. **Add section config**:

```typescript
export const DASHBOARD_SECTIONS_CONFIG = [
  // ... existing
  {
    id: "newSection",
    title: "New Section",
    description: "Description here",
    team: "Sales",
    requiresLocationFilter: true,
    order: 18,
  },
];
```

4. **Create UI component** and use in dashboard:

```tsx
// In SalesDashboard.tsx
{canAccess("newSection") && <NewSectionComponent />}
```

---

## Access Control Matrix

### Role to Dashboard Mapping

| Role | Lead Gen | Sales | Admin | Advert | Location Restricted |
|------|----------|-------|-------|--------|---------------------|
| SuperAdmin | ✅ All | ✅ All | ✅ All | ✅ All | ❌ No |
| Admin | ✅ All | ✅ Some | ✅ All | ❌ No | ❌ No |
| Developer | ✅ All | ✅ All | ✅ All | ✅ All | ❌ No |
| HR | ✅ All | ❌ No | ✅ Some | ❌ No | ❌ No |
| LeadGen-TeamLead | ✅ All | ❌ No | ❌ No | ❌ No | ❌ No |
| LeadGen | ✅ All | ❌ No | ❌ No | ❌ No | ❌ No |
| Sales-TeamLead | ❌ No | ✅ All | ✅ Some | ❌ No | ❌ No |
| Sales | ❌ No | ✅ All | ❌ No | ❌ No | ✅ Yes |
| Advert | ❌ No | ❌ No | ❌ No | ✅ All | ❌ No |

### Dashboard Section Access

| Section | SuperAdmin | LeadGen | Sales | Sales-TL | Advert |
|---------|------------|---------|-------|----------|--------|
| leadGenOverview | ✅ | ✅ | ❌ | ❌ | ❌ |
| leadsByLocation | ✅ | ✅ | ❌ | ❌ | ❌ |
| reviewsDashboard | ✅ | ✅ | ❌ | ❌ | ❌ |
| salesByAgent | ✅ | ✅ | ✅ | ✅ | ❌ |
| visitStatistics | ✅ | ❌ | ✅* | ✅ | ❌ |
| newOwners | ✅ | ❌ | ✅* | ✅ | ✅ |
| revenueAnalytics | ✅ | ❌ | ✅* | ✅ | ❌ |
| moleculeVisualization | ✅ | ❌ | ✅* | ✅ | ✅ |
| listingsCreated | ✅ | ❌ | ❌ | ❌ | ✅ |
| bookingChart | ✅ | ❌ | ❌ | ✅ | ❌ |

*`✅*` = Filtered by assigned locations

---

## Summary

The RBAC system provides:

1. **Granular Control**: Each role sees exactly what they need
2. **Security**: No cross-team data exposure
3. **Flexibility**: Easy to modify via configuration
4. **Scalability**: Simple to add new roles, teams, or sections
5. **Location Awareness**: Sales data filtered by assignment
6. **Team Lead Elevation**: Team leads get full access without restrictions

For questions or modifications, update the configuration files and the system automatically adjusts access across all components.

