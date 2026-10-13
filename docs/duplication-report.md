# Duplication and reuse audit

Read-only audit of the working tree on 2026-10-12. No application source was modified. `docs/adr/` and `AGENTS.md` are not in this repo. Seeds from `docs/architecture-review.md` (F-05, F-10) were re-measured; they were not copied forward as findings unless the tools still showed them.

## 1. Executive summary

Zero whole-file IDENTICAL groups. Six PARAMETERIZABLE groups, eight NEAR-MATCH groups, four SUPERSEDED cases, six DIVERGED pairs that should stay apart. jscpd reports 32,409 duplicated lines (11.43% of 283,498). That number double-counts overlapping clones and includes shadcn clones, so it is not a deletion budget. The merges below are estimated at about **7,000 lines** that can move into one function or component while the HTTP paths stay.

Highest-value merges, in order:

1. Long-term and short-term owner route bodies (about 1,350 lines). The sheet UI already takes `apiBasePath`.
2. The copied lead-list match builders (declined / rejected share 252 exact lines).
3. The nine lead-list pages (declined vs rejected alone is 331 exact lines). Filter and socket fixes landed on only some of them.
4. `good-table.tsx` and `LeadTable.tsx` (634 exact lines, both still committed on 2026-10-12).
5. Candidate PDF draw helpers (557 exact lines between HR policies and the training agreement).

Biggest risk: treating a similar name as the same behavior. `/api/sales/getRejectedLeads`, legacy `Invoice`, `Payment` vs `FinancePayment`, and the two `editPrices` routes are different contracts. The long-term nearby route also has a role allow-list the short-term route does not. Merging those without an explicit parameter changes who can search and what gets written.

## 2. Method and tools

| Tool | What it measured |
| --- | --- |
| jscpd 5.4.1 | Exact clones, min 5 lines, min 50 tokens. Second pass with `--ignore-identifiers --ignore-literals --kind renamed`. |
| TypeScript compiler API | JSX tag sequences, hook call sequences, route fingerprints `(method, imported models, mongoose ops, auth call, response keys)`. ts-morph is not installed; this is the AST stand-in. |
| Line-set Jaccard | Owner route pairs, raw and after collapsing `unregisteredOwner(s)(ShortTerm)` and the rental-type token. Lead pages against `goodtogoleads/lead-page.tsx`. |
| Regex + AST | `axios` / `fetch` URL literals outside `src/app/api`. `mongoose.model("…")` names. `z.object` keys. |
| git log | `--since=2025-10-12` (through 2026-10-12), authors, and subjects matching `fix\|bug\|hotfix\|patch`. |

Commands are in `docs/duplication-report-data/commands.txt`.

The renamed pass reports 76,544 lines (27.00%). It also pairs unrelated JSX (application form with a map, shadcn `context-menu` with `dropdown-menu`). Those pairs are not findings. Only renamed clones that share a feature were kept.

Inventory definitions: a component is a function in a `.tsx` file whose body contains JSX. A hook is a function named `useX`. A modal file is one whose path matches `modal` or `dialog`. A helper count is every function under `src/util`, `src/helper`, and `src/lib/**/*.ts`, not a purity claim. Server-action export counts are from `export` lines; the AST pass under-counted them as 0.

| Kind | Count |
| --- | --- |
| TS / TSX files | 880 / 492 (285,175 lines, `wc` style) |
| Components | 585 functions in 437 files |
| Hooks | 79 functions in 69 files |
| Modal / dialog files | 38 |
| Pages (`page.tsx` or `page.ts`) | 129 |
| API route files / HTTP handlers | 412 / 469 (GET 153, POST 233, PUT 27, PATCH 30, DELETE 26) |
| Server-action files / exports | 2 files; 41 exports in `queryActions.ts`, 5 in `ownerActions.ts` |
| `z.object` literals with ≥ 3 keys | 88 (15 files under a `schemas/` path or named `*.schema.*`) |
| Exported types / interfaces | 314 / 260 |
| Functions in util / helper / lib | 203 / 10 / 289 |

## 3. Summary table

| ID | Kind | Members | Label | Lines that can move | Risk | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| DUP-01 | API | 6 owner route pairs | PARAMETERIZABLE | ~1,000 | M | 1 |
| DUP-01b | API | `nearby` pair | NEAR-MATCH | ~700, after the role gate is a parameter | L | 1 |
| DUP-01c | API | `addUser`, `updateData` | NEAR-MATCH | do not fold in blindly | L | 3 |
| DUP-02 | page | 9 lead-list pages | NEAR-MATCH | ~1,600 | M | 2 |
| DUP-03 | API | 4 lead list routes that already call `LeadQueryService` | NEAR-MATCH | ~900 | M | 2 |
| DUP-03b | API | `getClosedLeads`, `getReminderLeads` | NEAR-MATCH | ~500 | M | 4 |
| DUP-04 | component | 4 table copies vs `LeadTable` | SUPERSEDED | ~1,000 | L | 3 |
| DUP-05 | API | 4 candidate PDF routes | NEAR-MATCH | ~700 of shared draw helpers | L | 5 |
| DUP-06 | page | offer-letter vs training-agreement | NEAR-MATCH | ~700 | L | 6 |
| DUP-07 | action | day-window `switch` × 8 in `queryActions.ts` | PARAMETERIZABLE | ~350 | M | 4 |
| DUP-08 | helper | 11 `new Pusher` sites | PARAMETERIZABLE | ~50 | S | 8 |
| DUP-09 | API | two location-block routes; `ensureHrOrSuperAdmin` × 12 | PARAMETERIZABLE | ~70 + ~100 | S | 7 |
| DUP-10 | component | country/state/city address blocks | PARAMETERIZABLE | ~100 | S | 9 |
| DUP-11 | hook | `useLeadStats`, `useVisitStats` | PARAMETERIZABLE | ~40 | S | 9 |
| DUP-12 | page | two availability editors | NEAR-MATCH | ~300 | M | 6 |
| DUP-13 | page | employee profile vs person profile | NEAR-MATCH | ~700 of shared UI | L | 8 |
| DUP-14 | modal | sales-offer dialogs vs bulk dialogs | PARAMETERIZABLE | ~80 | S | 10 |

Lines are the smaller copy, or the jscpd overlap, not the sum of both files. Routes should stay; the body moves.

