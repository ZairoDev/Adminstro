# Manage Candidates — UX Audit

**Date:** 2026-08-10  
**Scope:** Register Candidate (`/dashboard/candidatePortal`), Onboarded Candidates (`/dashboard/onboardedCandidates`), candidate detail (`/dashboard/candidatePortal/[id]`), and dialogs used for select / shortlist / reject / create-employee / onboarding verification.  
**Audience:** Recruiters / HR admins  
**Primary goals:** Fast candidate handling with minimal errors; clear onboarding status tracking  

---

## Executive summary

Both list pages share a workable table + tab + filter shell and reuse several dialogs, but the module has **critical permission bugs on the detail page**, **divergent Create Employee / Reject policies between list and detail**, and repeated **placeholder-only filters, toast-only / `alert()` validation, and weak fetch error states**. Onboarding status tracking on the Onboarded page is directionally right (three document-progress tabs) but under-communicated in the table itself.

**Highest-impact fixes (do first):**

1. Call permission functions with `()` on detail CTAs (or return booleans) — gates are currently broken.  
2. Unify Create Employee eligibility and entry point across Register list, Onboarded list, and detail.  
3. Surface fetch errors with toast/retry instead of silent failure / “not found”.  
4. Replace custom `alert()` modals with shadcn `Dialog` + inline field errors.

---

## File map

| Area | Path |
|------|------|
| Register Candidate (sidebar) | `src/app/dashboard/candidatePortal/page.tsx` (~2.1k lines) |
| Onboarded Candidates | `src/app/dashboard/onboardedCandidates/page.tsx` |
| Candidate detail | `src/app/dashboard/candidatePortal/[id]/page.tsx` |
| Permissions | `src/app/dashboard/candidatePortal/[id]/hooks/useCandidatePermissions.ts` |
| Candidate fetch | `src/app/dashboard/candidatePortal/[id]/hooks/useCandidate.ts` |
| Notes | `src/app/dashboard/candidatePortal/components/notes-modal.tsx` |
| Select / Shortlist / Reject | `…/select-candidate-dialog.tsx`, `shortlist-candidate-dialog.tsx`, `reject-candidate-dialog.tsx` |
| Create Employee | `…/createEmployee.tsx` → embeds `…/new-user.tsx` |
| Schema | `src/schemas/employee.schema.ts` |
| Onboarding view / docs | `…/onboarding-details-view.tsx`, `…/document-verification.tsx` |
| Candidate self-serve onboarding | `…/[id]/onboarding/page.tsx` |
| List API | `src/app/api/candidates/route.ts` |
| External register API (no in-app form) | `src/app/api/hrportal/createCandidate/route.ts` |
| Nav labels | `src/components/sidebar.tsx` (`Register Candidate`, `Onboarded Candidates`) |

**Naming note:** Sidebar “Register Candidate” opens a **pipeline management list**, not an in-app registration form. Candidates are created via `/api/hrportal/createCandidate`. Page H1 is “Candidates” / “Manage and review job applications” — confusing vs nav label.

---

## Cross-cutting findings

### 1. Permission checks used as booleans (functions never invoked) — Critical

- **Where:** `useCandidatePermissions.ts:22-64` returns functions; detail page uses them without `()`:  
  - `page.tsx:1307-1320` (`canScheduleInterview`)  
  - `page.tsx:1404` (`canShortlist`)  
  - `page.tsx:1440` (`canReject`)  
  - `page.tsx:1462` (`canStartOnboarding`)  
  - `page.tsx:1562` (`canDiscontinueTraining`)  
  - Correct usages: `canSelect()` (`1422`), `canCreateEmployee()` (`1581`)
- **Why it hurts:** A function object is always truthy, so `!canReject` is always `false` → buttons stay enabled for invalid statuses. Tooltips promise gates the UI does not enforce → invalid transitions, support noise, SOP drift.
- **Fix:** Invoke every checker (`!canReject()`) **or** change the hook to return computed booleans once per render.
- **Priority:** Quick win

### 2. Create Employee / Reject policy inconsistency — High

| Surface | Create Employee | Reject |
|---------|-----------------|--------|
| Register list | Menu when `status === "selected"` → navigate `/employees/create?candidateId=` (`candidatePortal/page.tsx:947-949`, `1572-1579`) | Not in row menu |
| Onboarded list | Only on **Documents Verified** tab → `CreateEmployeeDialog` (`onboardedCandidates/page.tsx:440-448`, `652-666`) | Only on verified tab (`450-457`) |
| Detail | Requires `onboarding` + `onboardingComplete` (`useCandidatePermissions.ts:53-55`) → dialog | Dedicated reject / discontinue dialogs |

