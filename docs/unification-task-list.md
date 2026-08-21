# HR Portal Unification — Complete Task List

> **Goal:** One coherent candidate → employee lifecycle with no data drift, no broken buttons, no duplicate pages.  
> Each task below states **what to do**, **exactly which files change**, and **the risk level**.  
> Work through them in order; each phase must be complete before the next.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 🔴 Risk: High | Affects auth, data integrity, or production data |
| 🟡 Risk: Medium | Visible to HR users; can be tested in staging first |
| 🟢 Risk: Low | Isolated change, easy to revert |
| `→` | File that changes |
| `+` | New file to create |
| `✓` | Done |

---

## Phase 0 — Stabilize (fix bugs that break trust today)

These are zero-architecture-change fixes. Do these first.

---

### Task 0-A · Fix broken permission gates on Candidate Detail

**Why:** `useCandidatePermissions` returns functions, but the detail page uses them as booleans (without `()`). This means shortlist, reject, schedule-interview, start-onboarding, and discontinue-training buttons are **never actually disabled** — they fire for the wrong candidates.

**What to do:**

In `candidatePortal/[id]/page.tsx`, find every usage of a permission checker that is missing parentheses and add `()`:

| Current (broken) | Fix |
|-----------------|-----|
| `!canScheduleInterview` | `!canScheduleInterview()` |
| `!canShortlist` | `!canShortlist()` |
| `!canReject` | `!canReject()` |
| `!canStartOnboarding` | `!canStartOnboarding()` |
| `!canDiscontinueTraining` | `!canDiscontinueTraining()` |

Also fix the guard at line 1380: `if (!canScheduleInterview)` → `if (!canScheduleInterview())`.

**Files that change:**
- → `src/app/dashboard/candidatePortal/[id]/page.tsx`

**Risk:** 🟢 Low — only adds `()` to existing calls; no logic change.

---

### Task 0-B · Fix dead "Create Employee" route from Register list

**Why:** When HR clicks Create Employee from the Register Candidate list, it navigates to `/employees/create?candidateId=...` — a route that **does not exist**. This results in a 404.

**What to do:**

1. In `candidatePortal/page.tsx`, find `handleCreateEmployee` (line ~1104) which calls `router.push('/employees/create?candidateId=...')`.
2. Remove that function and its navigation.
3. Replace the "Create Employee" row menu item with a proper gate check and `CreateEmployeeDialog` (same dialog already used on the Onboarded page and detail page).
4. Import `CreateEmployeeDialog` and add state: `createEmployeeDialogOpen`, `createEmployeeCandidate`.
5. Gate visibility: only show the menu item when `candidate.status === "onboarding" && candidate.onboardingDetails?.onboardingComplete && candidate.onboardingDetails?.verifiedByHR?.verified && !candidate.employeeId`.
6. On `onCreated`: refresh the candidate list and show success toast.

**Files that change:**
- → `src/app/dashboard/candidatePortal/page.tsx`

**Files you will import from (no change needed):**
- `src/app/dashboard/candidatePortal/components/createEmployee.tsx`
- `src/app/dashboard/candidatePortal/components/new-user.tsx`

**Risk:** 🟢 Low — removes broken navigation, adds working dialog.

---

### Task 0-C · Fix wrong API URL in new-user.tsx

**Why:** When `CreateEmployeeDialog` is used with only a `candidateId` (not a pre-loaded candidate object), it falls back to fetching from `/api/candidate/${candidateId}` — but the real route is `/api/candidates/${candidateId}` (plural). This causes a 404 prefill failure.

**What to do:**

In `new-user.tsx`, find the fallback fetch (around line 193) and change:
```
/api/candidate/${candidateId}
```
to:
```
/api/candidates/${candidateId}
```

**Files that change:**
- → `src/app/dashboard/candidatePortal/components/new-user.tsx`

**Risk:** 🟢 Low — one character change, no logic.

---

### Task 0-D · Refresh candidate after Create Employee on detail page

**Why:** After Create Employee succeeds on the detail page, the dialog closes but the page still shows the "Create Employee" button (stale state — `employeeId` not yet reflected).

**What to do:**

In `candidatePortal/[id]/page.tsx`, find the `<CreateEmployeeDialog>` `onCreated` handler. Currently it only closes the dialog. Change it to also call `refreshCandidate()` so the page fetches fresh data and the button disappears.

```tsx
onCreated={() => {
  setCreateEmployeeDialogOpen(false);
  refreshCandidate(); // add this
  toast.success("Employee created successfully");
}}
```

