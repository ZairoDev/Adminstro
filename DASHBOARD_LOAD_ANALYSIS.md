# Dashboard Load Analysis

**Date:** June 19, 2026  
**Scope:** `/dashboard` route — layout shell, navbar, sidebar, main page, role feature dashboards  
**Method:** Static code trace only (no runtime profiling, no code changes in this pass)  
**Baseline:** Post-optimization state (React Query, dynamic role dashboards, feature-module hooks, index fixes)

---

## Executive Summary

The dashboard is a **fully client-rendered analytics hub**. Nothing on `/dashboard` is server-fetched as HTML; the browser must download JS, hydrate, then fire dozens of parallel API calls and server actions.

| Role | Dashboards mounted | Est. network round-trips (cold) | Est. time to first meaningful paint | Est. time to “all sections settled” |
|------|-------------------|--------------------------------|-------------------------------------|--------------------------------------|
| **SuperAdmin** | Admin + LeadGen + Sales + sales-by-agent + visits chart | **45–55** | 1.5–3 s (fast LAN) | 5–12 s (fast LAN) |
| **LeadGen-TeamLead** | LeadGen (+ partial admin if HR) | **18–25** | 1–2 s | 3–6 s |
| **Sales / Sales-TeamLead** | Sales + sales-by-agent | **20–28** | 1–2 s | 4–8 s |
| **Advert** | Advert only | **12–16** | 0.8–1.5 s | 2–4 s |
| **HR** | Admin (partial) | **22–30** | 1–2 s | 4–7 s |

On **slow 3G (~400 Kbps, 600 ms RTT)**, expect **3–5×** those times. The page becomes usable after layout + first skeleton, but charts may still be loading for **20–40 seconds**.

**Primary bottlenecks (ranked):**

1. **SuperAdmin mounts three full dashboards simultaneously** — each with 8–15 independent data sources.
2. **Server actions** (`queryActions.ts`) — each hook call is a separate POST; no HTTP batching.
3. **`MonthlyTargetGate` blocks all page content** for SuperAdmin / team leads until `/api/monthly-target/current` returns.
4. **Heavy MongoDB aggregations** on `Query`, `Visits`, `Bookings` (unchanged at DB layer despite index additions).
5. **Large JS bundles** — Sales dashboard still **statically imports** `BookingChart` and `BookingTable` (not code-split like Admin).
6. **Layout navbar polling** — 4–6 REST calls on every dashboard visit, independent of page content.

---

## Load Timeline (SuperAdmin)

```
T+0ms     Browser navigates to /dashboard
          ├─ middleware (auth cookie check)
          └─ Next.js loads layout + page JS chunks

T+100–400ms  React hydrates DashboardLayout
          ├─ QueryProvider mounts (5 min default staleTime)
          ├─ Sidebar reads Zustand AuthStore (no API) ✅
          ├─ useSocket connects (WebSocket, not HTTP)
          └─ MonthlyTargetGate → GET /api/monthly-target/current ⛔ BLOCKS children

T+200–800ms  Navbar widgets mount (parallel, inside layout)
          ├─ GET /api/personal-reminders/due          [shared cache key]
          ├─ GET /api/sales/reminders/getThreeDaysReminders
          ├─ GET /api/whatsapp/notifications/summary (+ 2 min poll)
          ├─ GET /api/notifications                   (+ 3 min poll)
          └─ SystemNotificationToast → GET /api/whatsapp/conversations/archive

T+gate     MonthlyTargetGate allows children
          Dashboard page mounts

T+gate+50  Page-level queries fire (parallel)
          ├─ GET /api/celebrations/today
          ├─ GET /api/visits/stats/created-by
          └─ useSalesByAgentSection (4 server actions if sales-by-agent visible)

T+gate+100 Dynamic import chunks begin downloading (parallel)
          ├─ features/admin/AdminDashboard.js
          ├─ features/leadgen/LeadGenDashboard.js
          └─ features/sales/SalesDashboard.js

T+chunk+   Each dashboard hook tree fires independently
          ~30–40 additional server actions + REST calls (see inventory below)

T+settled  Last Recharts / framer-motion chart finishes painting
          Typically 5–12 s on fast network, 20–40 s on slow 3G
```

