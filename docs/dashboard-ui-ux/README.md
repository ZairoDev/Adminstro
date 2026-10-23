# Dashboard UI — tickets and instructions

**Page:** `/dashboard`  
**Date:** 2026-10-22  
**Goal:** A role-filtered morning briefing that stays readable, keyboard-usable, and quiet. The split-flap quote is the only loud element. Every other section is one neutral card with a heading that states the takeaway.

Work the tickets in order. Each phase is done before the next one starts. Do not change who can see which data. `src/config/dashboardConfig.ts` stays as it is.

## Desired end state

- The flap board is still there. With Reduce Motion on, it is static text. With motion on, it settles once, in black type on light tiles, with no rainbow flash.
- Every control on the page has a visible name and works from the keyboard.
- Body and control text is at least 14px. Text on white meets 4.5:1.
- Admin, Developer, and HR see one tab at a time, the same way SuperAdmin already does. Daily lead activity appears once, on the Lead Gen tab.
- Resetting or copying passwords is not on this page. Reset asks for confirmation and can be cancelled.
- Section cards share one surface. Headings have no emoji. Charts have a written summary. The owner molecule view is gone from this page.
- Below 500px, search, notifications, and reminders stay in the header next to logout.
- Birthdays use the banner only. The page does not toast on load.
- Empty, loading, and error text say what happened and what to do next.

## Out of scope

- Sidebar structure, collapse, and the mobile menu sheet.
- Role and section access in `src/config/dashboardConfig.ts`.
- The in-app light/dark toggle.
- Chart data, APIs, and calculations.
- Routes other than `/dashboard` and the header chrome in `src/app/dashboard/layout.tsx`.

## File map

| Area | Path |
| --- | --- |
| Page shell, quote flip, celebration toast, which dashboard mounts | `src/app/dashboard/(dashboard)/page.tsx` |
| Header that hides tools under 500px | `src/app/dashboard/layout.tsx` |
| Flap board | `src/components/ui/text-flipping-board.tsx` |
| SuperAdmin tabs | `src/components/dashboard/SuperAdminTabDashboard.tsx` |
| Two-tab shell | `src/components/dashboard/TwoTabDashboard.tsx` |
| Admin / HR blocks | `src/features/admin/AdminDashboard.tsx` |
| Lead gen blocks | `src/features/leadgen/LeadGenDashboard.tsx` |
| Sales blocks | `src/features/sales/SalesDashboard.tsx` |
| Advert blocks | `src/features/advert/AdvertDashboard.tsx` |
| Owner molecule (remove from the page only) | `src/components/molecule_visual.tsx` |
| Employee list, destination for password tools | `src/app/dashboard/employee/employeeList/page.tsx` |

## Order

| Phase | Tickets | Why this phase is first |
| --- | --- | --- |
| 1. Accessibility | DASH-01, DASH-02, DASH-03 | The page is hard to use with Reduce Motion, a keyboard, or small text |
| 2. Structure | DASH-04, DASH-05, DASH-07 | One job per view, destructive actions off the home, tools survive a narrow window |
| 3. Craft | DASH-06 | One signature (the flap board), everything else quiet |
| 4. Polish | DASH-08, DASH-09, DASH-10 | Copy and theme consistency |

---

## DASH-01 · Respect Reduce Motion on the quote board

**Severity:** Critical  
**Phase:** 1

**Why:** Opening `/dashboard` runs a 700ms 3D flip and a multi-second flap scramble. There is no `prefers-reduced-motion` check. During the scramble, white on orange-500 (`#ffffff` on `#f97316`) is 2.80:1.

**Files:**

- `src/components/ui/text-flipping-board.tsx`
- `src/app/dashboard/(dashboard)/page.tsx`

**Do this:**