**Files that change:**
- → `src/app/dashboard/candidatePortal/[id]/page.tsx`

**Risk:** 🟢 Low — adds one function call.

---

### Task 0-E · Add toast + retry to list fetch errors

**Why:** When `fetchCandidates` fails on Register Candidate list or Onboarded Candidates list, the UI is silently empty with no message. HR cannot tell if it is a filter issue or a server error.

**What to do:**

1. **Register list** (`candidatePortal/page.tsx`): In the `catch` block of `fetchCandidates`, add `toast.error("Failed to load candidates. Please try again.")` and log the error. Also add an inline "Retry" button if `candidates` is empty after an error (set an `fetchError` state boolean).

2. **Onboarded list** (`onboardedCandidates/page.tsx`): Same pattern in the `catch` block of `fetchCandidates`.

**Files that change:**
- → `src/app/dashboard/candidatePortal/page.tsx`
- → `src/app/dashboard/onboardedCandidates/page.tsx`

**Risk:** 🟢 Low — additive only.

---

### Task 0-F · Expand Onboarded "Mark as Exited" to support all exit reasons

**Why:** The Onboarded → Employed → "Mark as Exited" dialog currently hardcodes `exitReason: "resigned"`. But termination, suspension, and absconding are also valid exits. The employee separation dialog on Employee Details already supports all four reasons.

**What to do:**

In `onboardedCandidates/page.tsx`, update the exit dialog:

1. Add a `exitReason` state: `const [exitReason, setExitReason] = useState<"resigned" | "terminated" | "suspended" | "abscond">("resigned")`.
2. Add a `<Select>` (or `<RadioGroup>`) in the dialog for reason: Resigned, Terminated, Suspended, Abscond.
3. Pass `exitReason` to the POST body instead of hardcoded `"resigned"`.
4. Update the dialog title to "Mark as Exited" (remove "(Resigned)").
5. Update the API call payload to use the selected `exitReason`.

The API (`/api/candidates/[id]/exit/route.ts`) already supports all four reasons — no backend change needed.

**Files that change:**
- → `src/app/dashboard/onboardedCandidates/page.tsx`

**Risk:** 🟢 Low — UI addition; API already handles it.

---

### Task 0-G · Fix reactivate employee → sync candidate exit cleared

**Why:** When HR reactivates an employee (toggle A/I on Employee Details → mark active), the employee's `isActive` goes back to `true`, but the candidate record still has `exitedAt` set. The candidate stays in the **Exited** tab even though the employee is active again.

**What to do:**

1. **Backend:** In `api/employee/editEmployee/route.ts`, after a successful update where `body.isActive === true`, check if `body.inactiveReason === null` (i.e. a reactivation). If so, find the linked candidate via `Candidate.findOne({ employeeId: _id })` and clear its exit fields:
   ```js
   await Candidate.findOneAndUpdate(
     { employeeId: _id },
     { $set: { exitedAt: null, exitReason: null, exitNotes: null } }
   );
   ```

2. **Helper:** Add a `clearCandidateExit(employeeId: string)` function in `src/lib/candidate/markCandidateExited.ts`.

3. **No frontend change needed** — the candidate list will auto-refresh next time HR visits.

**Files that change:**
- → `src/app/api/employee/editEmployee/route.ts`
- → `src/lib/candidate/markCandidateExited.ts`

**Risk:** 🔴 High — modifies database records on reactivate. Test carefully: only clear exit if `isActive` is explicitly being set to `true` AND `inactiveReason` is explicitly being cleared to `null`. Add a guard to avoid clearing on unrelated edits.

---

## Phase 1 — Bidirectional link (data foundation)

Phases 2+ depend on this. Complete Phase 0 first.

---

### Task 1-A · Add `candidateId` to Employee model

**Why:** Currently `Employee` has no reference back to `Candidate`. Every reverse lookup requires scanning the Candidate collection. Adding the field enables direct links, cross-page navigation, and correct backfill.

**What to do:**

1. In `src/models/employee.ts`, add the field after `isActive`:
   ```typescript
   candidateId: {
     type: Schema.Types.ObjectId,
     ref: "Candidate",
     default: null,
     index: true,
   },
   ```

2. Export a new type (or add to the existing `IEmployee` interface):
   ```typescript
   candidateId?: Types.ObjectId | null;
   ```

**Files that change:**
- → `src/models/employee.ts`

**Risk:** 🟡 Medium — schema change. Field is optional and defaults to null, so existing documents are unaffected. No migration needed.

---