---

## Architecture Overview

```
DashboardLayout (client)
├─ QueryProvider                    ← single cache for all dashboard queries
├─ Sidebar                        ← no HTTP (AuthStore only)
├─ Navbar
│   ├─ Notifications              ← React Query
│   ├─ WhatsAppNotifications      ← React Query + 2 min poll
│   ├─ SystemNotificationCenter   ← React Query + 3 min poll
│   ├─ PersonalReminderNavBell    ← shares ["personalReminders"] with banner
│   └─ SystemNotificationToast    ← archive fetch + socket listeners
├─ MonthlyTargetGate              ← blocks children for team-lead roles
└─ Dashboard page
    ├─ PersonalReminderBanner     ← same ["personalReminders"] cache ✅
    ├─ Celebrations               ← useCelebrations (React Query)
    ├─ AdminDashboard             ← dynamic import, ssr: false
    ├─ LeadGenDashboard             ← dynamic import, ssr: false
    ├─ Sales-by-agent section     ← useSalesByAgentSection (conditional)
    ├─ SalesDashboard             ← dynamic import, ssr: false
    └─ VisitsCreatedBy chart      ← useVisitsCreatedByStats (conditional)
```

---

## Optimizations Already Applied

| Phase | Change | Effect |
|-------|--------|--------|
| 1 | Removed 14 dead `(VS)` hooks from `page.tsx` | Eliminated ~20 wasted server actions per SuperAdmin load |
| 2 | Per-section skeletons (no full-page gate on leads) | Page shell visible immediately after gate |
| 3 | TanStack Query on all `(VS)` hooks + `QueryProvider` | Dedup + 5 min default cache; refetch on reconnect |
| 4 | `useAgents` shared hook (`["agents"]` key) | LeadGen agent filter shares cache with sales-by-agent |
| 5 | Personal reminders deduped (`["personalReminders"]`) | Banner + nav bell = 1 API call |
| 6 | Dynamic imports for 4 role dashboards + heavy charts (Admin) | Smaller initial JS parse; charts load on demand |
| 7 | Feature-module structure (`src/features/*`) | Clear ownership; easier to lazy-load per role |
| 8 | Compound MongoDB indexes | DB-side improvement (not measured in this static pass) |
| 9 | `useSalesByAgentSection` replaces full `useLeads` on page | Removed grouped leads, location leads, message status queries |
| 10 | `MonthlyTargetGate` skips API for non-team-lead roles | ~90% of users no longer blocked on target check |
| 11 | `useCelebrations` / `useVisitsCreatedByStats` → React Query | Cached; no manual focus/interval listeners |
| 12 | `useLoggedInEmployees` → React Query | Deduped; removed duplicate focus/visibility fetches |
| 13 | `useWeeksVisit` query key fix | Visits series no longer refetches when owner location filter changes |

---

## Complete Request Inventory (SuperAdmin, Cold Load)

### Layout shell — always runs

| # | Endpoint | Component | Caching | Blocks UI? |
|---|----------|-----------|---------|------------|
| 1 | `GET /api/monthly-target/current` | `MonthlyTargetGate` | None | **Yes — entire page** |
| 2 | `GET /api/personal-reminders/due` | Nav bell + banner | RQ 1 min stale | No |
| 3 | `GET /api/sales/reminders/getThreeDaysReminders` | `Notifications` | RQ 3 min stale | No |
| 4 | `GET /api/whatsapp/notifications/summary` | `WhatsAppNotifications` | RQ 1 min + 2 min poll | No |
| 5 | `GET /api/notifications` | `SystemNotificationCenter` | RQ 1 min + 3 min poll | No |
| 6 | `GET /api/whatsapp/conversations/archive` | `SystemNotificationToast` | None on mount | No |
| 7 | `GET /api/user/getloggedinuser` | `layout.tsx` | Only if `token.rentalType` missing | No |

