# SuperAdmin Request Trace

**Verified against source:** `src/app/dashboard/(dashboard)/page.tsx`, child dashboards, `src/app/dashboard/layout.tsx`, and `(VS)` hooks.  
**Role profile:** `SuperAdmin` loading `/dashboard`  
**Dashboards mounted:** `AdminDashboard` + `LeadGenDashboard` + `SalesDashboard` + sales-by-agent card (not `AdvertDashboard`)

---

## Part A — `page.tsx` Hook Verification

### A.1 Hooks & auth (not `(VS)`)

| Hook | Line | Returned symbols | Consumed at | Status |
|------|------|------------------|-------------|--------|
| `useAuthStore` | 141 | `token` | L434–437, L442, L457, L506, L524, L575, L616, L715–716, L818 | **USED** |
| `useDashboardAccess` | 142–151 | `role`, `isLeadGen`, `isSales`, `isAdmin`, `isTeamLead`, `hasLocationRestriction`, `accessibleLocations`, `canAccess` | L666–672, L759, L802–804, L946 | **USED** |
| `useRouter` | 153 | `router` | *(never referenced in file)* | **UNUSED** |

### A.2 `(VS)` hooks — line, consumption, status

| Hook | Line | Mount network calls (see Part B) | Returned data consumed in `page.tsx`? | Consumption lines | Status |
|------|------|----------------------------------|--------------------------------------|-------------------|--------|
| `usePropertyCount` | 264–270 | `getPropertyCount` | **No** — destructured only | — | **UNUSED** + **DUPLICATE** (`AdminDashboard` L102–108) |
| `useLeads` | 272–287 | 6 server actions + `GET /api/leads/getStatusCount` | **Partial** | See A.3 | **PARTIAL** + **DUPLICATE** (`LeadGenDashboard` L140, `SalesDashboard` L104) |
| `useTodayLeads` | 288–295 | `getTodayLeads`, `getLeadGenLeadsCount` | **No** | — | **UNUSED** + **DUPLICATE** (`LeadGenDashboard` L175–182) |
| `WeeksVisit` | 297–305 | `getWeeksVisit`, `getVisitsToday`, `getUnregisteredOwners`, `getNewOwnersCount`, `OwnersCount` | **No** | — | **UNUSED** + **DUPLICATE** (`SalesDashboard` L71–79) |
| `SalesCard` | 307 | `getSalesCardDetails` | **No** | — | **UNUSED** + **DUPLICATE** (`LeadGenDashboard` L202) |
| `ListingCounts` | 310 | `getListingCounts` | **No** — `totalListings` only feeds `chartData` useMemo (L337–355) which is never rendered | — | **UNUSED** + **DUPLICATE** (`AdminDashboard` L110) |
| `BoostCounts` | 311 | `getBoostCounts` | **No** | — | **UNUSED** + **DUPLICATE** (`SalesDashboard` L103) |
| `useWebsiteLeadsCounts` | 312–318 | `getWebsiteLeadsCounts` | **No** | — | **UNUSED** + **DUPLICATE** (`LeadGenDashboard` L194–200) |
| `useUnregisteredOwnerCounts` | 319 | `getUnregisteredOwnerCounts` | **No** | — | **UNUSED** + **DUPLICATE** (`SalesDashboard` L102) |
| `useBookingStats` | 321 | `getBookingStats` | **No** | — | **UNUSED** + **DUPLICATE** (`BookingChartImproved` in `AdminDashboard` L404) |
| `useCandidateCounts` | 324–332 | `getCandidateCounts`, `getCandidateSummary`, `getCandidatePositions` | **No** | — | **UNUSED** + **DUPLICATE** (`AdminDashboard` L112–123) |
| `useReview` | 357 | `getReviews` | **No** | — | **UNUSED** + **DUPLICATE** (`LeadGenDashboard` L184) |
| `useLeadStats` | 359–365 | `getLocationLeadStats` | **No** | — | **UNUSED** + **DUPLICATE** (`LeadGenDashboard` L186–192) |
| `useVisitStats` | 367–373 | `getLocationVisitStats` | **No** | — | **UNUSED** + **DUPLICATE** (`SalesDashboard` L81–87) |
| `useMonthlyVisitStats` | 380–384 | `getMonthlyVisitStats` | **No** | — | **UNUSED** + **DUPLICATE** (`SalesDashboard` L98–101) |