## 4. Detailed groups

### DUP-01. Owner sheet routes, long-term and short-term

**Members.** Pairs under `src/app/api/unregisteredOwners/` and `src/app/api/unregisteredOwnersShortTerm/`. Line counts are `wc -l`. Commits are `git log --since=2025-10-12`.

| Pair | Lines | Raw Jaccard | Normalized | Commits (long / short) | Last change |
| --- | --- | --- | --- | --- | --- |
| `getList` | 63 / 63 | 0.880 | 0.958 | 3 / 2 | 2026-10-01 |
| `updatePetStatus` | 62 / 62 | 0.860 | 0.951 | 3 / 2 | 2026-10-01 |
| `getAvailableList` | 169 / 169 | 0.917 | 0.983 | 13 / 3 | 2026-10-01 |
| `getNotAvailableList` | 176 / 176 | 0.922 | 0.984 | 14 / 3 | 2026-10-01 |
| `getCounts` | 131 / 131 | 0.902 | 0.980 | 12 / 2 | 2026-09-30 |
| `nearby` | 763 / 750 | 0.956 | 0.973 | 7 / 2 | 2026-10-01 |
| `addUser` | 113 / 127 | 0.788 | 0.825 | 8 / 3 | 2026-10-01 |
| `updateData/[_id]` | 159 / 140 | 0.694 | 0.737 | 10 / 2 | 2026-10-01 |

jscpd exact: `nearby` 742 lines / 5 clones; `getCounts` 198; `getAvailableList` 160; `updateData` 128; `getNotAvailableList` 91; `addUser` 89; `updatePetStatus` 64; `getList` 63. Models `src/models/unregisteredOwner.ts` (150) and `unregisteredOwnerShortTerm.ts` (169) share 67 exact lines. Jaccard is the line-set script in `/tmp/dup-audit/analyze.mjs`.

Short-term-only routes, not copies: `[id]/link-owner`, `[id]/listing-prefill` (called from `PageAddListing1.tsx`), `by-owner/[userId]` (called from `AddPropertyLink.tsx` and `useShortTermDraftContext.ts`).

**What they do.** They list, count, create, and update owner-sheet rows for one rental collection.

**Label.** The six list/count/pet/getList pairs are PARAMETERIZABLE. After names are collapsed, the only remaining line in each of `getList`, `getAvailableList`, `getNotAvailableList`, `getCounts`, and `updatePetStatus` is the rental argument:

```29:30:src/app/api/unregisteredOwners/getCounts/route.ts
    const denied = await enforceOwnerSheetRentalTypeAccess(token, "long-term");
    if (denied) return denied;
```

The short-term file is the same call with `"short-term"`. `getAvailableList` and `getNotAvailableList` are also the same handler twice inside one tree (jscpd 140 lines between the long-term pair). That difference is a boolean, available vs not.

**Parameters.**

- Model: `unregisteredOwner` or `unregisteredOwnerShortTerm`.
- `rentalType`: `"long-term"` or `"short-term"`.
- `available`: boolean, for the two list routes.
- Zod bodies on `nearby` are the same key set in both files (`nearby/route.ts` lines 18 and 34 in each tree).

**NEAR-MATCH, `nearby`.** Long-term geo search rejects roles outside an allow-list, and it skips the rental check for Sales and Sales-TeamLead. Short-term always enforces `"short-term"` and has no allow-list.

```439:453:src/app/api/unregisteredOwners/nearby/route.ts
    const isGeoAllowedRole =
      role === "SuperAdmin" ||
      role === "Advert" ||
      role === "Sales" ||
      role === "Sales-TeamLead" ||
      role === "LeadGen-TeamLead" ||
      role === "HCollaborator";
    if (!isGeoAllowedRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (role !== "Sales" && role !== "Sales-TeamLead") {
      const denied = await enforceOwnerSheetRentalTypeAccess(token, "long-term");
```

```437:439:src/app/api/unregisteredOwnersShortTerm/nearby/route.ts
    const token = await getDataFromToken(req);
    const denied = await enforceOwnerSheetRentalTypeAccess(token, "short-term");
    if (denied) return denied;
```

Extension point: `{ rentalType, roleGate: "long-term-geo" | "none" }`. Copying the long-term gate onto short-term, or dropping it, changes who gets 403.

**NEAR-MATCH, `addUser` and `updateData`.** Short-term `addUser` also sets `advertListingStatus: "pending"` and calls `notifyAdvertPendingOwner`. Long-term `updateData` geocodes in the request (`syncLocationGeoForOwner`) and returns `locationGeo` / `geoSyncStatus`. Short-term schedules `scheduleShortTermLocationGeoSync` and returns only `{ message: "Data updated successfully" }`. Those are the extension points, not extra constants.

**Callers.** `src/app/spreadsheet/ownerSheetConfig.ts` sets `apiBasePath` to `/api/unregisteredOwners` or `/api/unregisteredOwnersShortTerm`. `OwnerSheetPage` is that one UI; `spreadsheet/page.tsx` and `spreadsheet-short-term/page.tsx` only pass the config. Also `geo-search/page.tsx` posts `/api/unregisteredOwners/nearby`, and `recommendations/[id]/page.tsx` puts `/api/unregisteredOwners/updateData/:id`. Socket and `package.json` were searched for the sales legacy paths; the sheet paths are reached through this config, not a second client.

**Git.** Short-term list routes have 2–3 commits, all on or after 2026-06-06 (`added the long term changes`, then the 2026-09-30 and 2026-10-01 commits that also touched the long-term files). The long-term files have 10–14 commits, including November 2025 spreadsheet filter fixes that predate the short-term files. That is fork history, not a fix that landed on one side after the copy. The live drift is `updateData`’s geo path and `nearby`’s role gate, both still present on 2026-10-01.

**Replacement.** `listOwnerSheet(model, rentalType, available)` in `src/modules/owners-properties/services/owner-sheet-list.ts`. Keep both HTTP trees as wrappers so current clients do not move. `nearby` takes the role-gate mode above. `updateData` takes `geo: "sync" | "schedule"`. Callers that change: the eight route files, not the spreadsheet pages.