**Layout subtotal: 6–7 REST calls** (plus ongoing polls every 2–3 min)

### Main page — `page.tsx`

| # | Endpoint / action | Hook | Conditional? |
|---|-------------------|------|----------------|
| 8 | `GET /api/celebrations/today` | `useCelebrations` | All authenticated |
| 9 | `GET /api/visits/stats/created-by` | `useVisitsCreatedByStats` | Admin/HR only |
| 10 | `getAverage` (SA) | `useSalesByAgentSection` | Sales-by-agent section |
| 11 | `getLeadsGroupCount` (SA) | `useSalesByAgentSection` | Same |
| 12 | `getRejectedLeadGroup` (SA) | `useSalesByAgentSection` | Same |
| 13 | `getAllAgent` (SA) | `useSalesByAgentSection` | Same — **shared `["agents"]` with LeadGen** ✅ |

**Page subtotal: 1 REST + up to 4 server actions**

### AdminDashboard (dynamic chunk)

| # | Endpoint / action | Source | Notes |
|---|-------------------|--------|-------|
| 14 | `getPropertyCount` (SA) | `usePropertyCount` | Properties aggregation |
| 15 | `getListingCounts` (SA) | `useListingCounts` | **Shared key with Sales if filters match** |
| 16 | `getCandidateCounts` + `getCandidateSummary` (SA×2) | `useCandidateCounts` | Parallel in one queryFn || 17 | `getCandidatePositions` (SA) | `useCandidateCounts` | Separate query |
| 18 | `GET /api/employee/getAllEmployee` | `useEffect` in Admin | Password panel only (page 1) |
| 19 | `GET /api/dashboard/owner-journey-stats` | `useEffect` in Admin | Owner stage chart |
| 20 | `GET /api/employee/getLoggedInEmployees` | `useLoggedInEmployees` | Online employees widget |
| 21 | `POST /api/employee/getActiveSessionsCounts` | `LoggedInEmployeesList` | **After #20 completes** (waterfall) |
| 22 | `GET /api/employee-activity/get-logs?limit=120` | `RecentEmployeeSessions` | 120 log entries parsed client-side |
| 23 | `getBookingStats` (SA) | `BookingChart` (dynamic) | `$lookup` on Bookings — expensive |
| 24 | `getLocationWeeklyTargets` (SA) | `BookingTable` | Target radial charts |

**Admin subtotal: ~11 server actions + 4 REST** (2 REST are sequential waterfall)

### LeadGenDashboard (dynamic chunk)

| # | Endpoint / action | Source | Notes |
|---|-------------------|--------|-------|
| 25 | `getAllAgent` (SA) | `useAgents` | **Cache hit from #13** ✅ |
| 26 | `getTodayLeads` (SA) | `useTodayLeads` | |
| 27 | `getLeadGenLeadsCount` (SA) | `useTodayLeads` | |
| 28 | `getReviews` (SA) | `useReview` | Multi-stage Query agg |
| 29 | `getLocationLeadStats` (SA) | `useLeadStats` | Query + targets |
| 30 | `getWebsiteLeadsCounts` (SA) | `useWebsiteLeadsCounts` | |
| 31 | `getSalesCardDetails` (SA) | `useSalesCard` | |
| 32 | `getLeadsCandleAnalytics` (SA) | `useLeadsCandleAnalytics` | Heavy Query aggregation |
| 33 | `POST /api/employee/getActiveEmployees` | `ActiveEmployeeList` | LeadGen role filter |

**LeadGen subtotal: ~8 server actions + 1 REST**

### SalesDashboard (dynamic chunk)