1. In the flap board, read `window.matchMedia("(prefers-reduced-motion: reduce)")` once on mount, and listen for changes.
2. When Reduce Motion is on, set each cell to its final character immediately. Do not start the scramble timers (`BASE_STEP_MS`, `BASE_FLIP_S`, column delays).
3. Delete the random accent pick. `ACCENT_COLORS` (red, orange, yellow, green, blue, violet, white) must not paint cells. Resting tiles stay `bg-white text-neutral-900` in light mode and `dark:bg-neutral-800 dark:text-neutral-50` in dark mode.
4. Raise the compact floor from `clamp(11px, 1.8vw, 20px)` to `clamp(14px, 1.8vw, 20px)` so a phone never draws the quote under 14px.
5. In `page.tsx`, when Reduce Motion is on, do not apply `rotateX(180deg)`. Show either the quote or `CelebrationView`, and switch between them with no transform. The 700ms `transition-transform` stays only when motion is allowed.
6. When motion is allowed, keep a single settle. People must be able to read the quote without waiting through a rainbow scramble.

**Done when:**

- macOS or browser Reduce Motion: the quote is readable on first paint, and the celebration swap does not rotate.
- Motion allowed: tiles flip to the quote once, in the resting colors only.
- No cell uses `bg-orange-500` or `text-white` on a saturated fill.

---

## DASH-02 · Name every control and make it a real control

**Severity:** Critical  
**Phase:** 1

**Why:** The password refresh control is an icon with no name. The unregistered-owners count is a `div` with `onClick`, so it is not in the tab order. The click also pushes a relative path, `dashboard/unregistered-owner`.

**Files:**

- `src/features/admin/AdminDashboard.tsx` (password card, around the `RefreshCcw` button)
- `src/features/sales/SalesDashboard.tsx` (unregistered owners count, around the `handleClick` div)

**Do this:**

1. On the refresh button, put visible text: `Reset all passwords`. Keep the icon if you want. While `isPasswordGenerating` is true, set `aria-busy="true"` and change the label to `Resetting passwords…`. The spinner does not replace the label.
2. Replace the owners count `div` with a Next.js `Link` to `/dashboard/unregistered-owner` (leading slash). Style it as text, not a new card. The number stays the link content, and the accessible name is `Unregistered owners, {count}`.
3. Remove `handleClick` and the `useRouter` push for that count if nothing else uses them.

**Done when:**

- VoiceOver or a screen reader announces “Reset all passwords” and “Unregistered owners”.
- Tab reaches both controls. Enter on the owners link opens `/dashboard/unregistered-owner`, not `/dashboard/dashboard/unregistered-owner`.

DASH-05 moves the password buttons off this page. Do DASH-02 first so the control is safe if DASH-05 slips. DASH-05 then deletes this card from the dashboard.

---

## DASH-03 · Raise small type and fix the green tooltip

**Severity:** Critical  
**Phase:** 1

**Why:** Lead-chart filters use `h-8 text-xs` (12px / 9pt), under the 10pt floor. The listings tooltip paints “Long-Term” in `text-green-600` at 16px: `#16a34a` on white is 3.30:1. “Short-Term” in `text-blue-600` already passes at 5.17:1.

**Files:**

- `src/features/leadgen/LeadGenDashboard.tsx` (candle filters: `triggerClassName="w-[120px] h-8 text-xs"` and the date-range button `[&_button]:h-8 [&_button]:text-xs`)
- `src/features/admin/AdminDashboard.tsx` (listings `Tooltip`, the `text-green-600` line)

**Do this:**

1. Change those filter triggers to `text-sm` and at least `h-9` (14px). Do this anywhere else on these four dashboard files that sets `text-xs` on a control label. Search the four feature dashboards for `text-xs`.
2. In the listings tooltip, change Long-Term from `text-green-600` to `text-green-800` (`#166534` on white, above 4.5:1). Keep a dark-mode class that stays above 4.5:1 on `dark:bg-stone-950`. `dark:text-green-300` is the safe pair. Leave Short-Term on `text-blue-600` / `dark:text-blue-400`.
3. Do not shrink axis tick `fontSize: 14` in that chart. 14px is the floor.

**Done when:**

- No control label on `/dashboard` is under 14px.
- Long-Term tooltip text is green-800 in light mode and still readable in dark mode.

---

## DASH-04 · One tabbed home for Admin, Developer, and HR

**Severity:** High  
**Phase:** 2

**Why:** SuperAdmin, Sales team leads, and Lead Gen team leads already get a tab strip. Admin and Developer mount `AdminDashboard`, `LeadGenDashboard`, and `SalesDashboard` in one scroll. HR mounts admin and lead gen together. Daily lead activity is rendered in both `AdminDashboard` and `LeadGenDashboard`.