**What could break.** A shared `nearby` that always applies the long-term role list would 403 short-term roles that work today. A shared `updateData` that always syncs would change the short-term response body. Tests to add first: one characterization test per pair for the rental argument, the available flag, the nearby 403 matrix, and the `updateData` response keys. There are no tests on these routes today (F-11).

### DUP-02. Lead-list pages

**Members.** Eight `lead-page.tsx` files plus `src/app/dashboard/lowBudget/LeadPage.tsx` (555 lines, same shell, not in the original eight).

| File | Lines | Raw Jaccard vs good-to-go | Commits | Fix subjects in the 12-month log | Last |
| --- | --- | --- | --- | --- | --- |
| `goodtogoleads/lead-page.tsx` | 625 | 1 | 14 | filters, page error, sockets, broker email | 2026-07-03 |
| `rolebaseLead/lead-page.tsx` | 523 | 0.551 | 16 | filters, page error, sockets | 2026-07-01 |
| `reminders/lead-page.tsx` | 489 | 0.451 | 5 | reminder filters only | 2026-07-01 |
| `reviewLeads/lead-page.tsx` | 457 | 0.446 | 5 | page error only | 2026-07-01 |
| `rejectedleads/lead-page.tsx` | 455 | 0.537 | 11 | filters, page error, sockets | 2026-07-01 |
| `declinedleads/lead-page.tsx` | 439 | 0.556 | 11 | filters, page error, sockets | 2026-07-01 |
| `notReplying/lead-page.tsx` | 433 | 0.484 | 7 | filters, page error | 2026-07-01 |
| `closedleads/lead-page.tsx` | 421 | 0.502 | 4 | page error only | 2026-07-01 |
| `lowBudget/LeadPage.tsx` | 555 | (jscpd 127 lines vs closed) | 6 | filters, page error | 2026-06-11 |

jscpd exact, declined vs rejected: 331 lines, 6 clones. closed vs declined: 286. reminders vs review: 280. Authors on the pages: two (`abhay6969` and `aryan216` in the wider history; the per-file author count in `git-members.json` is 2).

**What they do.** Each page is a filtered, paged lead table for one pipeline stage.

**Label.** NEAR-MATCH. Normalized Jaccard stays 0.45–0.56, so this is not a rename-only copy.

**Props / extension points.**

| Page | Fetch | Realtime | Table |
| --- | --- | --- | --- |
| declined | `useLeadList` → `/api/leads/getDeclinedLeads` | `useLeadSocket` `"declined"` | `./declined-lead-table` |
| rejected | `useLeadList` → `getRejectedLeads` | `useLeadSocket` `"rejected"` | shared `LeadTable` |
| good-to-go | `useLeadList` → `getGoodToGoLeads`, plus a brokers tab | `useLeadSocket` `"active"` | `./good-table` |
| rolebase | `useLeadList` → `getLeads`, default `leadQualityByTeamLead: "Approved"` | `useLeadSocket` `"fresh"` | shared `LeadTable` |
| notReplying | `useLeadList` → `/api/leads/notReplying` | its own `new Pusher` on channel `queries` | shared `LeadTable` |
| closed | local `filterLeads` → `getClosedLeads` | `useLeadSocket` `"closed"` | declined’s table |
| review | local `filterLeads` → `getLeads` | `new Pusher` | `./reviewTable` |
| reminders | local `filterLeads` → `getReminderLeads` | Pusher block is commented out | `ReminderTable` |
| lowBudget | posts `getRejectedLeads` | not re-read line by line | shared `LeadTable` |

`useLeadList` (`src/hooks/useLeadList.ts`) already takes `queryKey`, `endpoint`, `filters`, `page`. Five pages use it. Closed, review, and reminders still post from the page. `useLeadSocket` is Socket.IO and only allows `"fresh" | "active" | "rejected" | "declined" | "closed"`, so notReplying and reminders cannot pass their stage through that hook today. That union is the extension point.

**Missed fixes.** `fixed filters` (2026-06-11) is on declined, rejected, good-to-go, notReplying, rolebase, and lowBudget. It is not on closed, review, or reminders. `fixed sockets` is on declined, rejected, good-to-go, and rolebase only. Closed and review only show `fixed the pages error`.

**Replacement.** `StatusLeadPage` in `src/modules/leads-sales/ui/status-lead-page.tsx`:

```ts
type StatusLeadPageProps = {
  queryKey: string;
  endpoint: string;
  disposition: LeadDisposition | "notReplying" | "reminder";
  table: "shared" | "good" | "declined" | "review" | "reminder";
  defaultFilters?: Partial<FilterState>;
  extraTabs?: React.ReactNode;
};
```

Callers that change: the nine pages become thin routes. Port the socket and filter fixes onto closed and review before deleting their local `filterLeads`.

**What could break.** Good-to-go’s broker tab and notReplying’s Pusher prepend (`new-query-${allotedArea}`) are not in `useLeadSocket`. A forced switch to the socket hook drops that prepend. Test the five `useLeadList` pages and the three hand-rolled ones against an empty list, a filter change, and a socket event.

### DUP-03. Lead list routes

**Members.**

| Route | Lines | List call | `leadStatus` | Commits / fixes | Last |
| --- | --- | --- | --- | --- | --- |
| `getDeclinedLeads` | 283 | `LeadQueryService.list` | `"declined"` plus `$and` on null `rejectionReason` and null `reminder` | 5 / 0 | 2026-09-30 |
| `getRejectedLeads` | 283 | `LeadQueryService.list` | `"rejected"`; optional `filters.rejectionReason`. The old `$and` is commented out | 6 / 0 | 2026-09-30 |
| `getGoodToGoLeads` | 364 | `LeadQueryService.list` | `"active"` (the folder says good-to-go; the stored status does not) | 11 / 2 | 2026-10-12 |
| `getLeads` | 322 | `LeadQueryService.list` | `"fresh"` | 10 / 1 | 2026-09-30 |
| `getClosedLeads` | 292 | own `Query.aggregate`, sort `updatedAt: -1` | `"closed"` | 4 / 0 | 2026-09-30 |
| `getReminderLeads` | 329 | own `Query.aggregate`, sort `reminder: 1, updatedAt: -1` | `"reminder"` | 4 / 1 | 2026-09-30 |
| `notReplying` | 53 | `buildNotReplyingMatchQuery` + `LeadQueryService.list` | not a single status string in the route | 1 / 0 | 2026-07-01 |