| # | Endpoint / action | Source | Notes |
|---|-------------------|--------|-------|
| 34 | `getWeeksVisit` (SA) | `useWeeksVisit` | Visits aggregation |
| 35 | `getVisitsToday` (SA) | `useWeeksVisit` | |
| 36 | `getUnregisteredOwners` (SA) | `useWeeksVisit` unregistered bundle | 3 actions in 1 queryFn |
| 37 | `getNewOwnersCount` (SA) | same bundle | |
| 38 | `OwnersCount` (SA) | same bundle | |
| 39 | `getLocationVisitStats` (SA) | `useVisitStats` | |
| 40 | `getMonthlyVisitStats` (SA) | `useMonthlyVisitStats` | |
| 41 | `getUnregisteredOwnerCounts` (SA) | `useUnregisteredOwnerCounts` | Overlaps with #36–38 data |
| 42 | `getBoostCounts` (SA) | `useBoosterCounts` | |
| 43 | `getBookingStats` (SA) | `BookingChart` static import | **Cache hit if same filters as Admin #23** ✅ |
| 44 | `getLocationWeeklyTargets` (SA) | `BookingTable` static import | **Duplicate of Admin #24** ❌ |

**Sales subtotal: ~11 server actions** (BookingTable duplicate)

### SuperAdmin total (cold)

| Category | Count |
|----------|-------|
| REST (layout + page + admin REST) | **~12** |
| Server actions (unique) | **~35–38** |
| **Total round-trips** | **~47–50** |
| MongoDB operations (estimated) | **80–120+** (actions often run 2–3 aggregations each) |

---

## Extra / Redundant API Calls Still Present

### Critical — high impact

| Issue | Where | Why it's redundant | Est. wasted calls |
|-------|-------|-------------------|-------------------|
| **Three dashboards mount at once** | `page.tsx` L349–560 | SuperAdmin renders Admin + LeadGen + Sales simultaneously | Forces full triple fetch every visit |
| **Duplicate `BookingTable`** | Admin L415 + Sales L210 | Two component instances → two `getLocationWeeklyTargets` calls | 1 SA per load |
| **`useWeeksVisit` unregistered bundle overlaps `useUnregisteredOwnerCounts`** | Sales dashboard | Both fetch owner/unregistered visit data with different shapes | 3–4 SA overlap |
| **Session counts waterfall** | `LoggedInEmployeesList` | `getActiveSessionsCounts` waits for `getLoggedInEmployees` | +200–800 ms sequential delay |
| **Navbar polls on idle tabs** | WhatsApp (2 min), System (3 min) | Continues background traffic even when dashboard not visible | Ongoing |

### Medium — noticeable on slow networks

| Issue | Where | Details |
|-------|-------|---------|
| **`RecentEmployeeSessions` fetches 120 logs upfront** | Admin dashboard | Large payload; only 8 rows displayed |
| **`getAllEmployee` for password panel** | Admin dashboard | Full employee list on mount even if user never opens password UI |
| **`SalesDashboard` static chart imports** | `SalesDashboard.tsx` L16–17 | BookingChart + BookingTable bundled into Sales chunk (~200KB+ extra parse) |
| **`useCelebrations` refetchOnWindowFocus: true** | Overrides QueryProvider default | Refetch on every tab switch (intentional but adds traffic) |
| **ActiveEmployeeList double fetch** | `active-employee-list.tsx` | `useEffect` calls `refetch` on mount even though hook has no initial fetch |

### Low — cached or conditional

| Issue | Where | Mitigation already in place |
|-------|-------|----------------------------|
| `getAllAgent` called from page + LeadGen | page + LeadGen | Shared `["agents"]` React Query key ✅ |
| `getBookingStats` Admin + Sales | Both dashboards | Shared `["bookingStats", ...]` key if filters match ✅ |
| `getListingCounts` Admin + Advert | Both dashboards | Shared `["listingCounts", filters]` if filters match ✅ |
| Personal reminders banner + bell | layout + page | Shared `["personalReminders"]` ✅ |

---

## How Extra Calls Happen (Mechanisms)

### 1. Hook-per-component pattern (no dashboard-level data layer)