### A.3 `useLeads` on `page.tsx` — field-level trace

| Field / caller | Destructure line | Used in UI? | UI lines | Notes |
|----------------|------------------|-------------|----------|-------|
| `leads` | 273 | **Yes** (loading gate only) | L656–662 | Blocks entire dashboard until truthy; `leadsByAgent` / `leadsByLocation` never rendered |
| `leadsGroupCount` | 274 | **Yes** | L864–869 | `LeadCountPieChart` |
| `fetchLeadStatus` | 275 | **Yes** | L794–795, L812–813, L827–828 | Filter handlers |
| `allEmployees` | 276 | **Yes** | L386, L820 | Agent filter + `emp` average divisor |
| `fetchRejectedLeadGroup` | 277 | **Yes** | L795, L813, L828 | Filter handlers |
| `rejectedLeadGroups` | 278 | **Yes** | L390, L889–924 | Rejection grid |
| `average` | 279 | **Yes** | L387–388 | Pie chart averages |
| `isError` | 281 | **Yes** | L642–653 | Error screen |
| `error` | 282 | **Yes** | L648 | Error message |
| `isLoading` | 280 | **No** | — | **UNUSED** |
| `refetch` | 283 | **No** | — | **UNUSED** |
| `reset` | 284 | **No** | — | **UNUSED** |

**Mount calls from `useLeads` (`useLeads.ts` L198–206) not consumed on `page.tsx`:**

| Call | Used on page UI? | Used in any SuperAdmin child UI? |
|------|------------------|----------------------------------|
| `getGroupedLeads` | Gate only (L656) | No |
| `getAverage` | Yes (L387) | No |
| `getLeadsGroupCount` | Yes | No (child has own instance) |
| `getAllAgent` | Yes (L820) | Yes (`LeadGenDashboard` agent filters) |
| `GET /api/leads/getStatusCount` | **No** | **No** (`messageStatus` UI commented in `SalesDashboard` L322–327) |
| `getLeadsByLocation` | **No** | **No** (never bound in any dashboard JSX) |
| `getRejectedLeadGroup` | Yes | No (child has own instance) |

### A.4 Non-hook fetches on `page.tsx`

| Mechanism | Lines | Endpoint | UI consumption | Status |
|-----------|-------|----------|----------------|--------|
| `fetchVisitsCreatedByStats` | 232–260 | `GET /api/visits/stats/created-by` | L948–959 `VisitsCreatedByMultiLineChart` | **USED** |
| `fetchCentralizedCelebrations` | 441–506 | `GET /api/celebrations/today` | L677–685 `CelebrationNotification` | **USED** |
| `fetchEvents` employee loop | 522–591 | `GET /api/employee/getAllEmployee?currentPage={1..10}` | L637–640, L728–732 celebration flip | **USED** (overlaps `celebrations/today`) |

### A.5 Dead code on `page.tsx` (no extra network, but confirms audit)

- **Orphan chart imports** (L50–60, L80–90): imported, never rendered in JSX.
- **Orphan state** never read: `selectedCountry` L157, `visitsFilter` L174, `propertyFilters` L188, `listingFilters` L196, `BoostFilters` L200, `websiteLeadsFilters` L204, `leadCountFilters` L208, `reviewsFilters` L212, `unregisteredOwnersFilters` L221, `candidateFilters` L226, `leadGenLeadsCount` L230, `selectedCityChartMonth` L375.
- **`chartData` useMemo** L337–355: computed, never passed to JSX.