jscpd: declined vs rejected, 252 lines, 3 clones. Both files still define local `convertToIST` / `getISTStartOfDay` (`getDeclinedLeads/route.ts` lines 32–38) even though `src/lib/leads/istDateRange.ts` and `buildAllLeadsMatchQuery.ts` already own date helpers. Those two local helpers use `addHours(date, 5.5)`. `istDateRange.getISTStartOfDay` subtracts 5.5 hours from UTC midnight. They are not interchangeable (see section 6).

**What they do.** They build a `Query` match for one pipeline stage and return a page of 50.

**Label.** NEAR-MATCH. The list executor is already shared for four routes. The copied part is the match builder. Swapping only the status string would change results: declined still requires empty `rejectionReason` and empty `reminder`; rejected does not.

```205:227:src/app/api/leads/getDeclinedLeads/route.ts
    query = {
      ...query,
      ...dateQuery,
      $and: [
        { $or: [ { rejectionReason: { $exists: false } }, { rejectionReason: { $eq: null } } ] },
        { $or: [ { reminder: { $exists: false } }, { reminder: { $eq: null } } ] },
        { leadStatus: "declined" },
      ],
    };
```

`getRejectedLeads/route.ts` lines 202–228 set `leadStatus: "rejected"` and leave the same `$and` commented. `getReminderLeads` sorts by `reminder` first (`route.ts` lines 267–269). Closed and reminder never call `LeadQueryService`.

**Extension point.** `buildStageMatch({ token, filters, stage })` where `stage` is one of `declined | rejected | active | fresh | closed | reminder | notReplying`, and the stage table owns the extra `$and` and the sort. `notReplying` is the shape to copy (53 lines). `buildAllLeadsMatchQuery` does not set `leadStatus` today, so it is the place to add the stage clause, not a drop-in.

**Callers.** declined, rejected, good-to-go, rolebase, review (`getLeads`), closed, reminders, lowBudget (`getRejectedLeads`). `getAllLeads` also sets `leadStatus: "fresh"` and calls `LeadQueryService.list` (`src/app/api/leads/getAllLeads/route.ts` lines 38–48). No `axios`/`fetch` string `/api/leads/getAllLeads` was found under the repo’s TS/JS. **UNVERIFIED** if a mobile client calls it.

**Replacement.** `src/modules/leads-sales/services/stage-lead-list.ts`, used by the existing route files. Callers of the URLs do not change.

**What could break.** Un-commenting the rejected `$and`, or applying declined’s `$and` to reminders, hides rows the pages show today. Reminder sort must stay `reminder` ascending. Characterize declined vs rejected vs reminder counts on a fixture before moving the match builder. `getGoodToGoLeads` has two fix commits the siblings do not (`fixed filters`, `fixed the add broker problem`).

### DUP-04. Lead tables beside `LeadTable`

**Members.**

| File | Lines | jscpd vs `LeadTable` | Commits / fixes | Last |
| --- | --- | --- | --- | --- |
| `src/components/leadTable/LeadTable.tsx` | 1,387 | — | 24 / 3 | 2026-10-12 |
| `goodtogoleads/good-table.tsx` | 1,389 | 634 lines, 22 clones | 19 / 5 | 2026-10-12 |
| `reviewLeads/reviewTable.tsx` | 833 | 361 lines, 11 clones | 3 / 1 | 2026-03-05 |
| `declinedleads/declined-lead-table.tsx` | 700 | 142 lines, 8 clones (322 vs good-table) | 5 / 3 | 2026-06-11 |
| `components/reminderTable/ReminderTable.tsx` | 431 | 80 lines vs declined table | 3 / 1 | 2026-03-05 |

**What they do.** They render a lead row and post status, priority, notes, and reminders to `/api/sales/*`.

**Label.** SUPERSEDED. `LeadTable` is already what rejected, notReplying, rolebase, lowBudget, and create-query render. The other four were left in place.

**Gap (the extension points, not leftovers to ignore).**

- `good-table.tsx` imports `VisitModal` and posts `/api/sales/updatePropertyShown` (around lines 77 and 378). The broker branch only shows “Set Visit” (around line 993).
- `LeadTable.tsx` posts `/api/sales/reviewLeadQuality` (lines 167–170). `reviewTable.tsx` posts `/api/sales/reviewByTeamLead` (line 130).
- `ReminderTable` posts `/api/sales/reminders/addBackToLeads`.
- Closed leads render the declined table, so closed and declined share one copy and still bypass `LeadTable`.

Both `LeadTable` and `good-table` were in the 2026-10-12 WhatsApp import commits. `fixed the message status function` is on both. `fixing whatsapp bugs` and the broker commit are only on `good-table`. `fixed multiple selection in the property boost` is only on the declined table.

**Replacement.** Keep `src/components/leadTable/LeadTable.tsx`. Add props: `rowMenu: "default" | "brokerVisit" | "teamLeadReview" | "reminder"`, and optional callbacks for property-shown and add-back. Point good-to-go, review, declined, closed, and reminders at it. Do not start a second table under `src/modules`.

**What could break.** Visit scheduling and broker row actions disappear if the prop is omitted. Compare one row action on good-to-go, declined, review, and reminders before removing the copies.

### DUP-05. Candidate PDF routes

**Members.** `hrPolicies/route.ts` (972, 5 commits, 1 fix), `trainingAgreement/route.ts` (727, 8 commits, 3 fixes), `letterOfIntent/route.ts` (1,087, 14 commits, 4 fixes), `offerLetter/route.ts` (1,320, 5 commits, 1 fix). `onboardingDocument/route.ts` overlaps them (jscpd 155 lines vs HR policies, 96 vs letter of intent) but was not read line by line.

jscpd exact: HR vs training 557 lines / 6 clones; HR vs letter of intent 448; HR vs offer letter 326; letter vs offer 298.

**What they do.** They draw a signed candidate PDF with pdf-lib and store it on `Candidate`.

**Label.** NEAR-MATCH. The first 40 lines of HR policies and the training agreement are the same `Payload`, `getBase64FromPublic`, and `drawFullWidthSectionHeading`. Letter of intent adds intern fields and `Role` (`letterOfIntent/route.ts` lines 14–36).