Each chart owns its fetch logic. When SuperAdmin mounts three dashboards, **each dashboard's hooks all fire independently**. React Query deduplicates only when `queryKey` matches exactly.

```
page.tsx mounts
  → useCelebrations        → GET /api/celebrations/today
  → useSalesByAgentSection → 4 server actions
  → dynamic import AdminDashboard
      → usePropertyCount     → SA
      → useCandidateCounts   → SA×3
      → useListingCounts     → SA
      → LoggedInEmployees    → REST
      → BookingChart         → SA (after chunk loads)
      → BookingTable         → SA
  → dynamic import LeadGenDashboard
      → useTodayLeads        → SA×2
      → useLeadsCandleAnalytics → SA
      → ... 6 more hooks
  → dynamic import SalesDashboard
      → useWeeksVisit        → SA×5 (3 in bundle)
      → BookingChart         → SA (cache hit OR duplicate)
      → BookingTable         → SA (always duplicate)
```

There is **no orchestrator** that says "fetch shared data once, pass down."

### 2. Server actions ≠ batched API

Every `getX()` call from `queryActions.ts` is a **separate POST** to Next.js. Browser HTTP/1.1 limits ~6 concurrent connections per origin. With 40+ actions, requests **queue in the browser**, stretching wall-clock time on slow networks.

### 3. `MonthlyTargetGate` serializes the critical path

All page content — including celebrations and dashboard skeletons — waits behind:

```
GET /api/monthly-target/current  →  only then  →  children render  →  all other calls start
```

For SuperAdmin (a team-lead role), this adds **200 ms–2 s** before a single dashboard query fires.

### 4. Dynamic imports help JS, not data

`dynamic(() => import('@/features/admin/AdminDashboard'))` defers **JavaScript download/parse**, but once the chunk loads, **all hooks inside fire immediately**. Three dashboards = three chunks loading in parallel = **thundering herd** on MongoDB.

### 5. Layout fetches are uncorrelated with page fetches

Navbar widgets don't know about dashboard state. They always fetch on mount regardless of whether the user is on `/dashboard` analytics or `/dashboard/leads`. (Acceptable for global widgets, but adds baseline latency.)

---

## Slow Network Behavior

### Fast broadband (50 Mbps, 20 ms RTT)

| Phase | What user sees |
|-------|----------------|
| 0–0.5 s | Layout shell, sidebar, navbar skeletons |
| 0.5–1.5 s | MonthlyTargetGate skeleton OR dashboard page skeletons |
| 1.5–3 s | Quote card, celebration banner, role dashboard skeletons appear |
| 3–8 s | Charts progressively fill (Recharts, framer-motion) |
| 8–12 s | All sections populated; some heavy charts (MoleculeVisualization, LeadsCandle) may still be parsing |

### Slow 3G (400 Kbps, 600 ms RTT, 2% packet loss)

| Phase | What user sees |
|-------|----------------|
| 0–3 s | Blank or layout shell; JS chunks downloading |
| 3–8 s | MonthlyTargetGate blocking; user sees skeleton bars |
| 8–15 s | First text content (quote, reminders) |
| 15–30 s | First charts appear (whichever server action returns first) |
| 30–60 s | Most sections visible; timeouts possible on heavy aggregations |
| 60 s+ | User may see partial data; failed sections show error states (RQ retry: 1) |

### Specific slow-network failure modes

1. **Server action timeout** — MongoDB aggregations on unindexed fields (pre-index) or large collections may exceed serverless function limits.
2. **No request prioritization** — Celebrations and critical KPIs compete with `RecentEmployeeSessions` (120 logs) and navbar polls.
3. **No offline/skeleton stale-while-revalidate** — Except React Query cache on repeat visits within 5 min.
4. **Large JS on Sales chunk** — Static `BookingChart` import blocks Sales chunk download; on 3G this alone can take 5–10 s.
5. **WebSocket + HTTP competition** — Socket connection shares bandwidth with 40+ HTTP requests.