**Files:**

- `src/app/dashboard/(dashboard)/page.tsx`
- `src/components/dashboard/SuperAdminTabDashboard.tsx`
- `src/components/dashboard/TwoTabDashboard.tsx`
- `src/features/admin/AdminDashboard.tsx` (daily leads block at the top)

**Do this:**

1. Keep the existing branches for `SuperAdmin`, `Sales-TeamLead`, and `LeadGen-TeamLead`.
2. For `Admin` and `Developer`, render `SuperAdminTabDashboard` (tabs: Admin & HR, Lead Generation, Sales). Do not also render the three dashboards under it.
3. For `HR`, render `TwoTabDashboard` with Lead Gen and Admin, default tab `admin`. HR is not on the Sales team. Do not add a Sales tab.
4. Delete the stacked conditions at the bottom of `page.tsx` (`showAdminDashboard && …`, `showLeadGenDashboard && …`, `showSalesDashboard && …`) for these roles so a role never mounts more than one dashboard tree. Advert stays on `AdvertDashboard` only. Sales, sales-intern, and Subscription-Sales stay on `SalesDashboard` only. LeadGen, Content, and Intern stay on `LeadGenDashboard` only.
5. Remove the `DailyLeadsActiveEmployeesSection` block from `AdminDashboard`. It stays in `LeadGenDashboard` only.
6. Do not edit `dashboardConfig.ts`. Section gates inside each dashboard (`canAccess`, `isSuperAdmin`, `isHR`) stay. Adding a tab must not reveal a chart that role cannot already see. Admin still does not see the SuperAdmin-only revenue block.

**Done when:**

- Admin and Developer: three tabs, one panel visible, daily leads only under Lead Generation.
- HR: two tabs, no Sales panel.
- SuperAdmin and both team-lead roles look the same as they do today.
- A LeadGen user still sees only the lead gen dashboard, with no tab strip.

---

## DASH-05 · Take password tools off the home page

**Severity:** High  
**Phase:** 2

**Why:** “Reset all passwords” runs immediately and cannot be undone. “Copy Passwords” copies every shown email and password onto the clipboard from the home page.

**Files:**

- `src/features/admin/AdminDashboard.tsx` (the Password Management card)
- `src/app/dashboard/employee/employeeList/page.tsx` (new home for the actions)
- A confirm dialog next to that page, using the existing dialog component in `src/components/ui/dialog.tsx`

**Do this:**

1. Delete the Password Management card, the employee fetch that exists only to feed it, and `refreshAllPasswords` from `AdminDashboard`.
2. Put “Copy passwords” and “Reset all passwords” on the employee list page, visible only when `token.role` is `SuperAdmin` or `HR`, matching the current gate.
3. Reset opens a dialog. Title: `Reset every password?` Body: one sentence that every active employee in the current role filter gets a new password and the old ones stop working. Buttons: `Cancel` and `Reset passwords`. `Cancel` is the default. Escape closes the dialog and does not call `/api/resetAllPasswords`.
4. Copy stays an explicit button with the label `Copy passwords`. It does not run as part of reset.
5. Toasts from this flow use a specific title. Success: `Passwords reset`. Failure: `Couldn’t reset passwords`, with the existing retry sentence as the description. Do not use the title `Error`.

**Done when:**

- `/dashboard` has no password card, for every role.
- Reset on the employee list does nothing until `Reset passwords` is chosen.
- `Cancel` and Escape leave passwords unchanged.

---

## DASH-06 · One quiet section style, real chart headlines, no molecule

**Severity:** High  
**Phase:** 3

**Why:** Every block spends the same boldness: a 24px heading, an emoji, and its own pastel gradient. The flap board stops being the signature. Chart headlines like `123+4` do not say what the numbers are. The molecule view is a 600px graphic with no text equivalent.

**Files:**

- `src/features/admin/AdminDashboard.tsx`
- `src/features/leadgen/LeadGenDashboard.tsx`
- `src/features/sales/SalesDashboard.tsx`
- `src/features/advert/AdvertDashboard.tsx`
- New shared wrapper: `src/components/dashboard/DashboardSection.tsx`