**Extension point.** A `drawCandidatePdf({ sections, signatures, officeAddress })` helper. The section text and the extra letter-of-intent fields stay per document. Training-agreement’s three `fixes` commits are not all on the offer-letter route (offer letter has one: `fixes and improvements`).

**Callers.** The portal pages in DUP-06. Route URLs stay.

**Replacement.** `src/modules/people-hr/services/candidate-pdf.ts` for `getBase64FromPublic`, the section heading, and page-break math. Each route keeps its own section list.

**What could break.** Signature coordinates and page breaks. Snapshot one PDF per document type before moving the draw helper. No tests cover these routes.

### DUP-06. Offer-letter page and training-agreement page

**Members.** `candidatePortal/[id]/offer-letter/page.tsx` (1,123 lines, 5 commits, 1 fix, last 2026-09-04) and `training-agreement/page.tsx` (1,655 lines, 21 commits, 7 fixes, last 2026-05-22).

jscpd: 769 lines, 25 clones. Largest exact pair in the repo.

**What they do.** The candidate signs a generated document, previews it, and uploads it.

**Label.** NEAR-MATCH. Same signature pad, Bunny upload, and dialog shell. Training agreement has `selectionDetails` (duration, stipend, training date) on its local `Candidate` type (lines 16–30). Offer letter’s header also uses `Link` and `parseDashboardPath`; the training page imports `useRouter` instead.

**Extension point.** `documentKind: "offer-letter" | "training-agreement"` plus the extra training fields. Do not merge until the training-only fixes are listed: `interview calendar fix`, `minor error fix`, `fixes of middleware` (and its revert), `added the hr dashboard changes fixed`. Offer letter’s log only has `fixes and improvements`.

**Replacement.** `src/modules/people-hr/ui/sign-document-page.tsx`. The two `page.tsx` files pass the kind and the POST URL (`/api/candidates/offerLetter` vs `/api/candidates/trainingAgreement`).

**What could break.** Training-only calendar and middleware fixes. Diff those commits into the shared page first. Verify sign, preview, and upload for both document types.

### DUP-07. Day-window switch inside `queryActions.ts`

**Member.** `src/actions/(VS)/queryActions.ts`, 4,924 lines, 41 commits, 6 fix subjects, last 2026-09-03. jscpd intra-file: 1,004 lines. Eight `case "yesterday":` blocks (one is shown at lines 571–590 in `getRejectedLeadGroup`). The same shape is in `src/app/api/sales/getquery/route.ts`, `getQueryByArea/route.ts`, `searchInRejectedLeads/route.ts`, and `searchInReminders/route.ts`.

**What it does.** It turns a `days` string into a `createdAt` range for dashboard aggregates.

**Label.** PARAMETERIZABLE inside `queryActions` and those four sales routes. Not the same function as `buildDateFilterQuery` (section 6).

**Parameter.** `days`: `"yesterday" | "last month" | "this month" | "10 days"` and the other literals in those switches. One `createdAtRange(days)` in `src/modules/leads-sales/services/created-at-range.ts`.

`getRejectedLeadGroup` filters `leadStatus: "rejected"` and returns a grouped count. `/api/leads/getRejectedLeads` returns a page of leads. Same status word, different job. Do not merge that action into the list route. `getUnregisteredOwnerCounts` is a time series (`"12 days" | "1 year" | "last 3 years"`). `/api/unregisteredOwners/getCounts` is a filtered sheet count. Same noun, different query.

**Callers.** Dashboard hooks (`useLeadStats` calls `getLocationLeadStats`). The sales search routes have **no** `/api/sales/searchInRejectedLeads` or `searchInReminders` string anywhere in TS/JS. **UNVERIFIED** for an external client. `searchInRejectedLeads` last commit is 2025-06-24 (outside this 12-month window). `searchInReminders` has one commit, 2026-03-11.

**What could break.** The switch uses local `Date` and, in some branches, UTC month bounds. A helper has to preserve each case, including the `"10 days"` branch, or dashboard charts move by a day.

### DUP-08. Pusher constructed in 11 places