### Repeat visit (within 5 min, same session)

React Query serves cached data for most hooks → **~8–12 calls** instead of ~50 (layout polls + gate + any stale/expired queries). Feels significantly faster.

---

## Race Conditions & Concurrency Issues

### Confirmed / likely

| # | Location | Description | Severity |
|---|----------|-------------|----------|
| R1 | `MonthlyTargetGate` + page hooks | Page queries cannot start until gate resolves; not a race but a **serialization bottleneck** | High |
| R2 | `LoggedInEmployeesList` L69–83 | `getActiveSessionsCounts` fires on every `employees` array change; rapid socket login/logout events can queue overlapping POSTs; last-write-wins on `sessionsMap` | Medium |
| R3 | `BookingTable` L64–96 | Creates `AbortController` but passes it to nothing — `getLocationWeeklyTargets` is a server action and **cannot be aborted**; `mounted` flag prevents stale setState but server work continues | Low |
| R4 | `useSalesByAgentSection` filter handlers | `fetchLeadStatus` and `fetchRejectedLeadGroup` both update the same filter state; rapid filter clicks can cause **out-of-order responses** (React Query handles via queryKey, but UI may flicker) | Low |
| R5 | `celebrationToastShownRef` + `useEffect` | Strict Mode double-mount in dev can fire effect twice; ref prevents duplicate toast in prod but **sessionStorage reads may run twice** | Low |
| R6 | `AdminDashboard` password `getAllEmployee` | If user navigates away before response, `setAllEmployeesList` may run on unmounted component (no cleanup in useEffect) | Low |
| R7 | Three dashboards + shared query keys | If Admin and Sales mount with **different** `bookingStatsFilters`, cache miss → two expensive `getBookingStats` run **concurrently** on same MongoDB collection | Medium |
| R8 | `SystemNotificationToast` socket + archive fetch | Archive fetch and socket events can deliver overlapping notification sets; deduplicator handles most cases but rapid bursts may cause UI flicker | Low |

### Not observed (mitigated)

| Concern | Mitigation |
|---------|------------|
| Duplicate personal reminders fetch | Shared `["personalReminders"]` key ✅ |
| Duplicate agents list fetch | Shared `["agents"]` key ✅ |
| Visits series refetch on unrelated filter change | Fixed query keys in `useWeeksVisit` ✅ |
| Full-page block on leads loading | Removed in Phase 2 ✅ |

---

## Sidebar & Navbar Performance

### Sidebar (`src/components/sidebar.tsx`)

- **No HTTP calls** on render — reads role from `AuthStore` via dynamic import in `useEffect`.
- **Flash of logo** while role is `null` (first paint shows logo placeholder until effect runs).
- Large static route map (~1700 lines) increases JS bundle size but does not cause API slowness.
- **Not a network bottleneck.**

### Navbar widgets

| Widget | Loads on | Impact |
|--------|----------|--------|
| `Notifications` | Sales/SuperAdmin/Sales-TeamLead | 1 REST, deferred until `isMounted` |
| `WhatsAppNotifications` | Same roles | 1 REST + poll every 2 min |
| `SystemNotificationCenter` | All authenticated | 1 REST + poll every 3 min |
| `PersonalReminderNavBell` | All authenticated | Shared cache with banner |
| `SystemNotificationToast` | All authenticated | Archive fetch + socket (global) |
| `LeadSearch` | Always visible | Search is on-demand (no mount fetch) ✅ |
| `InfoCard` | Always visible | iframe loads only on click ✅ |

**Navbar adds 4–6 REST calls** before the dashboard page content even begins loading (in parallel with MonthlyTargetGate).

---

## Further Improvements (Recommendations Only — No Code in This Pass)

### Tier 1 — Highest ROI

