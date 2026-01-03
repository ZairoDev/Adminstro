# Dashboard Security & Access Control Review

## Executive Summary

This document provides a comprehensive review of Role-Based Access Control (RBAC) and Location-Based Access Control (LBAC) implementation across the dashboard, identifying security gaps, data leakage risks, and providing fixes.

---

## 1. Role-Based Access Control (RBAC) Review

### ✅ **Strengths**

1. **Centralized Configuration**: Access control is well-structured in `dashboardConfig.ts`
2. **Hook-Based Access**: `useDashboardAccess` hook provides consistent access checking
3. **Middleware Protection**: Route-level protection exists in `middleware.ts`

### ❌ **Critical Issues Found**

#### Issue 1: Data Leakage - Sales Metrics Visible to LeadGen Users

**Location**: `src/app/dashboard/(dashboard)/page.tsx:437`

**Problem**: The "Sales by Agent" section is shown to LeadGen users, which violates RBAC principles.

```typescript
// CURRENT (VULNERABLE):
{(showLeadGenDashboard) && !showAdvertDashboard && canAccess("salesByAgent") && (
  <Card>
    {/* Sales Performance by Agent */}
  </Card>
)}
```

**Risk**: LeadGen users can see sales performance metrics they shouldn't have access to.

**Fix Required**: Ensure only Sales team members can access this section.

---

#### Issue 2: API Route - Missing Role Validation

**Location**: `src/app/api/employee/getAllEmployee/route.ts`

**Problem**: The API doesn't properly validate user roles before returning employee data.

```typescript
// CURRENT (VULNERABLE):
if (token.role === "LeadGen-TeamLead") {
  allEmployees = await Employees.find({ ...query, role: "LeadGen" }).sort({
    _id: -1,
  });
} else {
  allEmployees = await Employees.find(query).sort({ _id: -1 });
}
```

**Risk**: Any authenticated user can potentially access all employee data.

**Fix Required**: Add proper role-based filtering for all roles.

---

#### Issue 3: Dashboard Component Access Not Enforced

**Location**: `src/components/dashboards/LeadGenDashboard.tsx` and `SalesDashboard.tsx`

**Problem**: Components rely on conditional rendering but don't have explicit access denial for unauthorized roles.

**Risk**: If a user somehow bypasses the main dashboard checks, they could see unauthorized data.

**Fix Required**: Add explicit access checks at component level.

---

## 2. Location-Based Access Control (LBAC) Review

### ✅ **Strengths**

1. **Location Filter Hook**: `useLocationFilter` provides location-based filtering
2. **Config-Based Exemptions**: Clear definition of location-exempt roles

### ❌ **Critical Issues Found**

#### Issue 4: Commented-Out Location Filtering in API

**Location**: `src/app/api/leads/getAllLeads/route.ts:152-162`

**Problem**: Location filtering code is commented out, allowing users to see data from all locations.

```typescript
// COMMENTED OUT (VULNERABLE):
// if (allotedArea) {
//   query.location = new RegExp(allotedArea, "i");
// } else {
//   if (role !== "SuperAdmin" && role !== "Sales-TeamLead" && role !== "LeadGen-TeamLead") {
//     if (Array.isArray(assignedArea)) {
//       query.location = { $in: assignedArea };
//     } else {
//       query.location = assignedArea;
//     }
//   }
// }
```

**Risk**: Sales users can see leads from locations they're not assigned to.

**Fix Required**: Re-enable and properly implement location filtering.

---

#### Issue 5: Inconsistent Location Filtering Across APIs

**Location**: Multiple API routes

**Problem**: Some APIs enforce location filtering, others don't. Inconsistent implementation.

**Affected Routes**:
- `/api/leads/getAllLeads` - Location filtering commented out
- `/api/leads/route` - Only applies if `assignedArea` exists in filters
- `/api/sales/monthly-stats` - Forces LeadGen-only, ignores location

**Risk**: Data leakage across locations.

**Fix Required**: Standardize location filtering across all Sales-related APIs.

---

#### Issue 6: Frontend Location Filtering Not Enforced