- **Why it hurts:** Same goal (“hire this person”) has three rules. Hiring from Register **before** onboarding can skip verified docs; detail users see a disabled Create Employee with mismatched tooltip copy (“after selection” vs onboarded-complete).
- **Fix:** One shared policy (recommend: HR-verified + onboarding complete) and one entry point (dialog **or** route). Share a `canCreateEmployeeFromCandidate(c)` helper used by all three UIs.
- **Priority:** Bigger redesign (policy + UI), with a quick interim: hide list Create Employee until same gate as detail

### 3. Silent / conflated error states on lists and detail — High

- Register list `fetchCandidates`: failures only `console.error` — no toast (`candidatePortal/page.tsx:594-598`). UI keeps prior rows or empty with no explanation.
- Onboarded list: same pattern (`onboardedCandidates/page.tsx:160-162`).
- Detail: `useCandidate` sets `error`, but UI after load does `if (!candidate)` → always “Candidate not found” (`page.tsx:752-758`); error banner only if candidate loaded (`982-987`).
- **Why it hurts:** Recruiters can’t tell outage vs empty filter vs bad ID; may duplicate work or abandon cases.
- **Fix:** Toast + inline error with Retry; branch loading → error → not-found → content.
- **Priority:** Quick win

### 4. Custom modals + `alert()` validation — Medium

- Select / Shortlist / Reject: hand-rolled overlays (`fixed inset-0`), not shadcn `Dialog`; validation via `alert()` (`select-candidate-dialog.tsx:84-102`, `shortlist-candidate-dialog.tsx`, `reject-candidate-dialog.tsx:44-49`).
- No reliable focus trap / Esc / labelled close; reject close `X` lacks `aria-label` (`reject-candidate-dialog.tsx:64-69`).
- Contrast: `EmploymentTypeRequiredDialog` does Dialog + disabled primary correctly.
- **Why it hurts:** Breaks keyboard/a11y norms elsewhere in the app; browser alerts feel broken for high-stakes hiring actions.
- **Fix:** Migrate to `Dialog`; inline errors + `aria-invalid`; shared `CandidateActionDialog` shell.
- **Priority:** Quick win → shared pattern

### 5. Search copy vs API behavior — Medium

- Placeholders: “Search by name, email, or **role**…” (both lists).  
- API search: `name` / `email` / `phone` only — **not** `position` (`api/candidates/route.ts:46-53`).
- **Why it hurts:** Searching “Sales” returns nothing even when many Sales candidates exist; users assume broken search.
- **Fix:** Add `position` (and optionally college) to `$or`, **or** change placeholder to “name, email, or phone”.
- **Priority:** Quick win

### 6. Visual / a11y patterns shared by both lists — Medium–Low

- Email column: **Mail icon only**; address in tooltip (`candidatePortal/page.tsx:1297-1315`, onboarded `365-383`). Hard for sighted scan and screen readers (“button” with no accessible name beyond icon).
- Phone: Register supports click-to-reveal; Onboarded is **always** masked (`****` + last4) with no reveal (`onboardedCandidates/page.tsx:385-387`) — inconsistent privacy UX.
- Search inputs: **placeholder-only**, no `<Label>` / `aria-label` (UX guideline: form labels severity High).
- Pagination prev/next: icon-only `Button`s without `aria-label` (Register `1785-1841`, Onboarded `578-634`). Actions menu uses `sr-only` correctly — good pattern to copy.
- Status badges use Tailwind pairs like `bg-yellow-100 text-yellow-800` — generally ≥4.5:1 on light theme. Theme token `--muted-foreground` is often ~hsl lightness 45–65% (`globals.css`) — OK on white, weaker on muted chips; prefer semantic token text on badge backgrounds.
- Tables wrap `overflow-x-auto` — good for mobile.

---

## Page 1 — Register Candidate (`candidatePortal/page.tsx`)

### What’s working well