### Task 1-B · Set `employee.candidateId` on hire

**Why:** When `createnewEmployee` links the candidate via `candidateId` in the request body, it currently only updates `Candidate.employeeId`. It never writes back `Employee.candidateId`.

**What to do:**

In `src/app/api/user/createnewEmployee/route.ts`, after `const createUser = await Employees.create(...)`, add:

```typescript
if (candidateId) {
  // set reverse link on employee
  await Employees.findByIdAndUpdate(createUser._id, {
    $set: { candidateId: candidateId },
  });
  // existing candidate update:
  await Candidate.findByIdAndUpdate(candidateId, {
    $set: { employeeId: createUser._id, employedAt: new Date() },
  });
}
```

**Files that change:**
- → `src/app/api/user/createnewEmployee/route.ts`

**Risk:** 🟡 Medium — adds one extra DB write per hire; still safe on failure (employee was created).

---

### Task 1-C · Backfill `candidateId` on existing employee records

**Why:** All hires made before Task 1-B will have `Employee.candidateId = null` even though `Candidate.employeeId` is set. This backfill fixes historical data.

**What to do:**

Create a one-time script `src/scripts/backfillEmployeeCandidateId.ts`:

```typescript
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";
import Employees from "@/models/employee";

async function run() {
  await connectDb();
  // Find all candidates that have an employeeId but whose linked employee has no candidateId
  const linked = await Candidate.find({
    employeeId: { $ne: null },
  }).select("_id employeeId").lean();

  let updated = 0;
  for (const c of linked) {
    const result = await Employees.findByIdAndUpdate(
      c.employeeId,
      { $set: { candidateId: c._id } },
      { new: false },
    );
    if (result) updated++;
  }
  console.log(`Backfilled ${updated} employee records`);
}

run().catch(console.error);
```

Run once on production: `npx ts-node src/scripts/backfillEmployeeCandidateId.ts`

**Files that change:**
- + `src/scripts/backfillEmployeeCandidateId.ts` (new file, run once, not production code)

**Risk:** 🔴 High — modifies production DB. Run during low-traffic window. Idempotent (uses `$set`, safe to re-run). Take a MongoDB backup before running.

---

## Phase 2 — Shared lifecycle layer (frontend foundation)

Create the shared code that all future pages will use.

---

### Task 2-A · Create lifecycle helper library

**Why:** Currently each page has its own inline logic for "can this person be hired / exited / shortlisted". They diverge. One central module fixes this permanently.

**What to do:**

Create `src/lib/people/lifecycle.ts`:

```typescript
import type { Candidate } from "@/app/dashboard/candidatePortal/[id]/types";

export type LifecyclePhase = "applicant" | "onboarding" | "active" | "exited";

export interface MinimalCandidate {
  status: string;
  employeeId?: string | null;
  exitedAt?: string | Date | null;
  onboardingDetails?: {
    onboardingComplete?: boolean;
    verifiedByHR?: { verified?: boolean };
  };
}

export function getLifecyclePhase(c: MinimalCandidate): LifecyclePhase {
  if (c.exitedAt) return "exited";
  if (c.employeeId) return "active";
  if (c.status === "onboarding") return "onboarding";
  return "applicant";
}

export function canCreateEmployee(c: MinimalCandidate): boolean {
  return (
    c.status === "onboarding" &&
    c.onboardingDetails?.onboardingComplete === true &&
    c.onboardingDetails?.verifiedByHR?.verified === true &&
    !c.employeeId
  );
}

export function canSeparate(c: MinimalCandidate): boolean {
  return Boolean(c.employeeId && !c.exitedAt);
}

export function canScheduleInterview(c: MinimalCandidate & {
  interviewDetails?: { scheduledDate?: string | null };
}): boolean {
  return c.status === "pending" && !c.interviewDetails?.scheduledDate;
}

export function canShortlist(c: MinimalCandidate): boolean {
  return c.status === "pending";
}

export function canSelect(c: MinimalCandidate & {
  interviewDetails?: { remarks?: { evaluatedBy?: string } };
}): boolean {
  if (c.status === "interview") {
    return Boolean(c.interviewDetails?.remarks?.evaluatedBy);
  }
  return c.status === "pending" || c.status === "shortlisted";
}

export function canReject(c: MinimalCandidate & {
  interviewDetails?: { remarks?: { evaluatedBy?: string } };
}): boolean {
  if (c.status === "interview") {
    return Boolean(c.interviewDetails?.remarks?.evaluatedBy);
  }
  return c.status !== "rejected" && c.status !== "onboarding";
}

export function canStartOnboarding(c: MinimalCandidate): boolean {
  return c.status === "selected";
}

export function canDiscontinueTraining(c: MinimalCandidate): boolean {
  return c.status === "selected";
}
```