---

## Part B — SuperAdmin Request Trace Table

**Legend**

- **SA** = Next.js server action POST (`queryActions.ts`)
- **REST** = `fetch` / `axios` HTTP GET/POST
- **Used by UI?** = whether that specific instance's data appears in rendered UI
- **Can be removed?** = whether this instance can be dropped without losing UI (assuming children remain)

`P` = number of `getAllEmployee` pages fetched on `page.tsx` (loop breaks early; **1 ≤ P ≤ 10**).

### B.1 Layout shell (`dashboard/layout.tsx`)

| # | Endpoint / Action | Component | Hook / trigger | Used by UI? | Can be removed? |
|---|-------------------|-----------|----------------|-------------|-----------------|
| 1 | `GET /api/user/getloggedinuser` | `DashboardLayout` | `useEffect` L46–60 | No (silent token sync) | No |
| 2 | `GET /api/monthly-target/current` | `MonthlyTargetGate` | `checkTarget` L40–43 | Yes (gate / modal) | No |
| 3 | `GET /api/personal-reminders/due` | `PersonalReminderBanner` | `fetchDue` L27–29, effect L53–55 | Yes (banner if due) | No |
| 4 | `GET /api/personal-reminders/due` | `PersonalReminderNavBell` | `load` L152, effect L149–161 | Yes (badge count) | **Yes** (dedupe with #3) |
| 5 | `GET /api/sales/reminders/getThreeDaysReminders` | `Notifications` | `fetchReminders` L34–36, effect L50–51 | Yes (bell count) | No |
| 6 | `GET /api/whatsapp/notifications/summary` | `WhatsAppNotifications` | `fetchNotifications` L79, effect L102–104 | Yes | No |
| 7 | `GET /api/notifications` | `SystemNotificationCenter` | `fetchNotifications` L62, effect L74–77 | Yes | No |
| 8 | `GET /api/whatsapp/conversations/archive` | `SystemNotificationToast` | `useEffect` L528–554 | Yes (archive filter) | No |

### B.2 Dashboard page — `page.tsx` instance

| # | Endpoint / Action | Component | Hook / trigger | Used by UI? | Can be removed? |
|---|-------------------|-----------|----------------|-------------|-----------------|
| 9 | `getPropertyCount` (SA) | `page.tsx` | `usePropertyCount` L77–79 | **No** | **Yes** |
| 10 | `getGroupedLeads` (SA) | `page.tsx` | `useLeads` mount L199 | Yes (gate L656) | No* |
| 11 | `getAverage` (SA) | `page.tsx` | `useLeads` mount L200 | Yes (L387–388) | No* |
| 12 | `getLeadsGroupCount` (SA) | `page.tsx` | `useLeads` mount L201 | Yes (L864–869) | No* |
| 13 | `getAllAgent` (SA) | `page.tsx` | `useLeads` mount L202 | Yes (L820) | No* |
| 14 | `GET /api/leads/getStatusCount` | `page.tsx` | `useLeads` → `fetchMessageStatus` L203 | **No** | **Yes** |
| 15 | `getLeadsByLocation` (SA) | `page.tsx` | `useLeads` mount L204 | **No** | **Yes** |
| 16 | `getRejectedLeadGroup` (SA) | `page.tsx` | `useLeads` mount L205 | Yes (L889–924) | No* |
| 17 | `getTodayLeads` (SA) | `page.tsx` | `useTodayLeads` mount L75 | **No** | **Yes** |
| 18 | `getLeadGenLeadsCount` (SA) | `page.tsx` | `useTodayLeads` mount L76 | **No** | **Yes** |
| 19 | `getWeeksVisit` (SA) | `page.tsx` | `WeeksVisit` mount L118 | **No** | **Yes** |
| 20 | `getVisitsToday` (SA) | `page.tsx` | `WeeksVisit` mount L119 | **No** | **Yes** |
| 21 | `getUnregisteredOwners` (SA) | `page.tsx` | `WeeksVisit` `fetchUnregisteredVisits` L99–100 | **No** | **Yes** |
| 22 | `getNewOwnersCount` (SA) | `page.tsx` | `WeeksVisit` L101 | **No** | **Yes** |
| 23 | `OwnersCount` (SA) | `page.tsx` | `WeeksVisit` L102 | **No** | **Yes** |
| 24 | `getSalesCardDetails` (SA) | `page.tsx` | `SalesCard` mount L63 | **No** | **Yes** |
| 25 | `getListingCounts` (SA) | `page.tsx` | `ListingCounts` mount L43 | **No** | **Yes** |
| 26 | `getBoostCounts` (SA) | `page.tsx` | `BoostCounts` mount L42 | **No** | **Yes** |
| 27 | `getWebsiteLeadsCounts` (SA) | `page.tsx` | `useWebsiteLeadsCounts` mount L29 | **No** | **Yes** |
| 28 | `getUnregisteredOwnerCounts` (SA) | `page.tsx` | `useUnregisteredOwnerCounts` mount L35 | **No** | **Yes** |
| 29 | `getBookingStats` (SA) | `page.tsx` | `useBookingStats` mount L111 | **No** | **Yes** |
| 30 | `getCandidateCounts` (SA) | `page.tsx` | `useCandidateCounts` effect L102–107 | **No** | **Yes** |
| 31 | `getCandidateSummary` (SA) | `page.tsx` | `useCandidateCounts` L69–78 | **No** | **Yes** |
| 32 | `getCandidatePositions` (SA) | `page.tsx` | `useCandidateCounts` effect L109–111 | **No** | **Yes** |
| 33 | `getReviews` (SA) | `page.tsx` | `useReview` mount L48 | **No** | **Yes** |
| 34 | `getLocationLeadStats` (SA) | `page.tsx` | `useLeadStats` effect L62–69 | **No** | **Yes** |
| 35 | `getLocationVisitStats` (SA) | `page.tsx` | `useVisitStats` effect L45–47 | **No** | **Yes** |
| 36 | `getMonthlyVisitStats` (SA) | `page.tsx` | `useMonthlyVisitStats` effect L39–42 | **No** | **Yes** |
| 37 | `GET /api/visits/stats/created-by` | `page.tsx` | `fetchVisitsCreatedByStats` L236, effect L256–260 | Yes (L948–959) | No |
| 38 | `GET /api/celebrations/today` | `page.tsx` | `fetchCentralizedCelebrations` L449, effect L488–489 | Yes (L677–685) | No |
| 39–(38+P) | `GET /api/employee/getAllEmployee?currentPage=n` | `page.tsx` | `fetchEvents` loop L541–543 | Yes (celebration flip) | **Yes**† |

\*Keep **one** `useLeads` instance for sales-by-agent; remove duplicate instances in children only after shared cache or splitting hook.  
†Replace with `celebrations/today` (#38) for flip-card data.

### B.3 `AdminDashboard` (SuperAdmin renders all sections)

| # | Endpoint / Action | Component | Hook / trigger | Used by UI? | Can be removed? |
|---|-------------------|-----------|----------------|-------------|-----------------|
| 40 | `getPropertyCount` (SA) | `AdminDashboard` | `usePropertyCount` | Yes (L451–466) | No (but duplicate of #9) |
| 41 | `getListingCounts` (SA) | `AdminDashboard` | `ListingCounts` | Yes (L516–623) | No (duplicate of #25) |
| 42 | `getCandidateCounts` (SA) | `AdminDashboard` | `useCandidateCounts` | Yes (L285–300) | No (duplicate of #30) |
| 43 | `getCandidateSummary` (SA) | `AdminDashboard` | `useCandidateCounts` | Yes (L285–300) | No (duplicate of #31) |
| 44 | `getCandidatePositions` (SA) | `AdminDashboard` | `useCandidateCounts` | Yes (positions filter) | No (duplicate of #32) |
| 45 | `GET /api/employee/getAllEmployee` | `AdminDashboard` | `useEffect` L157–180 | Yes (password mgmt L310–383) | No |
| 46 | `GET /api/dashboard/owner-journey-stats` | `AdminDashboard` | `useEffect` L183–211 | Yes (L471–510) | No |
| 47 | `getBookingStats` (SA) | `BookingChartImproved` | `useBookingStats` mount | Yes | No (duplicate of #29) |
| 48 | `getBookingStats` (SA) | `BookingChartImproved` | `BookingChart` `useEffect` L62–85 | Yes | **Yes**‡ |
| 49 | `getLocationWeeklyTargets` (SA) | `WeeklyTargetDashboard` | `BookingTable` effect L64–75 | Yes (L409–415) | No |
| 50 | `GET /api/employee/getLoggedInEmployees` | `LoggedInEmployeesList` | `useLoggedInEmployees` L56 | Yes | No |
| 51 | `POST /api/employee/getActiveSessionsCounts` | `LoggedInEmployeesList` | `useEffect` L69–83 | Yes | No |
| 52 | `GET /api/employee-activity/get-logs` | `RecentEmployeeSessions` | `useEffect` L127–128 | Yes | No |

‡Second fetch inside same chart instance; fix hook/chart coordination, not remove chart.

### B.4 `LeadGenDashboard`

| # | Endpoint / Action | Component | Hook / trigger | Used by UI? | Can be removed? |
|---|-------------------|-----------|----------------|-------------|-----------------|
| 53 | `getGroupedLeads` (SA) | `LeadGenDashboard` | `useLeads` mount | **No** (only `allEmployees` used) | **Yes**§ |
| 54 | `getAverage` (SA) | `LeadGenDashboard` | `useLeads` mount | **No** | **Yes**§ |
| 55 | `getLeadsGroupCount` (SA) | `LeadGenDashboard` | `useLeads` mount | **No** | **Yes**§ |
| 56 | `getAllAgent` (SA) | `LeadGenDashboard` | `useLeads` mount | Yes (L446, L491) | No (duplicate of #13) |
| 57 | `GET /api/leads/getStatusCount` | `LeadGenDashboard` | `useLeads` mount | **No** | **Yes**§ |
| 58 | `getLeadsByLocation` (SA) | `LeadGenDashboard` | `useLeads` mount | **No** | **Yes**§ |
| 59 | `getRejectedLeadGroup` (SA) | `LeadGenDashboard` | `useLeads` mount | **No** | **Yes**§ |
| 60 | `getLeadsCandleAnalytics` (SA) | `LeadGenDashboard` | `useLeadsCandleAnalytics` mount | Yes (L358–458) | No |
| 61 | `getTodayLeads` (SA) | `LeadGenDashboard` | `useTodayLeads` mount | Yes (L306–310) | No (duplicate of #17) |
| 62 | `getLeadGenLeadsCount` (SA) | `LeadGenDashboard` | `useTodayLeads` mount | Yes (L264) | No (duplicate of #18) |
| 63 | `getReviews` (SA) | `LeadGenDashboard` | `useReview` mount | Yes (L506–509) | No (duplicate of #33) |
| 64 | `getLocationLeadStats` (SA) | `LeadGenDashboard` | `useLeadStats` effect | Yes (L536–549) | No (duplicate of #34) |
| 65 | `getWebsiteLeadsCounts` (SA) | `LeadGenDashboard` | `useWebsiteLeadsCounts` mount | Yes (L275–286) | No (duplicate of #27) |
| 66 | `getSalesCardDetails` (SA) | `LeadGenDashboard` | `SalesCard` mount | Yes (L327–345) | No (duplicate of #24) |
| 67 | `POST /api/employee/getActiveEmployees` | `ActiveEmployeeList` | `useActiveEmployees` L25, effect L12–16 | Yes (L25–31) | No |

§`useLeads` in LeadGen should be replaced with `getAllAgent`-only hook; entire bundle is wasted except #56.

### B.5 `SalesDashboard` (SuperAdmin: no `BookingChart` / `BookingTable` here)

`showRevenueAndTargetHere` is `false` when `isAdmin` (`SalesDashboard` L171).

| # | Endpoint / Action | Component | Hook / trigger | Used by UI? | Can be removed? |
|---|-------------------|-----------|----------------|-------------|-----------------|
| 68 | `getWeeksVisit` (SA) | `SalesDashboard` | `WeeksVisit` mount | Yes (owners section) | No (duplicate of #19) |
| 69 | `getVisitsToday` (SA) | `SalesDashboard` | `WeeksVisit` mount | **No**¶ | **Yes**¶ |
| 70 | `getUnregisteredOwners` (SA) | `SalesDashboard` | `WeeksVisit` mount | Yes (L348) | No (duplicate of #21) |
| 71 | `getNewOwnersCount` (SA) | `SalesDashboard` | `WeeksVisit` mount | Yes (L387–408) | No (duplicate of #22) |
| 72 | `OwnersCount` (SA) | `SalesDashboard` | `WeeksVisit` mount | Yes (L361 `MoleculeVisualization`) | No (duplicate of #23) |
| 73 | `getLocationVisitStats` (SA) | `SalesDashboard` | `useVisitStats` effect | Yes (L275–288) | No (duplicate of #35) |
| 74 | `getMonthlyVisitStats` (SA) | `SalesDashboard` | `useMonthlyVisitStats` effect | Yes (L312–319) | No (duplicate of #36) |
| 75 | `getUnregisteredOwnerCounts` (SA) | `SalesDashboard` | `useUnregisteredOwnerCounts` mount | Yes (L423–426) | No (duplicate of #28) |
| 76 | `getBoostCounts` (SA) | `SalesDashboard` | `BoostCounts` mount | Yes (L438–449) | No (duplicate of #26) |
| 77 | `getGroupedLeads` (SA) | `SalesDashboard` | `useLeads` mount | **No** | **Yes**§ |
| 78 | `getAverage` (SA) | `SalesDashboard` | `useLeads` mount | **No** | **Yes**§ |
| 79 | `getLeadsGroupCount` (SA) | `SalesDashboard` | `useLeads` mount | **No** | **Yes**§ |
| 80 | `getAllAgent` (SA) | `SalesDashboard` | `useLeads` mount | **No** | **Yes**§ |
| 81 | `GET /api/leads/getStatusCount` | `SalesDashboard` | `useLeads` mount | **No** (chart commented L322–327) | **Yes**§ |
| 82 | `getLeadsByLocation` (SA) | `SalesDashboard` | `useLeads` mount | **No** | **Yes**§ |
| 83 | `getRejectedLeadGroup` (SA) | `SalesDashboard` | `useLeads` mount | **No** | **Yes**§ |

¶`visitsToday` destructured in hook but not referenced in `SalesDashboard` JSX.

**Note:** `isError` / `error` from `useLeads` are passed to `BoostMultiLineChart` (L447–448) but originate from leads fetch, not boosts — misleading wiring, not a separate request.

---

## Part C — Totals (SuperAdmin initial load)

### C.1 Request counts

| Metric | Formula | P = 1 | P = 10 |
|--------|---------|-------|--------|
| **Layout REST** | #1–8 | 8 | 8 |
| **Page server actions** | #9–36 | 28 | 28 |
| **Page REST** | #37–38 + P employee pages | 2 + P = **3** | **12** |
| **Admin** | #40–52 (incl. 2× booking) | 13 | 13 |
| **LeadGen** | #53–67 | 15 | 15 |
| **Sales** | #68–83 | 16 | 16 |
| **TOTAL REQUESTS** | | **8 + 28 + 3 + 13 + 15 + 16 = 83** | **8 + 28 + 12 + 13 + 15 + 16 = 92** |

**Server actions:** 28 + 13 + 15 + 16 = **72** (each is one HTTP POST)  
**REST:** 8 + (2+P) + 0 + 1 + 0 + 0 = **11 + P** → **12** (P=1) or **21** (P=10)

### C.2 Duplicate requests (2nd+ instance of same endpoint/action)

| Action / endpoint | Times executed | Instances |
|-------------------|----------------|-----------|
| `getPropertyCount` | 2 | #9, #40 |
| `getGroupedLeads` | 3 | #10, #53, #77 |
| `getAverage` | 3 | #11, #54, #78 |
| `getLeadsGroupCount` | 3 | #12, #55, #79 |
| `getAllAgent` | 3 | #13, #56, #80 |
| `GET /api/leads/getStatusCount` | 3 | #14, #57, #81 |
| `getLeadsByLocation` | 3 | #15, #58, #82 |
| `getRejectedLeadGroup` | 3 | #16, #59, #83 |
| `getTodayLeads` | 2 | #17, #61 |
| `getLeadGenLeadsCount` | 2 | #18, #62 |
| `getWeeksVisit` | 2 | #19, #68 |
| `getVisitsToday` | 2 | #20, #69 |
| `getUnregisteredOwners` | 2 | #21, #70 |
| `getNewOwnersCount` | 2 | #21, #71 |
| `OwnersCount` | 2 | #23, #72 |
| `getSalesCardDetails` | 2 | #24, #66 |
| `getListingCounts` | 2 | #25, #41 |
| `getBoostCounts` | 2 | #26, #76 |
| `getWebsiteLeadsCounts` | 2 | #27, #65 |
| `getUnregisteredOwnerCounts` | 2 | #28, #75 |
| `getBookingStats` | 3 | #29, #47, #48 |
| `getCandidateCounts` | 2 | #30, #42 |
| `getCandidateSummary` | 2 | #31, #43 |
| `getCandidatePositions` | 2 | #32, #44 |
| `getReviews` | 2 | #33, #63 |
| `getLocationLeadStats` | 2 | #34, #64 |
| `getLocationVisitStats` | 2 | #35, #73 |
| `getMonthlyVisitStats` | 2 | #36, #74 |
| `GET /api/personal-reminders/due` | 2 | #3, #4 |
| `GET /api/employee/getAllEmployee` | 1+P | #39–(38+P), #45 |

**Duplicate request count (P=1):** 83 total − **45 unique** ≈ **38 duplicate executions**  
*(Unique = 31 distinct server actions + 12 distinct REST endpoints, after deduping reminders to 1)*

### C.3 Unused requests (data not rendered from that instance)

| Category | Count (P=1) | Request #s |
|----------|-------------|------------|
| **Page hook instances with zero UI use** | 24 SA + 2 REST | #9, #14–15, #17–36 |
| **Page `useLeads` partial waste** | included above | #14–15 |
| **LeadGen `useLeads` bundle waste** | 6 SA + 1 REST | #53–55, #57–59 (keep #56 only) |
| **Sales `useLeads` entire instance waste** | 6 SA + 1 REST | #77–83 |
| **Sales `getVisitsToday` waste** | 1 SA | #69 |
| **Globally never rendered** | 3× per load | `getLeadsByLocation`, `getStatusCount` (all instances) |
| **Redundant celebration employee scan** | P REST | #39–(38+P) overlaps #38 |

**Unused request count (P=1):** **24** (page dead hooks) + **7** (LeadGen leads bundle except agent) + **7** (Sales leads bundle) + **1** (`getVisitsToday` duplicate) + **1** (reminder dedupe) + **P** (employee loop) ≈ **40 + P** → **41** at P=1

### C.4 Estimated requests after cleanup

Assumptions: remove all dead `page.tsx` hooks; keep one `useLeads` on page for sales-by-agent (5 SA, drop #14–15); dedupe reminders; drop employee loop (use #38 only); fix BookingChart double-fetch; split `useLeads` in LeadGen/Sales to `getAllAgent` only or shared cache; single instance per remaining hook.

| Layer | Requests |
|-------|----------|
| Layout (deduped reminders) | 7 REST |
| Page (sales-by-agent + visits chart + celebrations) | 5 SA + 2 REST |
| AdminDashboard | 11 SA + 5 REST |
| LeadGenDashboard | 8 SA + 1 REST |
| SalesDashboard | 9 SA |
| **TOTAL** | **33 SA + 15 REST = 48** |

| Scenario | Total | vs current (P=1) |
|----------|-------|------------------|
| Current | **83** | — |
| After cleanup | **~48** | **−42% (−35 requests)** |
| If P=10 today | **92** → **~48** | **−48%** |

---

## Part D — Audit claim verification

| Claim in `DASHBOARD_PERFORMANCE_AUDIT.md` | Verified? | Correction |
|-------------------------------------------|-----------|------------|
| SuperAdmin mounts Admin + LeadGen + Sales | **Yes** | `page.tsx` L666–668, L746–749, L943 |
| `page.tsx` runs nearly every `(VS)` hook | **Yes** | 15 hook calls L264–384 |
| Most page hook data unused in parent JSX | **Yes** | 13/15 hooks fully unused; `useLeads` partial |
| `!leads` blocks entire dashboard | **Yes** | L656–662 |
| Duplicate hooks across parent/children | **Yes** | 38 duplicate executions at P=1 |
| `getBookingStats` double-fetch in chart | **Yes** | #47 + #48 same component |
| `GET /api/personal-reminders/due` twice | **Yes** | #3 + #4 |
| Up to 10× `getAllEmployee` on page | **Yes** | L541 `page <= 10` |
| SalesDashboard hides revenue for SuperAdmin | **Yes** | `showRevenueAndTargetHere` L171 false when `isAdmin` |
| 60–80+ requests for SuperAdmin | **Yes** | **83 at P=1**, **92 at P=10** |
| `useDashboardData` used on main dashboard | **No** | Not imported in `page.tsx` — audit correctly said unused |
| `messageStatus` drives Sales UI | **No** | Donut chart commented; `getStatusCount` ×3 is dead |

---

## Part E — Quick reference: `page.tsx` hook status summary

| Line | Hook | Status |
|------|------|--------|
| 141 | `useAuthStore` | USED |
| 142 | `useDashboardAccess` | USED |
| 153 | `useRouter` | UNUSED |
| 264 | `usePropertyCount` | UNUSED, DUPLICATE |
| 272 | `useLeads` | PARTIAL USED, DUPLICATE |
| 288 | `useTodayLeads` | UNUSED, DUPLICATE |
| 297 | `WeeksVisit` | UNUSED, DUPLICATE |
| 307 | `SalesCard` | UNUSED, DUPLICATE |
| 310 | `ListingCounts` | UNUSED, DUPLICATE |
| 311 | `BoostCounts` | UNUSED, DUPLICATE |
| 312 | `useWebsiteLeadsCounts` | UNUSED, DUPLICATE |
| 319 | `useUnregisteredOwnerCounts` | UNUSED, DUPLICATE |
| 321 | `useBookingStats` | UNUSED, DUPLICATE |
| 324 | `useCandidateCounts` | UNUSED, DUPLICATE |
| 357 | `useReview` | UNUSED, DUPLICATE |
| 359 | `useLeadStats` | UNUSED, DUPLICATE |
| 367 | `useVisitStats` | UNUSED, DUPLICATE |
| 380 | `useMonthlyVisitStats` | UNUSED, DUPLICATE |

*Generated from static analysis. Runtime request count for `getAllEmployee` pages (`P`) depends on employee collection size.*