- Status tabs (Pending → Interview → Shortlisted → Selected → Rejected) match recruiter mental model.
- Interview tab: date grouping (Today / Tomorrow / Later / Past) with timezone-aware helpers.
- Phone click-to-reveal; notes indicator; important-star; new-candidate highlight (7-day + localStorage viewed).
- Schedule Interview dialog: past dates disabled; loading disables Cancel/Submit.
- Reschedule-requests workflow for HR/SuperAdmin with approve/reject loading.
- Filter persistence via localStorage for search/tab/role/experience/college.
- Actions menu includes `sr-only` “Open menu”.

### Issues

#### R1 — Monolith page (~2.1k LOC) with nested `CandidateTable` recreated each render  
- **Lines:** whole file; table starts ~`1170`  
- **Hurt:** Hard to keep states/UX consistent with Onboarded; regressions likely.  
- **Fix:** Extract `CandidateTable`, dialogs, and fetch hooks.  
- **Priority:** Bigger redesign (maintainability → UX consistency)

#### R2 — Fetch failure silent  
- **Lines:** `594-598`  
- **Hurt:** Empty or stale list with no recovery.  
- **Fix:** Toast + error row + Retry.  
- **Priority:** Quick win

#### R3 — Client-only “Training Document” filter skews pagination  
- **Lines:** `1176-1187` filter; pagination uses API `pagination.total` `1771-1783`  
- **Hurt:** “Showing 1–10 of 50” while filtered visible rows are 2; pages feel empty/broken.  
- **Fix:** Server-side filter param, or filter before count and adjust pagination client-side.  
- **Priority:** Quick win (server param) / medium

#### R4 — Typo in filter options  
- **Lines:** `1742-1743` — “documetation”  
- **Hurt:** Looks unfinished; searchable typo in support tickets.  
- **Fix:** “documentation”.  
- **Priority:** Quick win

#### R5 — Schedule Interview from Pending allows “Second Round”  
- **Lines:** `978-990`, `1920-1947`  
- **Hurt:** Cognitive load / invalid SOP — second round for never-interviewed pending candidates.  
- **Fix:** Hide second-round option unless first round already scheduled (align with `canScheduleSecondRound`).  
- **Priority:** Quick win

#### R6 — Misleading schedule validation toast  
- **Lines:** `993-996` (“select both date and time”) while time always defaults to 4:00 PM  
- **Hurt:** Users hunt for missing time that isn’t missing.  
- **Fix:** “Please select an interview date”; disable Submit until date set.  
- **Priority:** Quick win

#### R7 — Email icon-only, no accessible name  
- **Lines:** `1301-1309`  
- **Hurt:** Can’t scan emails; SR announces unlabeled button.  
- **Fix:** Show truncated email + copy; `aria-label={`Copy ${email}`}`.  
- **Priority:** Quick win

#### R8 — Star important toggle missing accessible name  
- **Lines:** `1278-1290` (title only)  
- **Hurt:** Screen readers / keyboard clarity.  
- **Fix:** `aria-label` + `aria-pressed`.  
- **Priority:** Quick win

#### R9 — Role filter source ≠ Onboarded  
- **Register:** `/api/addons/roles/getAllRoles` (`316-328`)  
- **Onboarded:** `/api/candidates/positions` (`114-118`)  
- **Hurt:** Same “Role” filter shows different option sets → “why is this candidate missing?”  
- **Fix:** One roles endpoint for both pages.  
- **Priority:** Quick win

#### R10 — Nav vs page title mismatch  
- **Sidebar:** “Register Candidate”; **H1:** “Candidates” (`1599-1604`)  
- **Hurt:** Landmark confusion; new HR hires look for a registration form that isn’t here.  
- **Fix:** Align labels (e.g. “Candidate Pipeline”) or add explicit “Applications” subtitle + link to where registration happens.  
- **Priority:** Quick win (copy) / bigger if adding in-app register

---

## Page 2 — Onboarded Candidates (`onboardedCandidates/page.tsx`)

### What’s working well

- Three tabs encode onboarding progress: Pending → Documents Uploaded (Not Verified) → Documents Verified (`508-520`).
- Create Employee + Reject gated to **verified** tab — safer than Register list.
- Reuses `NotesModal`, `CreateEmployeeDialog`, `RejectCandidateDialog`.
- Empty state copy: “No onboarded candidates found” (`351`).
- Loading spinner in-table.

### Issues

#### O1 — Tab label “Pending” inside Onboarded is ambiguous  
- **Lines:** `509-511`; API meaning `route.ts:144-146` (incomplete onboarding **or** no documents)  
- **Hurt:** “Pending” collides with pipeline Pending on Register page; wrong mental model.  
- **Fix:** Rename to “Awaiting documents” / “Incomplete onboarding”.  
- **Priority:** Quick win