**Files that change:**
- + `src/lib/people/lifecycle.ts` (new)

**Risk:** 🟢 Low — new file, not yet imported anywhere.

---

### Task 2-B · Update `useCandidatePermissions` to use lifecycle helpers

**Why:** Once `lifecycle.ts` exists, the hook should delegate to it so all code paths share the same rule.

**What to do:**

Rewrite `useCandidatePermissions.ts` to import from `lifecycle.ts` and wrap the functions:

```typescript
import * as LC from "@/lib/people/lifecycle";

export function useCandidatePermissions(candidate: Candidate | null) {
  const c = candidate as LC.MinimalCandidate & { interviewDetails?: any; secondRoundInterviewDetails?: any };

  return {
    hasInterviewRemarks: () => !!candidate?.interviewDetails?.remarks?.evaluatedBy,
    hasAnyInterviewScheduled: () =>
      !!(candidate?.interviewDetails?.scheduledDate || candidate?.secondRoundInterviewDetails?.scheduledDate),
    hasEmploymentType: () =>
      candidate?.employmentType === "fulltime" || candidate?.employmentType === "intern",
    canShortlist: () => LC.canShortlist(c),
    canSelect: () => LC.canSelect(c),
    canReject: () => LC.canReject(c),
    canDiscontinueTraining: () => LC.canDiscontinueTraining(c),
    canStartOnboarding: () => LC.canStartOnboarding(c),
    canCreateEmployee: () => LC.canCreateEmployee(c),
    canScheduleInterview: () => LC.canScheduleInterview(c),
    canScheduleSecondRound: () =>
      !candidate?.secondRoundInterviewDetails?.scheduledDate,
    canSeparate: () => LC.canSeparate(c),
  };
}
```

This adds `canSeparate` without breaking anything existing.

**Files that change:**
- → `src/app/dashboard/candidatePortal/[id]/hooks/useCandidatePermissions.ts`

**Risk:** 🟢 Low — only changes where logic lives, not what it does.

---

### Task 2-C · Add `candidateId` link on Employee Details page

**Why:** When HR is on Employee Details, there is no way to jump to the person's hiring record (interviews, onboarding docs, offer letter). The back-link is missing.

**What to do:**

1. In `employeedetails/[...id]/page.tsx`, when the employee data is fetched, check if `employee.candidateId` is set.
2. If it is, show a button/link near the top of the page:
   ```tsx
   {employee.candidateId && (
     <Link href={`/dashboard/candidatePortal/${employee.candidateId}`}>
       <Button variant="outline" size="sm">
         <FileText className="h-4 w-4 mr-2" />
         View Hiring Record
       </Button>
     </Link>
   )}
   ```
3. This uses the existing candidate detail page — no new page needed.

**Files that change:**
- → `src/app/dashboard/employeedetails/[...id]/page.tsx`

**Risk:** 🟢 Low — read-only link addition.

---

### Task 2-D · Add employee ops link on Candidate Detail page

**Why:** After hire, when HR is on the Candidate Detail page, there is no link to the employee's PIP, warnings, or operational profile.

**What to do:**

In `candidatePortal/[id]/page.tsx`, when `candidate.employeeId` is set, show a link in the action sidebar or top area:

```tsx
{candidate.employeeId && (
  <Link href={`/dashboard/employeedetails/${candidate.employeeId}`}>
    <Button variant="outline" size="sm">
      <Briefcase className="h-4 w-4 mr-2" />
      View Employee Profile
    </Button>
  </Link>
)}
```

**Files that change:**
- → `src/app/dashboard/candidatePortal/[id]/page.tsx`

**Risk:** 🟢 Low — read-only link addition.

---

## Phase 3 — Shared components (reduce duplication)

---

### Task 3-A · Unify the two Create Employee forms into one component

**Why:** `createnewEmployee/page.tsx` (967 lines) and `candidatePortal/components/new-user.tsx` (1,102 lines) are ~70% duplicate. They call the same API. Only `new-user.tsx` supports candidate prefill.

**What to do:**