**Do this:**

1. Add `DashboardSection` with this API:

   ```tsx
   type DashboardSectionProps = {
     title: string;
     summary?: string;
     children: React.ReactNode;
   };
   ```

   The shell is `rounded-xl border bg-card p-6`. The title is `text-xl font-semibold text-foreground`. No emoji, no `bg-gradient-to-br`, no per-section hue (violet, cyan, amber, teal, sky, blue, emerald, orange).

2. Replace each section wrapper in the four dashboards with `DashboardSection`. Titles, without emoji:

   | Current | Title |
   | --- | --- |
   | Daily Lead Generation Activity | Daily lead activity |
   | HR & Team Overview | Team |
   | Revenue Analytics | Revenue |
   | Weekly Target Performance | Weekly targets |
   | Property Inventory by Location | Properties by country |
   | New Listings Created | New listings |
   | Lead Generation Performance Overview | Lead generation |
   | Website Leads Trend | Website leads |
   | Monthly Lead Statistics | Leads this month |
   | Visits Dashboard | Visits |
   | New Owners & Properties | New owners |
   | Property Boost Performance | Property boosts |
   | Advert Dashboard | Adverts |

3. Rewrite the two cryptic totals as sentences, using the numbers already computed:

   - Listings, in `AdminDashboard`: `{previousElevenDaysTotal} listings in the previous days, {todayTotal} today`.
   - New owners trend, in `SalesDashboard`: `{previousSum} earlier in this range, {todayOwners} today`. Place the sentence under the heading, not `absolute right-20 top-20` over the chart.

4. On every chart region, set `role="img"` and `aria-label` to the same sentence as the heading summary. If the chart library does not forward `aria-label`, wrap it in a `div` that has the label. A visually hidden `<p>` with the summary is enough when the heading already says it. Do not add a second visible paragraph that repeats the heading.

5. Remove the molecule block from `SalesDashboard` (`canAccess("moleculeVisualization")`, the `h-[600px]` column) and from `AdvertDashboard`. Leave `src/components/molecule_visual.tsx` and the config key in place so access flags do not need a migration. The page simply stops rendering it.

6. Owner onboarding and the WhatsApp merge card already use `Card`. Leave their structure. Strip only the emoji and the gradient header if they still have one. The merge card’s description can stay.

**Done when:**

- Searching the four dashboard files finds no `bg-gradient-to-br` and no emoji in headings.
- The flap board is the only place on `/dashboard` that uses a display treatment.
- Each chart region has an accessible name.
- The molecule view is not on Sales or Advert.

---

## DASH-07 · Keep search and notifications on a narrow window

**Severity:** High  
**Phase:** 2

**Why:** Under the `xs` breakpoint (500px), `layout.tsx` hides breadcrumbs, search, notifications, and reminders. The only control left is logout, pinned `absolute top-2 right-2`. The menu button is already `fixed top-2 left-2`.

**File:** `src/app/dashboard/layout.tsx`

**Do this:**

1. Delete the `xs:hidden` block that renders logout alone.
2. Make the existing header row wrap on small widths: `flex flex-wrap items-center justify-between gap-2`. It is visible at every width, not only `xs` and up.
3. On widths under 500px, keep `LeadSearch`, `SystemNotificationCenter`, `PersonalReminderNavBell`, and `LogoutButton`, with the same role gates they already have (`Notifications` and `WhatsAppNotifications` for SuperAdmin, Sales, and Sales-TeamLead; broadcast for SuperAdmin and HR).
4. Breadcrumbs can sit on their own line under the tools when the row wraps. They stay hidden only if they overflow a single line, not because the viewport is under 500px.
5. Take the header out of `absolute` positioning so it does not cover the first line of the page or collide with the menu button. The menu button can stay fixed. Give the header enough left padding on small screens (`pl-12 lg:pl-0`) so the menu button does not overlap logout.

**Done when:**

- At 390px width, search, the notification center, reminders, and logout are all visible and tappable.
- Nothing in the header sits on top of the flap board.
- Housing collaborator still sees none of the staff tools.

---

## DASH-08 · Drop the celebration toast