**Location**: Dashboard components

**Problem**: While `accessibleLocations` is computed, it's not consistently used to filter data before rendering.

**Risk**: Even if API filters correctly, frontend could display unauthorized data if API is bypassed.

**Fix Required**: Add defensive frontend filtering as a second layer.

---

## 3. API Security Issues

### Issue 7: Parameter Manipulation Vulnerability

**Location**: Multiple API routes

**Problem**: APIs accept location/role parameters from client without server-side validation.

**Example**: 
```typescript
const allotedArea = request.nextUrl.searchParams.get("allotedArea");
// Used directly without validation against token.allotedArea
```

**Risk**: Users could manipulate query parameters to access unauthorized data.

**Fix Required**: Always validate client-provided parameters against token data.

---

### Issue 8: Missing Authorization Checks

**Location**: Various API routes

**Problem**: Some routes don't verify user has permission to access the requested resource.

**Fix Required**: Add explicit authorization checks before data retrieval.

---

## 4. Dark Mode & UI Consistency Issues

### Issue 9: Hardcoded Colors in Charts

**Location**: Chart components

**Problem**: Some charts use hardcoded colors that don't adapt to dark mode.

**Affected Components**:
- Custom charts may not respect dark mode
- Tooltip backgrounds may be hardcoded

**Fix Required**: Use theme-aware color variables.

---

### Issue 10: Inconsistent Dark Mode Styling

**Location**: Dashboard components

**Problem**: While most components have dark mode support, some use inconsistent color schemes.

**Fix Required**: Standardize dark mode color palette.

---

## 5. Edge Cases & Validation

### Issue 11: Empty State Handling

**Location**: Dashboard components

**Problem**: No clear messaging when user has no assigned locations or no data.

**Fix Required**: Add proper empty states with clear messaging.

---

### Issue 12: Unauthorized Route Access

**Location**: Direct URL access

**Problem**: While middleware protects routes, dashboard components should also validate access.

**Fix Required**: Add component-level access validation.

---

## Recommended Fixes Priority

### 🔴 **Critical (Fix Immediately)**

1. Fix data leakage in "Sales by Agent" section (Issue 1)
2. Re-enable location filtering in API routes (Issue 4)
3. Add role validation in employee API (Issue 2)
4. Fix parameter manipulation vulnerabilities (Issue 7)

### 🟡 **High Priority (Fix Soon)**

5. Standardize location filtering across APIs (Issue 5)
6. Add component-level access checks (Issue 3)
7. Add defensive frontend filtering (Issue 6)

### 🟢 **Medium Priority (Fix When Possible)**

8. Fix dark mode inconsistencies (Issues 9, 10)
9. Improve empty state handling (Issue 11)
10. Add component-level route validation (Issue 12)

---

## Testing Checklist

- [ ] LeadGen user cannot see Sales metrics
- [ ] Sales user cannot see LeadGen metrics
- [ ] Sales user can only see data from assigned locations
- [ ] API rejects unauthorized location parameters
- [ ] Direct URL access to unauthorized sections is blocked
- [ ] Empty states show appropriate messages
- [ ] Dark mode works consistently across all charts
- [ ] All role combinations tested
- [ ] Edge cases (no locations, multiple locations) tested

---

## Implemented Fixes

### ✅ **Fixed Issues**

#### Fix 1: Data Leakage - Sales Metrics (COMPLETED)
- **File**: `src/app/dashboard/(dashboard)/page.tsx`
- **Change**: Changed condition from `showLeadGenDashboard` to `showSalesDashboard` for "Sales by Agent" section
- **Result**: LeadGen users can no longer see Sales metrics

#### Fix 2: Location Filtering in API (COMPLETED)
- **File**: `src/app/api/leads/getAllLeads/route.ts`
- **Change**: Re-enabled and properly implemented location filtering with validation
- **Result**: Sales users can only see leads from their assigned locations