1. Keep `new-user.tsx` as the single implementation — it is more complete.
2. Update `new-user.tsx` to work without a candidate (standalone mode) by making `candidate` and `candidateId` optional, and skipping prefill when both are absent.
3. Add a `mode?: "candidate" | "standalone"` prop. In standalone mode, show a "Link existing candidate" optional search field.
4. Replace `createnewEmployee/page.tsx` content with a simple wrapper that renders `<CreateEmployeeForm mode="standalone" />`.
5. The sidebar "Create Employee" link (`/dashboard/createnewEmployee`) keeps working — no route change needed.

**Files that change:**
- → `src/app/dashboard/candidatePortal/components/new-user.tsx` (add standalone mode)
- → `src/app/dashboard/createnewEmployee/page.tsx` (replace body with wrapper)

**Risk:** 🟡 Medium — changing a form used in production. Test both paths: standalone hire and candidate-linked hire.

---

### Task 3-B · Create a shared `SeparatePersonDialog` component

**Why:** Two separate exit UIs exist:
- Onboarded → Mark as Exited (resigned only, small dialog)
- Employee Details → Deactivate (all reasons, full dialog with email)

They should be the same dialog.

**What to do:**

1. Create `src/features/people/components/SeparatePersonDialog.tsx` — a self-contained dialog that:
   - Accepts: `candidateId`, `employeeId`, `employeeName`, `open`, `onClose`, `onSuccess`
   - Shows reason picker (resigned, terminated, suspended, abscond)
   - Shows effective date and notes
   - Shows "send email" checkbox
   - On confirm: calls `POST /api/candidates/[candidateId]/exit` if `candidateId` provided; otherwise `POST /api/employee/separation`
   - Handles email sending

2. Replace the inline exit dialog in `onboardedCandidates/page.tsx` with `<SeparatePersonDialog>`.

3. The employee details separation dialog can optionally also use this in a future cleanup (out of scope for this task to keep risk low).

**Files that change:**
- + `src/features/people/components/SeparatePersonDialog.tsx` (new)
- → `src/app/dashboard/onboardedCandidates/page.tsx` (use new dialog)

**Risk:** 🟡 Medium — replaces working dialog with new component. Test all exit reasons and email flow.

---

### Task 3-C · Add exit reasons to Onboarded page (uses Task 3-B)

After Task 3-B, the `SeparatePersonDialog` already supports all reasons. This task is complete as a side effect of 3-B.

If 3-B is deferred, do this as a standalone fix: add a reason picker `<Select>` inside the existing exit dialog in `onboardedCandidates/page.tsx` (this was also Task 0-F — do that first as a stopgap).

---

### Task 3-D · Consolidate two employee list tables into one

**Why:** `src/app/employeeTable/employee-table.tsx` and `src/app/dashboard/employee/employeeList/employee-list-table.tsx` are duplicate table implementations for the same API.

**What to do:**

1. Identify the unique features of each:
   - `employee-table.tsx`: lock toggle, password regen, PIP badge, active only
   - `employee-list-table.tsx`: shows inactive, no lock/password, HR filter

2. Create `src/features/people/components/EmployeeTable.tsx` with props:
   - `showInactive?: boolean`
   - `showLockControls?: boolean`
   - `showPasswordRegen?: boolean`

3. Replace both existing tables with this one.

4. Keep existing page files (`employee/page.tsx`, `employee/employeeList/page.tsx`) as-is; just swap the table component inside.

**Files that change:**
- + `src/features/people/components/EmployeeTable.tsx` (new)
- → `src/app/employeeTable/employee-table.tsx` (thin wrapper or replace)
- → `src/app/dashboard/employee/employeeList/employee-list-table.tsx` (thin wrapper or replace)

**Risk:** 🟡 Medium — table replacement; test lock toggle, PIP badge, and inactive display.

---

## Phase 4 — Unified People list page

This is the biggest single UI change.

---

### Task 4-A · Create the `PeopleListShell` component

**Why:** Register Candidate list and Onboarded Candidates list share the same basic structure: search, filters, pagination, and a table. They should use one shared shell.

**What to do:**

Create `src/features/people/components/PeopleListShell.tsx`:
- Accepts a `tab` prop that maps to different API params
- Fetches from a unified endpoint (see Task 5-A) or passes `onboarded=true/false` to existing API
- Renders the same table layout for all lifecycle phases
- Columns change based on phase (e.g. "Employed" column for active, "Exited" for exited, "Applied" for pipeline)

Initially, **do not replace** Register and Onboarded pages — just extract the shell so Phase 5 can use it.

**Files that change:**
- + `src/features/people/components/PeopleListShell.tsx` (new)

**Risk:** 🟢 Low — new file, not yet replacing anything.

---