**Severity:** Medium  
**Phase:** 4

**Why:** A success toast fires on load whenever there is a birthday or anniversary. The dismissible `CelebrationNotification` already says the same thing.

**File:** `src/app/dashboard/(dashboard)/page.tsx`

**Do this:**

1. Remove the `toast.success(...)` branch inside the celebrations `useEffect`, and remove the `celebrationToastShownRef` guard if nothing else uses it.
2. Keep `CelebrationNotification`, `handleDismissNotification`, and the session key `celebrations_seen_${todayKey}`.
3. Keep the flap / `CelebrationView` swap from DASH-01.

**Done when:**

- Loading `/dashboard` on a day with celebrations shows the banner and does not show a toast.
- Dismissing the banner still lasts for that browser session.

---

## DASH-09 · Empty, loading, and error copy

**Severity:** Medium  
**Phase:** 4

**Why:** Several states stop at “No data available” or a spinner with no text. The visits empty state already says what to do next. Match that.

**Files:**

- `src/features/leadgen/LeadGenDashboard.tsx` (monthly stats empty state and the `Loader2` with no caption)
- `src/features/admin/AdminDashboard.tsx` (listings empty state `No data available`)
- `src/features/sales/SalesDashboard.tsx` (visits empty state is the pattern to keep)

**Do this:**

1. Lead statistics empty: `No leads for this month.` Second line: `Choose another month.`
2. Lead statistics loading: keep the spinner and add `Loading lead statistics`. Wire it with `aria-live="polite"`.
3. Listings empty: `No listings in this range.` Second line: `Choose a longer range.`
4. Leave the visits empty state as it is (`No data available` plus `Try selecting a different month` or the assigned-locations line).
5. Password error copy is handled in DASH-05. Do not reintroduce a toast titled `Error`.

**Done when:**

- Every empty chart on `/dashboard` names the next control.
- The lead-statistics spinner has a text label.

---

## DASH-10 · Reviews filters follow the theme

**Severity:** Low  
**Phase:** 4

**Why:** Reviews filters are hard-coded `bg-zinc-900 text-zinc-100` on a light page. Contrast is fine (16.12:1). They ignore the rest of the theme.

**File:** `src/features/leadgen/LeadGenDashboard.tsx` (the two `CustomSelect` triggers with `bg-zinc-900 border-zinc-700 text-zinc-100`)

**Do this:**

1. Remove those three color classes.
2. Use the same trigger classes as the other selects on the page after DASH-03: `text-sm`, height at least `h-9`, default border and background from the select component.

**Done when:**

- In light mode the reviews filters are light. In dark mode they follow `bg-background`.
- Labels are still at least 14px.

---

## How to test

Do this after the phase that contains the ticket, and once more at the end.

| Check | How |
| --- | --- |
| Reduce Motion | System Settings → Accessibility → Display → Reduce motion, then reload `/dashboard`. Quote is static. |
| Keyboard | Tab from the top of the page. Every button and link shows the focus ring. Enter activates it. |
| Type and contrast | At 1280px and 390px, control labels are 14px or larger. Long-Term tooltip text is green-800 on white. |
| Roles | Sign in as SuperAdmin, Admin, HR, Sales-TeamLead, LeadGen, Sales, and Advert. Each sees one panel. Admin has three tabs. HR has two. LeadGen has none. |
| Passwords | `/dashboard` has no password card. On the employee list, Cancel and Escape do not call the reset API. |
| Narrow header | 390px wide: search, notifications, reminders, and logout are on screen and not covering the quote. |
| Celebrations | With a celebration in the payload, the banner shows and no toast appears. |
| Empty states | A month with no leads shows the “choose another month” line. |
| Motion still allowed | With Reduce Motion off, the flap board settles once and does not cycle colors. |

## What not to redo

These already work. Leave them alone unless a ticket above touches the same lines.

- Sidebar collapse labels and the mobile “Open menu” button.
- Section skeletons that already say what is loading (`Loading revenue chart...`).
- Sticky tab buttons and hover prefetch on `SuperAdminTabDashboard` and `TwoTabDashboard`.
- Celebration dismiss stored in `sessionStorage` for the day.
- Focus rings on the shared `Button`.