**Members.** Eight server routes under `src/app/api/room/` construct `new Pusher` with `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `useTLS: true` (`scheduleVisit/route.ts` lines 8–14, and the same block in `addPropertyInRoom`, `addPropertyToFavourite`, `addSeenToProperty`, `createQuickListing`, `removePropertyFromRoom`, `retractPropertyFromRejected`, `updateVisit`). Each then `pusher.trigger(\`room-${roomId}\`, <event>, payload)` with a different event name (`visitApplied`, `showcasePropertyAdded`, `updateFavourites`, `addedSeenToProperty`, `propertyRemoved`, `retractedProperty`, `visitUpdated`).

Three client sites use `pusher-js`: `notReplying/lead-page.tsx` line 182 (channel `queries`, event `new-query-${allotedArea}`), `reviewLeads/lead-page.tsx` line 193, and `room/[...id]/page.tsx` line 247 (channel `room-${roomId}`). `reminders/lead-page.tsx` line 195 is commented out. `createquery/page.tsx` line 4 imports `pusher-js` and never constructs it. `src/lib/pusher.ts` is Socket.IO event names, not a Pusher client.

**Label.** PARAMETERIZABLE. Server: one `getPusher()` in `src/modules/visits-bookings/server/pusher.ts`. The event name stays an argument. Client: one browser helper, channel and event as arguments. The app key is a literal in the three client files; it is not repeated here.

**What could break.** Room events are independent. A shared client that also disconnects on cleanup (the lead pages do) must not disconnect a room subscription still in use. Lead realtime for the other pages is Socket.IO (`useLeadSocket`), so these two Pusher lead pages are a second transport.

### DUP-09. Employee location blocks and the HR guard

**Members.** `guest-lead-location-block/route.ts` and `owner-location-block/route.ts`, 70 lines each. jscpd: 50 lines, 3 clones. Commits 1 and 2, no fix subjects, last 2026-03-31 and 2026-04-13.

**What they do.** HR or SuperAdmin replaces an array of blocked locations on one employee.

**Label.** PARAMETERIZABLE. The differences are the error string, the path written, and the `select`.

```44:48:src/app/api/employee/guest-lead-location-block/route.ts
    const updated = await Employees.findByIdAndUpdate(
      employeeId,
      { $set: { "guestLeadLocationBlock.all": blockedLocations } },
      { new: true },
    ).select("_id guestLeadLocationBlock name email isActive allotedArea");
```

The owner route writes `ownerLocationBlock.all` and selects that path instead. Both are called from `src/app/dashboard/addRule/page.tsx`.

`function ensureHrOrSuperAdmin` is copied in 12 route files (the two above, plus pricing, visibility, phone mask, office details, and `employee-ui-rules` routes). The guard text changes; the role check does not. Do not collapse those routes into one generic employee-field writer. The payloads differ (a string array vs pricing-rule documents). Share the guard only.

**Replacement.** `setEmployeeLocationBlock(employeeId, field, locations)` in `src/modules/people-hr/services/location-block.ts`, and `assertHrOrSuperAdmin(role)` next to it. The two PUT routes stay.

**What could break.** Writing the wrong path. One test per field with an HR token and a non-HR token.

### DUP-10. Address country / state / city

**Members.** `src/app/dashboard/owners/onwer-address.tsx` (118 lines, `OwnerAddress`, no commits in the window, last 2025-04-23) and `src/app/dashboard/sales-offer/address-details.tsx` (125 lines, `AddressDetails`, 1 commit, 2026-04-18).

**What they do.** They fill country, state, and city from `country-state-city` into a Zustand store.

**Label.** PARAMETERIZABLE. AST JSX fingerprint is the same 33-tag sequence. The prop is the store: `useOwnerStore` vs `useSalesOfferStore`, both exposing `setField`.

**Replacement.** `CountryStateCityFields` in `src/components/address/country-state-city-fields.tsx`, prop `onField(key, value)`. Two call sites.

**What could break.** Field names (`country` vs a sales-offer key). Check both forms still persist the three values.

### DUP-11. Month-stat hooks

**Members.** `src/features/leadgen/hooks/useLeadStats.ts` and `src/features/sales/hooks/useVisitStats.ts`, 47 lines each, both last changed 2026-06-20, one commit each.

**What they do.** They keep a selected month and load a series through TanStack Query.

**Label.** PARAMETERIZABLE. The only behavioral difference is the server action and the query key: `getLocationLeadStats` / `["leadStats"]` vs `getLocationVisitStats` / `["visitStats"]`. Return property names differ (`leadStats` vs `visitStats`).

**Replacement.** `useMonthSeries({ queryKey, fetchMonth })` in `src/modules/leads-sales/hooks/use-month-series.ts`. The two hooks become wrappers so current return names stay.

**What could break.** Nothing if the wrappers keep the current return shape. The actions themselves are different aggregates (section 6 does not apply; these two hooks match).

### DUP-12. Availability editors

**Members.** `newproperty/editPortionAvailability/[id]/page.tsx` (434 lines) and `property/edit/availability/[...id]/page.tsx` (363 lines). jscpd 336 lines, 8 clones. One commit each, 2026-03-05. AST: `renderPriceEditDrawer` is the same 19-tag tree (the portion page at line 235, the property page at line 229).

**What they do.** They edit a date-range price on a property calendar.

**Label.** NEAR-MATCH. They call different routes: the portion page posts `/api/property/editPrices` (line 330); the property page posts `/api/editPrices` (line 283). Those routes are DIVERGED (section 6). The page shell can be one component only if the save function is injected.

**Extension point.** `savePrices(body)` plus whether the grid is portioned.

**Replacement.** `src/modules/owners-properties/ui/availability-editor.tsx` with a `save` prop. Do not point both pages at one API route.

**What could break.** Portion indexes written onto a flat `pricePerDay` array, or the reverse. Verify a portioned listing and a non-portioned listing.

### DUP-13. Employee profile and person profile

**Members.** `employeedetails/[...id]/page.tsx` (`EmployeeProfilePage`, line 202, 2,712 lines, 16 commits, 1 fix, last 2026-09-14) and `people/[candidateId]/page.tsx` (`PersonDetailPage`, line 236, 2,888 lines, 5 commits, 0 fixes, last 2026-09-14).

jscpd: 692 lines, 38 clones.

**What they do.** They show a person file: employee record, or candidate record that can resolve an employee id (`toEmployeeId` at line 130 of the people page).

**Label.** NEAR-MATCH. Extension point: the source document and which actions exist (employee HR actions vs candidate pipeline). This audit did not line-diff the 2,700-line bodies beyond the clone total, so the prop list is not fully enumerated.

**Replacement.** Not a first merge. If it happens, `src/modules/people-hr/ui/person-profile.tsx` with `source: "employee" | "candidate"`. Do it after DUP-05, which is the smaller people-hr duplication.

**What could break.** HR actions shown on a candidate who is not an employee. Needs a characterization pass this audit did not do.

### DUP-14. Sales-offer dialogs and their bulk twins

**Members.** Inside `sales-offer/components/action-dialogs.tsx` and `bulk-action-bar.tsx`. AST exact JSX:

- `AddCallbackDialog` (line 80), `BulkCallbackDialog` (line 168), and `visits/reschedule-visit-modal.tsx` `RescheduleVisitModal` (line 41): 17 tags, date/time/note.
- `RejectLeadDialog` (line 140) and `BulkRejectDialog` (line 215): 18 tags.
- `BlacklistLeadDialog` (line 208) and `BulkBlacklistDialog` (line 264): 14 tags.

jscpd intra-file on `action-dialogs.tsx`: 170 lines.

**Label.** PARAMETERIZABLE. Prop: `onSubmit(values)` and `title`. The bulk variants submit many ids; the single variants submit one offer. `RescheduleVisitModal` is the same fields on a visit, so the shared piece is the form, not the API.

**Replacement.** `src/modules/offers/ui/note-date-dialog.tsx`. Three call sites in the sales-offer folder, one in visits.

**What could break.** Bulk confirm must still receive the array. Single-offer dialogs must still receive one id.

### Copied Zod bodies (small)

`migrateChannelSchema` in `src/app/api/whatsapp/channels/[id]/route.ts` (line 54) and `migrateSchema` in `channels/[id]/migrate/route.ts` (line 48) have the same keys (name, channel type, WABA ids, rental type, locations, metadata). PARAMETERIZABLE: one schema in `src/modules/whatsapp/schemas/channel-migrate.ts`. The PATCH schema in the same file is a different, optional-field object. Do not merge PATCH with migrate.

`offers/[id]/rebuttal/route.ts` and `reminder/route.ts` start with the same `BodySchema` (lines 14–20: organization, templateId, subject, html, note, aliasId). Share the schema. This audit did not compare the send logic past the schema, so do not merge the handlers from the schema match alone.

## 5. Reuse gaps (SUPERSEDED)

**Sheet UI vs sheet API.** `spreadsheet-short-term/page.tsx` is seven lines that render `OwnerSheetPage` with `OWNER_SHEET_SHORT_TERM_CONFIG`. The API tree beside it was copied instead of taking the same `rentalType` argument. DUP-01 is that gap.

**`useLeadList` vs three pages that ignore it.** The hook already posts `{ filters, page }` to an endpoint. Closed, review, and reminders reimplement that call. DUP-02.

**`LeadTable` vs four tables.** DUP-04. Rejected and rolebase already use the shared table. Good-to-go, review, declined, and reminders do not.

**`notReplying` vs the older list routes.** `notReplying/route.ts` is the short form: auth, match builder, `LeadQueryService.list`. Declined, rejected, good-to-go, and fresh still inline the match builder and then call the same service. Closed and reminder do not call it at all. DUP-03.

**Legacy sales lists vs `/api/leads`.** These are not drop-in duplicates (section 6 and section 7). They are older doors for a job the leads routes now do for the dashboard. No in-repo caller was found. **UNVERIFIED** for anything outside this repo.

- `src/app/api/sales/getRejectedLeads/route.ts` (40 lines, last commit 2024-12-26, zero commits in the window). No auth. `Query.find({ rejectionReason: { $ne: null } })`, page size 10, response `{ rejectedLeads, totalRejectedLeads }`.
- `src/app/api/sales/reminders/getAllReminders/route.ts` (25 lines, last commit 2024-12-21). No auth. Returns every query with a reminder, no page, no `leadStatus: "reminder"`.

The dashboard reminder page calls `/api/leads/getReminderLeads`. The rejected page calls `/api/leads/getRejectedLeads`.

## 6. DIVERGED — do not merge

**`/api/sales/getRejectedLeads` vs `/api/leads/getRejectedLeads`.** Raw line Jaccard 0.056. No auth vs `getDataFromToken`. Filter is `rejectionReason != null` vs `leadStatus: "rejected"` plus the lead filter stack. Response keys differ. Page size 10 vs 50. Merging them changes a public unauthenticated query into an authenticated status query, or the reverse.

**`getAllReminders` vs `getReminderLeads`.** Unbounded find vs paged aggregate sorted by reminder date, with employee rental and location rules. Different response.

**`/api/editPrices` vs `/api/property/editPrices`.** Both walk a date range and assign `pricePerDay`. The root route writes `pricePerDay[portion][month][day - 1]` and, if `getDataFromToken` throws without `status`, continues and still saves (`editPrices/route.ts` lines 9–19 and 45–53). The property route writes `pricePerDay[month][day - 1]` and returns 401 on auth failure (`property/editPrices/route.ts` lines 10–21 and 45–54). Callers are the two availability pages in DUP-12. A shared date loop is safe only if the path and the auth failure stay separate parameters and the root route’s fall-through is an explicit choice.

**`Invoice` vs `FinanceInvoice`.** `src/models/invoice.ts` is a GST booking invoice: `sgst` / `cgst` / `igst`, `sacCode`, status `paid | unpaid | partially_paid | cancelled`, `bookingType` `Booking Commission | Listing Subscription`. `src/modules/finance/models/invoice.model.ts` is a Razorpay ledger invoice: `classification` `complete | partial | split`, status `generated | sent | failed | superseded`, linked to `FinancePayment`. Dashboard invoice pages call `/api/invoice` and `/api/invoice/getInvoices` (`invoice-builder.tsx`, `invoice/list/page.tsx`). Finance services use `FinanceInvoice`. Both are live. Same English word, different documents.

**`Payment` vs `FinancePayment`.** Only one mongoose model is registered as `"Payment"`: `src/models/housingPayment.ts` (EUR, `planId`, `addressKey`, HousingSaga). Finance registers `"FinancePayment"` (`payment.model.ts` line 186): Razorpay ids, mapping onto a booking, invoice status. `src/lib/owner-journey/pipelines.ts` imports the HousingSaga `Payment`. There is not a second schema also named `"Payment"`. Do not merge the collections.

**`buildDateFilterQuery` vs the `queryActions` day switch.** `istDateRange.ts` cases are `today`, `yesterday`, `lastDays`, `customRange`, using IST day bounds. The action switch cases include `yesterday`, `last month`, `this month`, `10 days`, using `Date.now()` and calendar-month boundaries (`queryActions.ts` lines 571–590). `buildDateFilterQuery` has no importers. Replacing the action switch with it would move chart buckets.

**`/api/createnewproperty` vs `/api/createnewproperty/newProperties`.** Renamed-mode jscpd reported 231 lines and 0 exact lines. The handlers are not the same feature: the parent route writes `listing` and emails via `sendUserDetailsToCompany`, with no `getDataFromToken` in the first 40 lines. `newProperties` writes `Properties`, links `unregisteredOwnerShortTerm` and `Users`, and calls `getDataFromToken`. The renamed overlap is field-list noise. Leave them apart.

**shadcn pairs** (`context-menu` / `dropdown-menu`, `dialog` / `sheet`, `alert` / `card`) show up only in the renamed pass. They are upstream component kits. Leave them.

## 7. API families

**Owner pair.** DUP-01. Same model family, same filters, two collections. `getAvailableList` / `getNotAvailableList` are the same query with an availability flag, and that pair exists in both trees (four handlers).

**Lead status family.** `/api/leads/getDeclinedLeads`, `getRejectedLeads`, `getGoodToGoLeads`, `getLeads`, `getClosedLeads`, `getReminderLeads`, `notReplying`, and `getAllLeads`. Four already end in `LeadQueryService.list`. Closed and reminder use a private aggregate. `getAllLeads` and `getLeads` both target `leadStatus: "fresh"`. UI callers found for `getLeads` only (review, rolebase). **`getAllLeads`: no in-repo caller. UNVERIFIED** for an external client.

**Sales vs leads.** The status *writes* (`/api/sales/queryStatusUpdate`, `rejectionReason`, `updateSalesPriority`, `reminders/addReminder`, `createNote`) are what the tables call. They are not copies of the list routes. The status *reads* that share a name are the DIVERGED pair in section 6. Other sales reads with no path string in TS/JS: `searchInRejectedLeads`, `searchInReminders`, `getAllReminders`, `getRejectedLeads`. **UNVERIFIED** external callers. Do not describe them as unused.

**Same-model structural groups that are not worth merging.** The AST grouped many GET handlers that only share `getDataFromToken` and no model (24 files). That is F-10 (every route does auth its own way), not a clone. Employee PUT routes that share `findByIdAndUpdate` plus the HR guard (pricing, visibility, phone mask) share the guard (DUP-09) and not the body.

**`editPrices` family.** Section 6. Both touch `Properties` and `pricePerDay`. The index structure differs.

## 8. Recommended order

1. **DUP-01 list/count/pet/getList**, plus the available flag, as wrappers over one service. The spreadsheet config already chooses the base path. Leave `nearby`’s role gate, `addUser`’s advert notify, and `updateData`’s geo mode as explicit arguments in the same service, but do not collapse those three until the characterization tests exist.
2. **DUP-03** match builder with a stage table. Point closed and reminder at `LeadQueryService.list` only after reminder sort and declined’s `$and` are in that table. Leave `/api/sales/getRejectedLeads` alone.
3. **DUP-02** after step 2. Move closed, review, and reminders onto `useLeadList`. Widen `useLeadSocket`’s disposition union, or keep Pusher as the notReplying extension. Port `fixed filters` and `fixed sockets` onto closed and review as part of the move.
4. **DUP-07** `createdAtRange(days)` for the eight action copies. Do not retarget it at `istDateRange`.
5. **DUP-04** props on `LeadTable`. Do this after the pages share one shell, so the table prop has one caller.
6. **DUP-09, DUP-10, DUP-11, DUP-14, DUP-08.** Small, and none of them block the others.
7. **DUP-05** draw helper, then **DUP-06** only after the training-agreement fix commits are accounted for.
8. **DUP-12** page shell with an injected save. Do not merge the two price routes.
9. **DUP-13** last, and only with a separate profile diff. It is the largest unread body in this list.

Dependencies: 2 before 3 (pages should call one list function). 3 before 4 (one page passes one table prop). 1 is independent. 5 and 6 are independent of leads.

## 9. Unverified and questions

- No in-repo caller for `/api/sales/getRejectedLeads`, `/api/sales/reminders/getAllReminders`, `/api/sales/searchInRejectedLeads`, `/api/sales/searchInReminders`, or `/api/leads/getAllLeads`. An app, webhook, or script outside this repo could still call them.
- `nearby` role gate: should short-term geo use the same allow-list, or is the missing check intentional?
- `updateData` geo: should both sheets wait for geocode and return `geoSyncStatus`, or is fire-and-forget correct for short-term?
- Declined’s extra `$and` vs rejected’s commented `$and`: which result set is correct?
- `getAllLeads` and `getLeads` both select `fresh`. Is `getAllLeads` still a supported client?
- Legacy `Invoice` is still what `/dashboard/invoice` saves. Finance uses `FinanceInvoice`. This matches the open question in the architecture review: both are still referenced, so neither is a leftover file by itself.
- Finance tests call `mongoose.model("Booking")` (`invoice-workflow.integration.test.ts`). `src/models/booking.ts` registers `"bookings"` (line 277) and a separate `"counters"` model (line 10). The seed script `seedFinanceWalkthrough.ts` line 145 also registers `"counters"` with a thinner schema if the model is missing. That is a shared collection name, not a second payment model. Whether the test’s `"Booking"` lookup works was not executed.
- `queryActions.ts` was not compared export-by-export to all 41 dashboard endpoints. The exports that were opened (`getRejectedLeadGroup`, `getUnregisteredOwnerCounts`, `getUnregisteredOwners`) are dashboard aggregates, not copies of the sheet or list routes.
- Renamed-mode jscpd pairs between unrelated screens were discarded. A semantic embedding pass (`jscpd --semantic`) was not run; it would download a large model.

## 10. Appendix

**jscpd exact** (`docs/duplication-report-data/jscpd/jscpd-exact.json`): 1,782 clones, 32,409 lines, 11.43%, 1,338 files, 283,498 lines scanned. Intra-file clones: 497 (7,325 lines). Largest intra-file file: `queryActions.ts` (1,004), then `sidebar.tsx` (651), `addRule/page.tsx` (626).

**jscpd renamed:** 4,739 clones, 76,544 lines, 27.00%. Use only with a same-feature filter.

**Other raw files.**

- `docs/duplication-report-data/inventory.json`
- `owner-pairs.json` (per-pair Jaccard and the normalized lines that differ)
- `lead-page-jaccard.json`
- `lead-sales-name-overlap.json`
- `jscpd-exact-pairs.json` (top file pairs)
- `component-exact-groups.json`, `hook-exact-groups.json`
- `route-structural-groups.json`, `route-same-model.json`
- `zod-dup-groups.json`, `pusher-sites.json`, `client-api-calls.json` (522 URL literals)
- `model-registrations.json`, `git-members.json`
- `commands.txt`

**Top exact pairs by summed clone lines** (overlaps, so do not add them): offer-letter page / training-agreement page 769; owner `nearby` 742; employee profile / person profile 692; `good-table` / `LeadTable` 634; HR policies / training agreement routes 557.

**Covered.** Full `src/` textual scan; AST fingerprints for components with at least 8 JSX nodes, hooks with at least 3 tracked calls, and all 469 HTTP handlers; owner and lead Jaccard; caller search for the flagged routes; git on every member in section 4.

**Skipped.** Line-by-line reading of all 412 handlers and of `queryActions.ts` beyond the day switch and three exports. WhatsApp webhook and inbox bodies (intra-file clones only: webhook 103 lines, `whatsapp-chat.tsx` 343). Email HTML. `onboardingDocument` beyond its jscpd overlap. Runtime, tests, and the browser. `jscpd --semantic`. The 24-route “auth only” structural bucket, which is a consistency issue (F-10), not a reuse target.