#### O2 — Table doesn’t show document / HR verification progress  
- **Lines:** columns `310-333`; status badge is candidate `status`, not onboarding substate  
- **Hurt:** Primary goal (“clear onboarding status tracking”) fails — user must open detail to see what’s blocking verification.  
- **Fix:** Columns or chips: docs uploaded count, verified count, HR verified Y/N.  
- **Priority:** Bigger redesign (information architecture); quick interim: one “Onboarding” progress badge per row

#### O3 — Phone permanently masked, no reveal/copy  
- **Lines:** `385-387`  
- **Hurt:** HR can’t call from this page; inconsistent with Register.  
- **Fix:** Same reveal/copy/WhatsApp pattern as Register (or Website Leads).  
- **Priority:** Quick win

#### O4 — Notes modal missing `onUpdate`  
- **Lines:** `643-649` vs Register `1901-1904`  
- **Hurt:** After adding notes, list indicators (if added later) won’t refresh; inconsistency.  
- **Fix:** Pass `onUpdate` → refetch.  
- **Priority:** Quick win

#### O5 — Double-fetch when leaving non-page-1 with filter change  
- **Lines:** filters effect `167-174` + page effect `176-178`  
- **Hurt:** Extra load flicker; race can briefly show wrong page data.  
- **Fix:** Single effect with AbortController; only fetch once when filters reset page.  
- **Priority:** Quick win

#### O6 — Reject dialog loading English broken  
- **Lines:** dialog `reject-candidate-dialog.tsx:124` `` `${submitButtonText}ing...` `` → “Rejecting...” OK, “Discontinueing...” wrong when reused  
- **Hurt:** Unprofessional on destructive path.  
- **Fix:** Explicit `loadingText` prop.  
- **Priority:** Quick win

#### O7 — Reject reason uses `alert()`; reason not reset on cancel  
- **Lines:** `reject-candidate-dialog.tsx:44-52`, `64-69`  
- **Hurt:** Next open can show previous candidate’s reason — privacy / error risk.  
- **Fix:** Reset on `open` change; inline validation.  
- **Priority:** Quick win

#### O8 — Subtitle oversells completeness  
- **Lines:** `480-482` — “candidates who have **completed** onboarding” while tabs include incomplete  
- **Hurt:** Mismatch with pending/uploaded tabs.  
- **Fix:** “Candidates in or past onboarding — filter by document progress.”  
- **Priority:** Quick win

#### O9 — No persisted filters / URL page (unlike Register)  
- **Hurt:** Refresh loses tab/filters; can’t share deep link to “verified page 3”.  
- **Fix:** Mirror Register URL `page` + optional query for tab.  
- **Priority:** Quick win

---

## Detail & onboarding surfaces

### What’s working well

- Contact block shows full email/phone with mailto/tel (`[id]/page.tsx:998+`).
- Action tooltips for blocked CTAs (once permissions work).
- `OnboardingDetailsView`: empty state, blocks HR verify until docs verified, re-upload request with toasts.
- `DocumentVerification`: verify loading, preview dialog, verified-by tooltip.
- `NewUser` + zod: many field-level errors exist; rich prefill from onboarding details.
- Candidate onboarding page: LoadingSkeleton; access-denied card; re-upload banners.

### Issues (priority ordered)

#### D1 — Permission function bug — Critical  
See cross-cutting #1.

#### D2 — Error vs not-found collapsed — High  
`useCandidate.ts:9-26`; `page.tsx:752-758`.

#### D3 — Create Employee dialog embeds full-page form — High  
`createEmployee.tsx:33-51`; `new-user.tsx` uses `min-h-screen` / page `Heading`. Nested 90vh scroll + page chrome.  
**Fix:** `variant="dialog"` compact layout, sticky submit footer, correct `onOpenChange={(open) => !open && onClose()}`.  
**Priority:** Bigger redesign

#### D4 — Label / schema mismatches on create-employee — Medium  
`employee.schema.ts`: DOB optional (`17-19`) but UI may mark required; country/address required without consistent `*`; confirm password via ref + toast only (`new-user.tsx`); debug `console.log` of form values (`161-162`).  
**Hurt:** Mysterious submit failures; possible resume URL applied as profile pic.  
**Priority:** Quick wins