1. **Lazy-mount role dashboards** — Only mount the dashboard matching primary role; load others on tab switch or scroll intersection. Would cut SuperAdmin fetch count by ~60%.
2. **Single shared `BookingTable` instance** — Render once in page.tsx, not in both Admin and Sales.
3. **Defer Admin HR widgets** — `LoggedInEmployeesList`, `RecentEmployeeSessions`, password panel: load when HR section scrolls into view or accordion opens.
4. **Merge owner/unregistered fetches** — Combine `useWeeksVisit` unregistered bundle and `useUnregisteredOwnerCounts` into one server action.
5. **Batch server actions** — Create `/api/dashboard/batch` endpoint that returns Admin+LeadGen+Sales summary in one POST (or use React Query's parallel query with server-side aggregation).

### Tier 2 — Medium ROI

6. **Dynamic import BookingChart in SalesDashboard** (match Admin pattern).
7. **Move `MonthlyTargetGate` check to layout shell only for team leads** — render dashboard skeletons below gate, not behind it.
8. **Add `enabled: false` + Intersection Observer** to heavy charts (LeadsCandle, MoleculeVisualization, CandidateStats).
9. **Reduce `RecentEmployeeSessions` limit** from 120 → 20 server-side.
10. **Stagger dashboard chunk loading** — Admin first, LeadGen +500 ms, Sales +1000 ms (reduce MongoDB thundering herd).

### Tier 3 — Infrastructure

11. **Server-side caching** (Redis/in-memory) for aggregations with 1–5 min TTL.
12. **Materialized views** for daily dashboard rollups (leads by status, visits by day).
13. **HTTP/2 or HTTP/3** on deployment — reduces head-of-line blocking for 40+ requests.
14. **Request prioritization** — Critical KPIs first, HR widgets last.

---

## Verification Checklist (For Future Runtime Audit)

Use Chrome DevTools → Network (Slow 3G preset) + React Query Devtools:

- [ ] Count total requests in first 10 s on SuperAdmin `/dashboard`
- [ ] Measure `monthly-target/current` TTFB — does it block LCP?
- [ ] Confirm `["agents"]` and `["bookingStats"]` cache hits on second dashboard mount
- [ ] Confirm `BookingTable` fires twice (Admin + Sales)
- [ ] Profile MongoDB with `explain()` on top 5 aggregations
- [ ] Check Sales dashboard JS chunk size (static BookingChart impact)
- [ ] Tab away and back — count refetch from `useCelebrations` + navbar polls
- [ ] Throttle to Offline → Online — verify `refetchOnReconnect` storm

---

## Key Files Reference

| File | Role |
|------|------|
| `src/app/dashboard/layout.tsx` | Shell, navbar, gate, QueryProvider |
| `src/app/dashboard/(dashboard)/page.tsx` | Orchestrator, dynamic dashboards |
| `src/features/admin/AdminDashboard.tsx` | Admin/HR analytics |
| `src/features/leadgen/LeadGenDashboard.tsx` | Lead gen KPIs |
| `src/features/sales/SalesDashboard.tsx` | Sales/visits analytics |
| `src/features/advert/AdvertDashboard.tsx` | Advert-only dashboard |
| `src/hooks/(VS)/useSalesByAgentSection.ts` | Sales-by-agent data (page only) |
| `src/hooks/shared/useCelebrations.ts` | Celebrations cache |
| `src/hooks/shared/useVisitsCreatedByStats.ts` | Visits chart cache |
| `src/providers/QueryProvider.tsx` | Global RQ defaults (5 min stale) |
| `src/actions/(VS)/queryActions.ts` | All server actions / MongoDB aggregations |
| `src/components/monthly-target/MonthlyTargetGate.tsx` | Page blocker for team leads |

---

## Related Documents

- `DASHBOARD_PERFORMANCE_AUDIT.md` — Original audit (pre-optimization baseline)
- `SUPERADMIN_REQUEST_TRACE.md` — Line-by-line hook trace (partially outdated; page no longer mounts 14 dead hooks)

*This document reflects the codebase as of the feature-module reorganization and Phase 9–11 optimizations. Re-run request counting after any further changes.*