### Task 4-B · Build `/dashboard/people` unified list page

**Why:** HR needs one place to see everyone: pipeline candidates, those onboarding, active employees, and exited.

**What to do:**

1. Create `src/app/dashboard/people/page.tsx`.
2. Use `PeopleListShell` with tabs:
   - **Pipeline** — `GET /api/candidates?phase=applicant` (pending, interview, shortlisted, selected)
   - **Onboarding** — `GET /api/candidates?phase=onboarding` (onboarding status, all onboarding sub-tabs)
   - **Active** — `GET /api/candidates?phase=active` (employed + employee.isActive)
   - **Exited** — `GET /api/candidates?phase=exited`
3. Each row links to `/dashboard/people/[candidateId]` (Task 4-C).
4. Action buttons on rows are context-aware based on phase.

**Files that change:**
- + `src/app/dashboard/people/page.tsx` (new)
- + `src/app/dashboard/people/layout.tsx` (optional, if needed for shared header)

**Risk:** 🟡 Medium — new page. Old pages (`candidatePortal`, `onboardedCandidates`) still exist during transition.

---

### Task 4-C · Build `/dashboard/people/[candidateId]` unified detail page

**Why:** The same person's data is spread across:
- Candidate detail: interviews, documents, onboarding
- Employee details: PIP, warnings, separation, profile

HR needs one URL to see everything.

**What to do:**

1. Create `src/app/dashboard/people/[candidateId]/page.tsx`.
2. Fetch data using a composing pattern:
   - Load candidate: `GET /api/candidates/[candidateId]`
   - If `candidate.employeeId` exists, load employee: `GET /api/employee/getEmployeeDetails`
3. Render lifecycle-aware tabs:

| Tab | Show condition | Components to reuse |
|-----|---------------|---------------------|
| **Overview** | always | CandidateHeader, LifecycleBadge, quick action buttons |
| **Pipeline** | phase `applicant` or `onboarding` | Action sidebar from existing detail page |
| **Documents** | `onboarding` or later | `OnboardingDetailsView`, training/offer sections |
| **Employment** | `employeeId` set | Profile summary card, link to edit |
| **Performance** | `employeeId` set | PIP list, warnings, appreciations (from employee details) |
| **History** | always | Notes modal, status timeline, exit info |

4. Move `usePersonPermissions` logic to use `lifecycle.ts` helpers.
5. Action bar is contextual (see lifecycle map in audit).

**Files that change:**
- + `src/app/dashboard/people/[candidateId]/page.tsx` (new)
- (Reuses existing components from candidatePortal — no changes to those)

**Risk:** 🔴 High — complex page, touches many existing components. Build as a new page first; do not remove old pages until this is stable.

---

## Phase 5 — Backend unification

---

### Task 5-A · Add `phase` filter to candidates list API

**Why:** `GET /api/candidates` currently filters by `onboarded`, `onboardingStatus`, `status`. There is no `phase` concept. The People list page needs it.

**What to do:**

In `src/app/api/candidates/route.ts`, add handling for `?phase=` query param:

```typescript
// Map phase to existing filter logic:
// phase=applicant  → onboarded=false, status in [pending,interview,shortlisted,selected]
// phase=onboarding → onboarded=true, onboardingStatus not employed/exited
// phase=active     → employed (has employeeId, no exitedAt)
// phase=exited     → has exitedAt
```

This allows `GET /api/candidates?phase=active` to work.

**Files that change:**
- → `src/app/api/candidates/route.ts`

**Risk:** 🟡 Medium — API change; existing callers using `onboarded` and `status` params are unaffected if you add phase as a new param only.

---

### Task 5-B · Create unified person profile API

**Why:** The People detail page (Task 4-C) needs to load candidate + employee in one call.

**What to do:**

Create `src/app/api/people/[candidateId]/route.ts`:

```typescript
// GET /api/people/[candidateId]
// Returns: { candidate, employee (if exists), lifecyclePhase }
// Auth: HR/SuperAdmin only
```

Implementation:
1. Load candidate by ID.
2. If `candidate.employeeId`, load employee.
3. Derive phase using `getLifecyclePhase(candidate)`.
4. Return combined object.

**Files that change:**
- + `src/app/api/people/[candidateId]/route.ts` (new)

**Risk:** 🟢 Low — new API, does not change existing ones.

---

### Task 5-C · Move onboarded filter to MongoDB queries (not in-memory)

**Why:** `GET /api/candidates` currently fetches ALL candidates matching the base query and then filters onboarding status **in JavaScript memory**. This is fine at 100 records but will be very slow at 1,000+.