#### D5 — Shortlist role-mismatch warning always on when any role selected — Medium  
`shortlist-candidate-dialog.tsx` — alarm fatigue; Select’s similar warning commented out.  
**Priority:** Quick win

#### D6 — Detail `onCreated` doesn’t refresh candidate — Medium  
`page.tsx` CreateEmployee `onCreated` closes only → stale Create Employee CTA.  
**Fix:** `refreshCandidate()` + toast.  
**Priority:** Quick win

#### D7 — Document verify: no unverify; eye affordance hover-only; tiny “Not uploaded” text — Medium (a11y)  
`document-verification.tsx`.  
**Priority:** Quick win / partial redesign

#### D8 — Candidate onboarding gate copy vs status — Medium  
Access message says “selected” but gate is `status !== "onboarding"`; validation toast can read stale `error` closure.  
**Priority:** Quick win

---

## Accessibility snapshot

| Check | Register list | Onboarded list | Detail / dialogs |
|-------|---------------|----------------|------------------|
| Visible field labels on search | Fail (placeholder only) | Fail | Mixed |
| Icon-only buttons named | Partial (menu OK; star/email/pagination weak) | Partial | Partial |
| Focus trap / Esc on action modals | N/A (shadcn dialogs mostly) | Reject/Create mix | Select/Shortlist/Reject fail |
| Color not sole meaning | Status badges + text | Status badges | Verify icons — improve |
| Contrast (`muted-foreground` ~44–65% L) | Generally OK on `background` | Same | `text-[10px]` empty states weak |
| Keyboard | Table actions OK-ish | Same | Broken on custom overlays |

CSS reference (default light theme): `--muted-foreground: 25 5.3% 44.7%` (`src/app/globals.css` ~180) — ~4.5:1 on white for body sizes; avoid pairing with `bg-muted` for small text.

---

## Code-level UX debt (duplication / drift)

1. Near-duplicate list pages (fetch, table, pagination, filters) instead of shared `CandidatesListShell`.  
2. Duplicate `Candidate` interfaces and `getStatusColor` / `formatDate` helpers.  
3. Different role APIs (addons vs positions).  
4. Different Create Employee surfaces (route vs dialog) and gates.  
5. Reject only from Onboarded verified + detail — not Register.  
6. Toast libs mixed across module (`sonner` vs `@/hooks/use-toast` in `new-user.tsx`).  
7. Verbose `console.log` in production paths (reschedule fetch, form debug).  
8. Onboarded API filters all matching candidates **in memory** then slices (`route.ts:107-163`) — OK at small scale; UX latency grows → spinner feels endless with no progress.

---

## Recommended roadmap

### Quick wins (≤1–2 days)

- [ ] Fix permission invocations / return booleans on detail  
- [ ] Toast + retry on list and detail fetch errors  
- [ ] Align search placeholder with API (or extend API)  
- [ ] Fix “documetation” typo; rename Onboarded “Pending” tab  
- [ ] Phone reveal/copy on Onboarded; email text + `aria-label`s  
- [ ] Reject/Select/Shortlist: reset state; replace `alert()`; fix loading strings  
- [ ] Hide Second Round on pending-only schedule; fix date validation copy  
- [ ] Pass `onUpdate` to Notes on Onboarded; refresh after Create Employee on detail  
- [ ] Unify roles endpoint for filters  

### Bigger redesigns

- [ ] Shared candidate list shell + status/progress column model  
- [ ] Single Create Employee policy + dialog-optimized form  
- [ ] Migrate all hiring dialogs to shadcn Dialog + zod  
- [ ] Onboarding progress visible in Onboarded table (docs/HR chips)  
- [ ] Clarify IA: “Pipeline” vs “Onboarding” vs optional in-app Register  

---

## Appendix — Goal alignment

| Goal | Register Candidate | Onboarded Candidates | Detail |
|------|--------------------|----------------------|--------|
| Fast candidate entry / handling | Strong for pipeline actions; weak error recovery; no in-app register | Good verified→hire path | Rich but permission bug blocks trust |
| Minimal errors | Schedule/timezone care is strong; `alert()` and silent fetch undermine | Safer hire gate | Schema/label mismatches on employee create |
| Clear onboarding status | Training doc filter only on Selected (broken pagination) | Tabs good; **table weak** | OnboardingDetailsView strong |

---

*Generated from static code review of the Manage Candidates module. No runtime accessibility lab measurements were taken; contrast notes use declared CSS tokens and Tailwind class pairings.*