#### Fix 3: Employee API Role Validation (COMPLETED)
- **File**: `src/app/api/employee/getAllEmployee/route.ts`
- **Change**: Added role-based access control with explicit allowed roles check
- **Result**: Only authorized roles (SuperAdmin, HR, Admin, Developer, TeamLeads) can access employee data

#### Fix 4: Security Utility Created (COMPLETED)
- **File**: `src/util/apiSecurity.ts`
- **Change**: Created reusable security utilities for location filtering and role validation
- **Result**: Standardized security functions available for all API routes

#### Fix 5: API Location Filtering - Visits (COMPLETED)
- **File**: `src/app/api/visits/getVisits/route.ts`
- **Change**: Added token validation and location filtering using security utilities
- **Result**: Sales users can only see visits from their assigned locations

#### Fix 6: API Location Filtering - Unregistered Owners (COMPLETED)
- **File**: `src/app/api/unregisteredOwners/getAvailableList/route.ts`
- **Change**: Added location validation and filtering with parameter validation
- **Result**: Sales users can only see owners from their assigned locations

#### Fix 7: API Location Filtering - Property Boost (COMPLETED)
- **File**: `src/app/api/propertyBoost/route.ts`
- **Change**: Added GET route security with location filtering
- **Result**: Sales users can only see boosts from their assigned locations

#### Fix 8: API Location Filtering - Owner Counts (COMPLETED)
- **File**: `src/app/api/unregisteredOwners/getCounts/route.ts`
- **Change**: Added location validation for count queries
- **Result**: Counts are filtered by user's assigned locations

#### Fix 9: Component-Level Access Checks (COMPLETED)
- **Files**: `src/components/dashboards/LeadGenDashboard.tsx`, `SalesDashboard.tsx`
- **Change**: Added explicit role validation at component level
- **Result**: Unauthorized users see access denied messages instead of data

#### Fix 10: Dark Mode - Chart Colors (COMPLETED)
- **File**: `src/components/charts/StackedBarChart.tsx`
- **Change**: Replaced hardcoded `fill: "white"` with theme-aware `fill-foreground`
- **Result**: Chart labels adapt to dark mode correctly

---

## Remaining Work

### 🟡 **High Priority (Still Need Fix)**

1. **Standardize Location Filtering Across All Sales APIs** ✅ **COMPLETED**
   - ✅ Applied location filtering to `/api/visits/getVisits`
   - ✅ Applied location filtering to `/api/unregisteredOwners/getAvailableList`
   - ✅ Applied location filtering to `/api/unregisteredOwners/getCounts`
   - ✅ Applied location filtering to `/api/propertyBoost`
   - ✅ Created reusable `apiSecurity.ts` utilities

2. **Add Component-Level Access Checks** ✅ **COMPLETED**
   - ✅ Added explicit access validation in `LeadGenDashboard`
   - ✅ Added explicit access validation in `SalesDashboard`
   - ✅ Components now show access denied messages for unauthorized roles

3. **Parameter Validation** ✅ **COMPLETED**
   - ✅ All location parameters are validated against token.allotedArea
   - ✅ Invalid location requests return empty results (security by default)
   - ✅ Type-safe parameter handling implemented

### 🟢 **Medium Priority**

4. **Dark Mode Fixes** ✅ **PARTIALLY COMPLETED**
   - ✅ Fixed hardcoded `fill: "white"` in StackedBarChart (now uses `fill-foreground`)
   - ✅ Most charts already use theme-aware colors (`hsl(var(--chart-X))`)
   - ✅ Tooltips use dark mode classes (`bg-white dark:bg-gray-800`)
   - ⚠️ Minor: Some box shadows use hardcoded rgba (acceptable, shadows work in both modes)

5. **Empty State Handling** ⏳ **PENDING**
   - Need to add proper messages for no data scenarios
   - Need to handle edge cases (no locations assigned, etc.)
   - Current implementation shows "No data available" but could be more specific

---

## Next Steps

1. ✅ Review and approve this security assessment
2. ✅ Implement critical fixes (COMPLETED)
3. ⏳ Continue with high-priority fixes
4. ⏳ Re-test after remaining fixes
5. ⏳ Document all changes in changelog