**What to do:**

In `src/app/api/candidates/route.ts`, replace the in-memory filter for `onboardingStatus` with proper MongoDB `$match` conditions built before the `.find()` call.

The logic for each tab maps to:

| Tab | MongoDB query |
|-----|--------------|
| `employed` | `{ employeeId: { $ne: null }, exitedAt: null, 'onboardingDetails.onboardingComplete': true }` |
| `exited` | `{ exitedAt: { $ne: null } }` |
| `pending` | `{ 'onboardingDetails.onboardingComplete': { $ne: true } }` + no documents check |
| `uploaded-not-verified` | complex — may still need partial in-memory for document count |
| `verified` | `{ 'onboardingDetails.verifiedByHR.verified': true, employeeId: null }` |

Start with `employed` and `exited` (simple) then tackle the others.

**Files that change:**
- → `src/app/api/candidates/route.ts`

**Risk:** 🟡 Medium — changes query results. Test each tab after; verify counts match current behavior.

---

### Task 5-D · Add email uniqueness check across candidate + employee at hire

**Why:** `createnewEmployee` checks `Employees.findOne({ email })` but not `Candidate`. If someone applies, gets rejected, and their email is reused for a different hire, no error is shown.

**What to do:**

In `src/app/api/user/createnewEmployee/route.ts`, add a Candidate email check before the `Employees.findOne` check:

```typescript
const existingCandidate = await Candidate.findOne({ email, employeeId: { $ne: null } }).select("_id");
if (existingCandidate) {
  return NextResponse.json(
    { success: false, message: "A candidate with this email is already employed" },
    { status: 400 }
  );
}
```

**Files that change:**
- → `src/app/api/user/createnewEmployee/route.ts`

**Risk:** 🟡 Medium — could block legitimate re-hires. Add a `force: true` override if needed.

---

## Phase 6 — Navigation unification

---

### Task 6-A · Rename "Register Candidate" in sidebar to "Candidates"

**Why:** "Register Candidate" implies it creates a candidate. It is actually a management list. The `/application-form` route is the actual registration.

**What to do:**

In `src/components/sidebar.tsx`, find all instances of `label: "Register Candidate"` and change to `label: "Candidates"`. Update tooltip/title text too if present.

**Files that change:**
- → `src/components/sidebar.tsx`

**Risk:** 🟢 Low — label change only, no routing change.

---

### Task 6-B · Add "People" hub to sidebar (when Phase 4 is done)

**Why:** Once `/dashboard/people` exists, add it to the sidebar for HR, HAdmin, SuperAdmin, replacing or supplementing existing entries.

**What to do:**

In `src/components/sidebar.tsx`, for HR/HAdmin/SuperAdmin role sections, add:

```typescript
{
  path: "/dashboard/people",
  label: "People",
  Icon: <Users size={18} />,
}
```

During transition period, keep old entries too and mark them (optional).

After all old pages redirect to People, remove old sidebar entries.

**Files that change:**
- → `src/components/sidebar.tsx`
- → `src/middleware.ts` (add `/dashboard/people` and `/dashboard/people/.*` to role access arrays)

**Risk:** 🟡 Medium — middleware change affects route access. Test that HR can actually navigate to the page.

---

### Task 6-C · Add redirects from old candidate/onboarded routes

**Why:** Bookmarks, emails, and links pointing to `/dashboard/candidatePortal/[id]` should still work after the People hub launches.

**What to do:**

1. In `src/app/dashboard/candidatePortal/[id]/page.tsx`, add at the top (using `next/navigation`):
   ```tsx
   // During transition, optionally redirect to unified page:
   // redirect(`/dashboard/people/${candidateId}`);
   ```
   (Comment out until People detail is stable)

2. Once People detail is stable, activate redirects.

**Files that change:**
- → `src/app/dashboard/candidatePortal/[id]/page.tsx` (add redirect)

**Risk:** 🟡 Medium — redirects break backward navigation if not tested. Only activate when People detail (Task 4-C) is fully stable.

---

## Phase 7 — Cleanup

Do these only after all previous phases are complete and verified.

---

### Task 7-A · Remove dead legacy table files

Files to delete after EmployeeTable (Task 3-D) is live:
- `src/app/employeeTable/data-table.tsx`
- `src/app/employeeTable/columns.tsx`

**Risk:** 🟢 Low if they are unused (verify with grep first).

---

### Task 7-B · Remove old `createnewEmployee/page.tsx` standalone form

After Task 3-A, `createnewEmployee/page.tsx` is a thin wrapper. It can stay as-is forever. Only delete if you consolidate routing.

---

### Task 7-C · Archive Register Candidate and Onboarded Candidates list pages

After `/dashboard/people` is fully stable and redirects are active:
- `src/app/dashboard/candidatePortal/page.tsx` → can be deleted (or kept as redirect)
- `src/app/dashboard/onboardedCandidates/page.tsx` → can be deleted (or kept as redirect)

**Risk:** 🔴 High — only do this after verifying no bookmarks, emails, or external links point to these routes. Confirm with stakeholders.

---

## Summary table

| Task | Phase | Files Changed | Risk | Estimated Effort |
|------|-------|--------------|------|-----------------|
| 0-A Fix permission gates | 0 | 1 file | 🟢 | 30 min |
| 0-B Fix dead create route | 0 | 1 file | 🟢 | 2 h |
| 0-C Fix API URL in new-user | 0 | 1 file | 🟢 | 5 min |
| 0-D Refresh after create employee | 0 | 1 file | 🟢 | 15 min |
| 0-E Toast on fetch errors | 0 | 2 files | 🟢 | 1 h |
| 0-F Expand exit reasons | 0 | 1 file | 🟢 | 2 h |
| 0-G Reactivate sync | 0 | 2 files | 🔴 | 2 h |
| 1-A Add candidateId to Employee model | 1 | 1 file | 🟡 | 30 min |
| 1-B Set candidateId on hire | 1 | 1 file | 🟡 | 30 min |
| 1-C Backfill script | 1 | 1 new file | 🔴 | 1 h |
| 2-A Lifecycle helpers | 2 | 1 new file | 🟢 | 2 h |
| 2-B Update permissions hook | 2 | 1 file | 🟢 | 1 h |
| 2-C Hiring record link on Employee Details | 2 | 1 file | 🟢 | 30 min |
| 2-D Employee ops link on Candidate Detail | 2 | 1 file | 🟢 | 30 min |
| 3-A Unify create forms | 3 | 2 files | 🟡 | 4 h |
| 3-B Shared SeparatePersonDialog | 3 | 1 new + 1 update | 🟡 | 4 h |
| 3-D Consolidate employee tables | 3 | 1 new + 2 update | 🟡 | 3 h |
| 4-A PeopleListShell | 4 | 1 new | 🟢 | 4 h |
| 4-B /dashboard/people list | 4 | 1 new | 🟡 | 1 day |
| 4-C /dashboard/people/[id] detail | 4 | 1 new | 🔴 | 3 days |
| 5-A Phase filter on candidates API | 5 | 1 file | 🟡 | 2 h |
| 5-B People profile API | 5 | 1 new | 🟢 | 2 h |
| 5-C Server-side onboarded filter | 5 | 1 file | 🟡 | 3 h |
| 5-D Email uniqueness check | 5 | 1 file | 🟡 | 30 min |
| 6-A Rename sidebar label | 6 | 1 file | 🟢 | 10 min |
| 6-B Add People to sidebar | 6 | 2 files | 🟡 | 1 h |
| 6-C Add old route redirects | 6 | 1 file | 🟡 | 30 min |
| 7-A–7-C Cleanup | 7 | 3–4 files | 🟢 | 2 h |

**Total estimated: ~10 developer-days for full completion**  
**Phase 0 alone: ~2 developer-days — immediate trust improvement with zero architecture risk**

---

## Success criteria (verify after all phases)

| Criterion | How to verify |
|-----------|---------------|
| Permission gates work | Open candidate detail in wrong status; verify buttons disabled |
| Create Employee works from one consistent gate | Try from pipeline list, onboarded, and detail; all use dialog, same rule |
| Exit from any surface moves to Exited tab | Exit from both Onboarded and Employee Details; verify Exited tab |
| Reactivate clears Exited | Toggle employee A/I back to active; verify candidate no longer in Exited |
| Cross-links work | From Employee Details → Hiring Record; from Candidate → Employee Profile |
| No data drift | Edit employee name; verify candidate name note (separate, documented) |
| People hub shows all phases | Navigate `/dashboard/people`; verify Pipeline, Onboarding, Active, Exited tabs |
| Old routes redirect correctly | Navigate `/dashboard/candidatePortal/[id]`; verify redirect |
| No console errors | Open all major pages; check browser console |

---

*Last updated: 2026-08-18. References: docs/candidate-employee-unification-audit.md, docs/candidates-ux-audit.md*
