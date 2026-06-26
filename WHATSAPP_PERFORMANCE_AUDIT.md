# WhatsApp Feature — Performance Audit (Static Analysis)

**Audit date:** 2026-06-24  
**Scope:** Read-only static code analysis — no code changes made during this pass.  
**Entry route:** `/whatsapp` (`src/app/whatsapp/page.tsx`)
 
---

## Files Discovered (pre-audit inventory)

### App routes & UI (`src/app/whatsapp/`)
`page.tsx`, `whatsapp.tsx`, `types.ts`, `utils.ts`, `channels/page.tsx`, `calls/page.tsx`, `retarget/page.tsx`  
`containers/ConversationSidebarContainer.tsx`, `containers/MessageThreadContainer.tsx`  
`context/WhatsAppProviders.tsx`, `context/ConversationListContext.tsx`, `context/ActiveThreadContext.tsx`, `context/WhatsAppUIContext.tsx`, `context/*-context-types.ts`  
`components/*` (ConversationSidebar, ConversationItem, MessageList, MessageComposer, ChatHeader, CrmPanel, TemplateDialog, calling overlay, CRM dialogs, etc.)  
`hooks/useConversationsList.ts`, `hooks/useMessages.ts`, `hooks/useUnifiedWhatsAppSearch.ts`, `hooks/useInitiationLimit.ts`, `hooks/useMobileView.ts`, `hooks/usePeerConnectionStats.ts`, `hooks/useMessageTranslation.ts`  
`lib/whatsappQueryCache.ts`, `lib/conversationListUpdates.ts`, `lib/messageGrouping.ts`, `lib/whatsappInboxUrl.ts`

### API routes (`src/app/api/whatsapp/`) — 43 unique `route.ts` files
See Section 3 for full inventory.

### Shared lib (`src/lib/whatsapp/`) — 71 files
`inboxQuery.ts`, `inboxUnreadQuery.ts`, `conversationsListEnrichment.ts`, `config.ts`, `access.ts`, `channelService.ts`, `calling/*`, `analytics/*`, services, helpers.

### Models
`whatsappConversation.ts`, `whatsappMessage.ts`, `whatsappChannel.ts`, `whatsappChannelAssignment.ts`, `whatsappCallLog.ts`, `conversationReadState.ts`, `conversationArchiveState.ts`

### Dashboard / layout widgets
`src/components/whatsapp/WhatsAppNotifications.tsx`  
`src/components/Notifications/SystemNotificationToast.tsx`  
`src/components/Notifications/SystemNotificationCenter.tsx`  
`src/app/dashboard/layout.tsx` (mounts widgets on all dashboard routes)

### Other consumers
`src/hooks/useWhatsApp.ts`, `src/hooks/useSocket.ts`, `src/lib/pusher.ts`, `socket.ts`, `src/lib/notifications/whatsappNotificationController.ts`, `src/middleware.ts`, analytics/retarget/spreadsheet integrations.

### Server actions
`src/actions/(VS)/queryActions.ts` — references `whatsappBlocked`, `whatsappRetargetCount`, `whatsappLastRetargetAt` on leads only; **no direct WhatsApp inbox API calls**.

---

## SECTION 1: Feature Overview

The WhatsApp feature is a full CRM inbox modeled after WhatsApp Web:

- **Send/receive:** Text, templates, media (image/video/audio/document), reactions, forwards, interactive messages (API exists), internal “You” notes (no Meta delivery).
- **Inbox:** Conversation list with filters (All, Unread, labels, owners/guests, location, admin queue), archive, unified search, infinite scroll + virtualization.
- **Thread:** Paginated message history (20/page), reply, CRM panel, disposition/visit/reminder dialogs, translation, calls (WebRTC + Meta Calling API).
- **Notifications:** Dashboard bell (`WhatsAppNotifications`) shows expiring 24h windows + unread summary; `SystemNotificationToast` shows real-time toasts; socket push + optional polling.
- **Templates:** Fetched per conversation from Meta via `GET /api/whatsapp/templates` when a thread is open; sent via `POST /api/whatsapp/send-template`.
- **Roles:** `isWhatsAppAccessRole()` in `src/lib/whatsapp/config.ts` — SuperAdmin, Admin, Developer, Sales, Sales-TeamLead, HR, Advert (retarget-only), area-scoped visibility via `locationAccess.ts` / `phoneAreaConfigService.ts`.
- **Entry URL:** `/whatsapp` (standalone full-screen; not under `/dashboard/whatsapp` for main chat — analytics at `/dashboard/whatsapp-analytics`, channels at `/dashboard/whatsapp/channels`).

---

## SECTION 2: Route & Component Tree

### `/whatsapp` (main inbox)

```
page.tsx (client)
  └─ QueryProvider
       └─ dynamic import("./whatsapp", ssr: false) → WhatsAppSkeleton while loading
            └─ whatsapp.tsx (client shell, ~4400 lines)
                 └─ WhatsAppProviders
                      ├─ ConversationListProvider (list state, React Query conversations)
                      ├─ ActiveThreadProvider (selected thread, messages, templates, phone configs)
                      └─ WhatsAppUIProvider (modals, call UI, composer-adjacent UI flags)
                 ├─ ConversationSidebarContainer (memo) — subscribes to list context only
                 │    └─ ConversationSidebar — @tanstack/react-virtual list
                 ├─ MessageThreadContainer (memo) — subscribes to thread + UI context
                 │    ├─ ChatHeader
                 │    ├─ MessageList — virtualized when ≥30 grouped bubbles
                 │    ├─ MessageComposer
                 │    ├─ CrmPanel (dynamic, desktop)
                 │    └─ Disposition/Visit/Reminder dialogs (dynamic)
                 ├─ WhatsAppCallOverlay, ForwardDialog, LeadTransferDialog, AddGuestModal (dynamic)
                 └─ Socket handlers, send/call logic (whatsapp.tsx)
```

| Component | Client/Server | Dynamic import |
|-----------|---------------|----------------|
| `page.tsx` | Client | `whatsapp.tsx` via `next/dynamic` |
| `whatsapp.tsx` | Client | Many modals/overlays dynamic |
| Containers | Client | Static imports |
| `ConversationSidebar` | Client | Static |
| `MessageList` | Client | Static |

### Related routes

| Route | Tree |
|-------|------|
| `/whatsapp/retarget` | `retarget/page.tsx` — bulk retarget UI |
| `/whatsapp/calls` | `calls/page.tsx` — call history |
| `/whatsapp/channels` | Redirect/legacy channels |
| `/dashboard/whatsapp-analytics` | Analytics dashboard |
| `/dashboard/whatsapp/channels` | Channel admin |

### Layout-level widgets (`src/app/dashboard/layout.tsx`)

| Widget | Mount scope | Data needed | Updates |
|--------|-------------|-------------|---------|
| `WhatsAppNotifications` | **All** `/dashboard/*` routes | `GET /api/whatsapp/notifications/summary` | React Query: poll 2–5 min; socket `whatsapp-new-message`, `whatsapp-conversation-update`, `whatsapp-messages-read` |
| `SystemNotificationToast` | **All** `/dashboard/*` routes | Socket events + `GET /api/whatsapp/conversations/archive?idsOnly=true` once | Socket + 500ms queue tick |
| `SystemNotificationCenter` | Dashboard layout | System notifications API | Separate from WhatsApp inbox |

**Note:** Main inbox at `/whatsapp` is **outside** dashboard layout — widgets do not mount on the inbox page itself, but sales users see them on every other dashboard page.

---

## SECTION 3: Complete API Inventory

### a) REST API routes (`/api/whatsapp/*`)

| # | Endpoint | Method | Called by | Trigger | Caching? | Polling? |
|---|----------|--------|-----------|---------|----------|----------|
| 1 | `/conversations` | GET | `useConversationsList` | Mount, filter change, infinite scroll, invalidate | RQ 5m stale | No |
| 2 | `/conversations` | POST | `whatsapp.tsx`, `AddGuestModal` | New chat / guest | No | No |
| 3 | `/conversations/archive` | GET | `ConversationListContext`, `SystemNotificationToast` | Mount silent prefetch, archive view, idsOnly | Partial (ids in localStorage) | No |
| 4 | `/conversations/archive` | POST/DELETE | `ConversationListContext` | User archive/unarchive | No | No |
| 5 | `/conversations/read` | POST | `ActiveThreadContext` | Open thread / mark read | No | No |
| 6 | `/conversations/transfer` | POST | `whatsapp.tsx` | Lead transfer dialog | No | No |
| 7 | `/conversations/[id]/messages` | GET | `useMessages` | Open thread, load older | RQ 2m stale | No |
| 8 | `/conversations/[id]/meta` | POST | ChatHeader, sidebar, containers | CRM meta edits | No | No |
| 9 | `/conversations/[id]/preferences` | GET/PATCH | `MessageComposer` | Translation language | No | No |
| 10 | `/conversations/[id]/readers` | GET | `ChatHeader` | Mount + `readersRefreshToken` bump | No | No |
| 11 | `/conversations/[id]/labels` | PATCH | `CrmPanel`, `SetVisitDialog` | CRM actions | No | No |
| 12 | `/conversations/[id]/shared-properties` | GET | `CrmPanel`, `SetVisitDialog` | Panel open | No | No |
| 13 | `/conversations/media` | GET | `MediaPopup` | User opens media gallery | No | No |
| 14 | `/conversations/counts` | GET | *(legacy)* | — | — | — |
| 15 | `/search/unified` | GET | `useUnifiedWhatsAppSearch` | Debounced search 300ms | No | No |
| 16 | `/phone-configs` | GET | `ActiveThreadContext` | Thread provider mount | RQ 30m stale | No |
| 17 | `/templates` | GET | `ActiveThreadContext`, retarget page | Conversation selected | RQ 10m stale | No |
| 18 | `/configured-locations` | GET | ChatHeader, AddGuest, SetLocation | Dialog open | No | No |
| 19 | `/resolve-phone-for-location` | GET | `whatsapp.tsx`, AddGuest | Location pick | No | No |
| 20 | `/initiation-limit` | GET | `useInitiationLimit` | Mount +2s delay | No | Optional poll param |
| 21 | `/send-message` | POST | `whatsapp.tsx` | Send text | No | No |
| 22 | `/send-template` | POST | `whatsapp.tsx`, retarget | Template send | No | No |
| 23 | `/send-media` | POST | `whatsapp.tsx`, `MessageThreadContainer` | Media send | No | No |
| 24 | `/send-reaction` | POST | `whatsapp.tsx`, thread container | Reaction | No | No |
| 25 | `/forward-message` | POST | `whatsapp.tsx` | Forward dialog | No | No |
| 26 | `/upload-to-bunny` | POST | Composer, sidebar, shell | File pick | No | No |
| 27 | `/notifications/summary` | GET | `WhatsAppNotifications` | Mount + poll | RQ 60s stale | 2–5 min off-inbox |
| 28 | `/notifications/clear` | POST | `SystemNotificationToast` | Dismiss | No | No |
| 29 | `/call` | GET/POST | `whatsapp.tsx` | Voice calls | No | No |
| 30 | `/calls/history` | GET | `calls/page.tsx` | Page load | No | No |
| 31 | `/calls/telemetry` | POST | `whatsapp.tsx` | Call events | No | No |
| 32 | `/ice-servers` | GET | `whatsapp.tsx` | Call setup | No | No |
| 33 | `/disposition` | POST | `DispositionDialog` | CRM | No | No |
| 34 | `/reminders` | POST | `ReminderDialog` | CRM | No | No |
| 35 | `/leads/lookup` | GET | Disposition/Visit dialogs | Dialog open | No | No |
| 36 | `/properties/search` | GET | `SetVisitDialog` | Visit scheduling | No | No |
| 37 | `/retarget/*` | various | `retarget/page.tsx` | Retarget flow | No | No |
| 38 | `/phone-health` | GET | `PhoneNumberHealth.tsx` | Analytics UI | No | No |
| 39 | `/webhook` | GET/POST | Meta only | Inbound | N/A | N/A |
| 40 | `/channels/*` | various | Dashboard channels page | Admin | No | No |

### b) Server actions

**None found** for WhatsApp inbox data fetching. `queryActions.ts` only aggregates lead fields with `whatsapp*` naming for spreadsheet/analytics.

### c) Socket events (client `on`)

| Event | Handler location | State updated |
|-------|------------------|---------------|+

| `whatsapp-new-message` | `whatsapp.tsx` (~1643), `WhatsAppNotifications.tsx` (~104) | List cache, messages, unread counts, summary query |
| `whatsapp-message-status` | `whatsapp.tsx` (~1962) | Message status, list preview |
| `whatsapp-message-echo` | `whatsapp.tsx` (~1989) | List + thread |
| `whatsapp-conversation-read` | `whatsapp.tsx` (~2281) | Unread clear, list remove (unread filter) |
| `whatsapp-conversation-update` | `whatsapp.tsx` (~2369) | Patch or debounced invalidate (300ms) |
| `whatsapp-new-conversation` | `whatsapp.tsx` (~1939) | Insert conversation |
| `whatsapp-incoming-call` | `whatsapp.tsx` (~2042) | Toast only |
| `whatsapp-call-*` | `whatsapp.tsx` | Call UI / WebRTC |
| `whatsapp-history-sync` | `whatsapp.tsx` (~2263) | Full list refetch |
| `whatsapp-messages-read` | `WhatsAppNotifications.tsx` | Summary cache |
| `whatsapp-notifications-cleared` | `SystemNotificationToast` | Toast queue |

**Emitted (client):** `join-whatsapp-room`, `join-whatsapp-phone`, `join-whatsapp-channel`, `join-whatsapp-retarget`, matching `leave-*`.

**Defined but unused in inbox UI:** `whatsapp-typing-start`, `whatsapp-typing-stop` (`src/lib/pusher.ts`).

### d) Third-party APIs (server-side only)

Meta Graph API — templates, send message/media/template, webhook, phone health, media upload. Called from API routes and `webhook/route.ts`, **not** from browser directly.

---

## SECTION 4: Data Fetching Pattern Analysis

| Hook / component | Mechanism | Trigger | staleTime | Polling | Duplicates? | Loading/error |
|------------------|-----------|---------|-----------|---------|-------------|---------------|
| `useConversationsList` | React Query infinite | Mount, filters, scroll | 5 min | No | Single provider | `loading` in context |
| `useMessages` | React Query infinite | `selectedConversationId` | 2 min | No | Per conversation key | `messagesLoading` in thread context |
| `ActiveThreadContext` phone-configs | `useQuery` | Provider mount | 30 min | No | Once per session | Implicit |
| `ActiveThreadContext` templates | `useQuery` | Conversation select | 10 min | No | Per `templatesCacheKey` | `templatesLoading` |
| `useInitiationLimit` | useState+axios | Mount +2s | None | Optional | Sidebar badge | `loading` |
| `useUnifiedWhatsAppSearch` | useState+debounced fetch | Search input 300ms | None | No | Only when searching | `searchLoading` |
| `ConversationListContext` archive prefetch | axios | `token` mount | None | No | Also `SystemNotificationToast` idsOnly | Silent |
| `WhatsAppNotifications` | `useQuery` | Mount | 60s | 2–5 min | Parallel to inbox on other pages | `loading` |
| `ChatHeader` readers | axios in effect | Mount, token bump | None | No | Per open chat | Partial |
| Socket patches | `mutateWhatsAppConversationsListCache` | Events | N/A | N/A | Can overlap with refetch | N/A |

**Fetched but partially unused:** Guest `listingLinkSentCount` / `optionsSentCount` only shown for guests; many conversation schema fields not rendered in sidebar row.

---

## SECTION 5: Conversation List Load Analysis

### Sequence: navigate to `/whatsapp` → list visible

| Step | What happens | Blocking? |
|------|----------------|-----------|
| 1 | `page.tsx` loads; dynamic import `whatsapp.tsx` (shows skeleton) | Yes — JS chunk |
| 2 | `WhatsAppProviders` mount; `ConversationListProvider` runs | — |
| 3 | Auth `token` from `useAuthStore` enables `useConversationsList` | — |
| 4 | **Parallel on first paint:** `GET /conversations?limit=25` (+ filters from URL) | Main blocker |
| 4b | Same request server-side: `loadGlobalArchivedConversationIds`, `buildInboxListQueryAsync` ×2, page fetch + tab counts + **unread aggregation** (`inboxUnreadQuery.ts`), `enrichInboxConversationPage`, lead profile pics batch, guest outbound stats, optional “You” conversation | Server waterfall after page match |
| 5 | `fetchArchivedConversations({ silent: true })` → `GET /archive?idsOnly=true` | Parallel client call |
| 6 | SuperAdmin: URL sync may re-trigger list with `locationFilter=Athens` | Extra fetch if default applied |
| 7 | `useInitiationLimit` fires after **2s delay** | Non-blocking |
| 8 | `whatsapp.tsx` socket joins + phone/channel rooms after `phone-configs` resolve in thread provider | Parallel |
| 9 | Sidebar virtualizer renders first page (≤25 rows) | After step 4 |

### Pagination
- Client: `useInfiniteQuery`, cursor = `lastMessageTime` ISO string, 25 per page.
- Server: `fetchInboxConversationPage` or `fetchUnreadInboxConversationPage` (aggregation for unread filter).

### Message content on list load
- **Not fetched.** Only `lastMessageContent` preview on conversation document + enriched `unreadCount` per employee.

### N+1 on list
- **Avoided for list page:** `enrichInboxConversationPage` batches read states, unread counts, archive states, template type inference, last message status.
- **Post-page:** `batchLoadLeadProfilePics` (one Query find), `getGuestOutboundStatsByConversationIds` (guests only).

### Client-side filtering
- Owners/guests tab: still filters loaded pages client-side (`ConversationSidebar.tsx` ~392–407) even when server `labelFilter` also applies.
- Unread: **server-side** via `labelFilter=unread` + `inboxUnreadQuery.ts` (recent change).

### Waterfalls (server, per `conversations/route.ts`)
1. `loadGlobalArchivedConversationIds` (await)
2. `buildInboxListQueryAsync` ×2 (parallel)
3. Page + counts + unread count (parallel)
4. `enrichInboxConversationPage` (await) — **blocks response**
5. Lead pics + guest stats (try/catch, still before response)
6. “You” conversation find/create (await)

**NEEDS RUNTIME VERIFICATION:** p95 latency of unread aggregation `aggregateUnreadInboxConversationCount` on large inboxes.

---

## SECTION 6: Message Thread Load Analysis

### Sequence: click conversation → messages visible

| Step | API / action |
|------|----------------|
| 1 | `ActiveThreadContext.selectConversation` — URL update via `buildWhatsAppInboxUrl` |
| 2 | `useMessages` enabled → `GET .../messages?limit=20` |
| 3 | `useQuery` templates → `GET /templates?conversationId=` |
| 4 | `POST /conversations/read` (mark read, debounced in thread) |
| 5 | `GET .../readers` (ChatHeader) |
| 6 | Optional: `GET .../preferences` (Composer translation) |
| 7 | CRM panel open → `GET .../shared-properties`, labels |

### History pagination
- 20 messages initial; `beforeMessageId` cursor for older pages (`useMessages.ts`).

### Media
- **Lazy:** `mediaUrl` in message documents; images load in `MessageBubble` via URL, not in list API.

### Payload (100+ messages)
- Full message documents per page (content object, metadata). 5 pages ≈ 100 messages in RQ cache.  
- **NEEDS RUNTIME VERIFICATION:** average JSON size per message with media metadata.

### Switching conversations
- React Query caches per `conversationId` key (`gcTime` 10 min). Switching back uses cache if not stale (2 min).

---

## SECTION 7: Real-time / Socket Analysis

See Section 3c for event table.

**Debouncing:**
- `whatsapp-conversation-update` → 300ms → `invalidateWhatsAppConversationsList` (`whatsapp.tsx` ~2341).
- New message list patches → `requestAnimationFrame` batch (~1795).
- Search debounce 300ms (list + unified search).

**Re-render scope:**
- List patches go through `mutateWhatsAppConversationsListCache` — updates flat list in RQ cache; **sidebar container** re-renders on context value change.
- `ConversationItem` is `React.memo` with custom comparator — row-level skip if props equal.
- `whatsapp.tsx` shell still large; socket handlers use refs for thread actions to avoid stale closures.

**Cleanup:**
- Effect 1: `off whatsapp-new-message`, `leave-whatsapp-retarget`.
- Effect 2: clears conv update timer, `leave-whatsapp-room`, `off` all listeners.
- **Gap:** `join-whatsapp-room` in effect 1, `leave` in effect 2 — split across effects.

---

## SECTION 8: Notification Center & Summary Widget

### `WhatsAppNotifications` (`src/components/whatsapp/WhatsAppNotifications.tsx`)

| Property | Value |
|----------|-------|
| Endpoint | `GET /api/whatsapp/notifications/summary` |
| Mount | All `/dashboard/*` routes (not `/whatsapp` inbox) |
| Roles | SuperAdmin, Sales-TeamLead, Sales |
| staleTime | 60s |
| Polling | Off on `/whatsapp`; 5 min if socket connected else 2 min |
| Socket | Updates `["whatsappSummary"]` cache on new message; refetch on conversation-update |
| Over-fetch | Server loads **all** visible conversations for unread + 24h expiring window (`notifications/summary/route.ts` ~130) — heavy for badge |

### `SystemNotificationToast`

| Property | Value |
|----------|-------|
| Archive | `GET /conversations/archive?idsOnly=true` once on mount (per user with access) |
| Polling | 500ms internal queue UI tick; not a WhatsApp API poll |
| Socket | Full WhatsApp message pipeline via `whatsappNotificationController` |
| Dashboard scope | All dashboard routes |

**Duplicate:** Archive ids fetched in both `ConversationListContext` (inbox mount) and `SystemNotificationToast` (dashboard mount) — same lightweight endpoint, different sessions/routes.

---

## SECTION 9: Template Management

| Aspect | Behavior |
|--------|----------|
| Fetch timing | When conversation selected (`ActiveThreadContext` `enabled: Boolean(templatesCacheKey && selectedConversationId)`) |
| Cache | React Query key `["whatsappTemplates", templatesCacheKey]` — 10m stale |
| Volume | Meta API — typically tens per WABA; filtered client-side by rental type / conversation type |
| Template-only mode | 24h window closed → composer searches templates locally + `TemplateDialog` |
| On send | `POST /send-template`; optimistic list update via socket echo/new-message handlers; no full list refetch required |

---

## SECTION 10: Duplicate & Redundant Request Report

| Endpoint / data | Fetched N times | Components | Why redundant | Can dedup? |
|-----------------|-----------------|------------|---------------|------------|
| `/conversations/archive?idsOnly=true` | 2+ | `ConversationListContext`, `SystemNotificationToast` | Same ids for filter | Yes — shared RQ query |
| `/notifications/summary` vs inbox unread | 2 | Dashboard bell vs inbox counts | Overlapping unread concept | Partial — summary scans all convs |
| Full list invalidate on `conversation-update` | Many | `whatsapp.tsx` | Patch often sufficient | Yes — prefer patch (partially done) |
| `phone-configs` | 1 per session | `ActiveThreadContext` | Needed for send | OK |
| Readers + read POST | 2 | ChatHeader + ActiveThread | Both on open | Could coalesce |
| Guest stats on every list page | Each GET /conversations | Server enrichment | Only guests need it | Lazy per row |
| SuperAdmin location default | 2 list fetches | URL sync effect | First fetch without filter then with Athens | Defer first fetch until URL ready |

---

## SECTION 11: N+1 Query Patterns

| Pattern | Location | Severity |
|---------|----------|----------|
| Unread count per conversation | **Mitigated** — `batchComputeUnreadCounts` in `conversationsListEnrichment.ts` | Low on list page |
| Unread inbox filter aggregation | `inboxUnreadQuery.ts` — `$lookup` read state per candidate before limit | **NEEDS RUNTIME VERIFICATION** at scale |
| Notifications summary | Loads **all** active conversations then batch unread (`summary/route.ts`) | **High** for dashboard bell |
| Lead profile pics | **Batched** — one `Query.find` per page | Low |
| Template type inference | **Batched** aggregation on page | Low |
| Message thread | Single query per page, no per-message fetches | Low |
| CRM shared-properties | On panel open only | Low |

**No client-side loop** calling API per conversation row on initial load.

---

## SECTION 12: Payload Size Analysis

### `GET /conversations` per conversation (enriched)

Typical fields returned: `_id`, `participantPhone`, `participantName`, `participantProfilePic`, `lastMessage*`, `unreadCount`, `conversationType`, `rentalType`, `labels`, `businessPhoneId`, `source`, archive flags, guest stats (`listingLinkSentCount`, `optionsSentCount`), `lastCustomerMessageAt*`, mask-applied phone.

**Not included:** Full message history, media binary, all lead fields.

**List preview:** `lastMessageContent` string only (truncated display server-side).

### Estimates (NEEDS RUNTIME VERIFICATION)

| Conversations | Est. page JSON (25 rows) |
|---------------|-------------------------|
| 50 total (2 pages) | ~50–150 KB |
| 100 | ~50–150 KB per page |
| 500 | Same per page (pagination); 20 pages total |

Counts object adds `totalCount`, `ownerCount`, `guestCount`, `unreadCount` on every response.

---

## SECTION 13: Re-render Analysis

| Area | Behavior |
|------|----------|
| Conversation list | Context update → sidebar re-render; **rows memoized** (`ConversationItem.tsx` memo ~307) |
| Virtualization | Sidebar: always virtual (`ConversationSidebar.tsx` ~449). Messages: virtual if ≥30 groups (`MessageList.tsx` ~1336) |
| New socket message | `patchConversationsList` / `repositionConversationAfterUpdate` — targeted cache mutate |
| Unread badge | `counts.unreadCount` on first page + `syncWhatsAppInboxUnreadCountAcrossFilters` |
| `ConversationSidebar` | **Not memoized** — re-renders with parent |
| `MessageList` | Not memoized; `MessageBubble` memoized (~538) |
| `whatsapp.tsx` shell | Still monolithic; containers reduce subtree churn |

---

## SECTION 14: Root Causes of Slow Initial Load

| Rank | Cause | Category | Est. impact |
|------|-------|----------|-------------|
| 1 | Large `whatsapp.tsx` dynamic chunk + provider tree | Rendering / bundle | High — NEEDS RUNTIME VERIFICATION |
| 2 | Server enrichment waterfall after DB page match (read states, unread batch, pics, guest stats, You conv) | Waterfall | High |
| 3 | Unread count aggregation on every list request (`aggregateUnreadInboxConversationCount`) | Data fetching | Medium–High at scale |
| 4 | SuperAdmin double-fetch (default Athens location URL sync) | Duplicate fetch | Medium |
| 5 | Archive ids prefetch + parallel first conversation fetch | Data fetching | Low–Medium |
| 6 | `dynamic()` skeleton until shell hydrates | Perceived latency | Medium |
| 7 | Notifications summary (dashboard only) scans all conversations | N+1 / payload | High on dashboard, not inbox route |

---

## SECTION 15: Prioritized Fix Recommendations

| Priority | Fix | Expected improvement | Effort | Risk |
|----------|-----|---------------------|--------|------|
| P0 | Split `whatsapp.tsx` — move socket + send to hooks/modules (bundle ↓) | Faster TTI / hydration | High | Medium |
| P0 | Cache unread total separately (lightweight endpoint or materialized count) — don’t run full aggregation every list GET | List API latency ↓ | Medium | Medium |
| P1 | Defer guest stats + lead profile enrichment to optional pass or lazy row | Server response ↓ | Medium | Low |
| P1 | SuperAdmin: resolve URL defaults before first `useConversationsList` fetch | Remove duplicate fetch | Low | Low |
| P1 | Share `archive?idsOnly` via React Query between toast + list context | −1 request | Low | Low |
| P2 | Narrow `notifications/summary` to indexed query / precomputed counters | Dashboard CPU ↓ | Medium | Medium |
| P2 | Memo `ConversationSidebar` or split filter bar from list | Fewer re-renders | Low | Low |
| P2 | Server: return enrichment fields as optional `?include=` flags | Payload ↓ | Medium | Low |
| P3 | Index audit for unread aggregation pipeline (`lastMessageDirection`, read state lookup) | DB time ↓ | Medium | Low |
| P3 | Prefetch next conversation page on idle (`requestIdleCallback`) | Smoother scroll | Low | Low |
| P3 | MessageList virtualize threshold 30 → 15 | Long thread mount ↓ | Low | Low |
| P3 | Replace full invalidate on conversation-update with patch-only path | Less network | Low | Medium |
| P3 | Coalesce read POST + readers GET | −1 request on open | Low | Low |

---

## SECTION 16: Files Analyzed

| Path | Role |
|------|------|
| `src/app/whatsapp/page.tsx` | Route entry, dynamic load shell |
| `src/app/whatsapp/whatsapp.tsx` | Main client shell, sockets, sends, calls |
| `src/app/whatsapp/context/WhatsAppProviders.tsx` | Provider nesting |
| `src/app/whatsapp/context/ConversationListContext.tsx` | Inbox list state, filters, archive |
| `src/app/whatsapp/context/ActiveThreadContext.tsx` | Thread, messages, templates, read |
| `src/app/whatsapp/context/WhatsAppUIContext.tsx` | Modals and call UI state |
| `src/app/whatsapp/containers/ConversationSidebarContainer.tsx` | Sidebar render isolation |
| `src/app/whatsapp/containers/MessageThreadContainer.tsx` | Thread render isolation |
| `src/app/whatsapp/components/ConversationSidebar.tsx` | Virtualized list UI |
| `src/app/whatsapp/components/ConversationItem.tsx` | Memoized row |
| `src/app/whatsapp/components/MessageList.tsx` | Grouped virtualized messages |
| `src/app/whatsapp/components/MessageComposer.tsx` | Input bar |
| `src/app/whatsapp/components/ChatHeader.tsx` | Thread header |
| `src/app/whatsapp/hooks/useConversationsList.ts` | RQ infinite conversations |
| `src/app/whatsapp/hooks/useMessages.ts` | RQ infinite messages |
| `src/app/whatsapp/hooks/useUnifiedWhatsAppSearch.ts` | Debounced search |
| `src/app/whatsapp/hooks/useInitiationLimit.ts` | Guest initiation limit |
| `src/app/whatsapp/lib/whatsappQueryCache.ts` | RQ cache mutators |
| `src/app/whatsapp/lib/conversationListUpdates.ts` | Localized list updates |
| `src/app/api/whatsapp/conversations/route.ts` | Main inbox API |
| `src/app/api/whatsapp/conversations/[conversationId]/messages/route.ts` | Messages API |
| `src/app/api/whatsapp/notifications/summary/route.ts` | Dashboard summary |
| `src/lib/whatsapp/conversationsListEnrichment.ts` | Batch enrichment |
| `src/lib/whatsapp/inboxUnreadQuery.ts` | Server unread filter/count |
| `src/lib/whatsapp/inboxQuery.ts` | Mongo inbox filters |
| `src/lib/whatsapp/config.ts` | Roles, phone configs |
| `src/components/whatsapp/WhatsAppNotifications.tsx` | Dashboard bell |
| `src/components/Notifications/SystemNotificationToast.tsx` | Toast queue + archive ids |
| `src/app/dashboard/layout.tsx` | Widget mount point |
| `src/hooks/useSocket.ts` | Socket singleton |
| `src/lib/pusher.ts` | Event name constants |

*(Full API route files under `src/app/api/whatsapp/**` — 43 routes — counted in Section 3.)*

---

## Executive Summary

The single highest-impact fix is to **reduce server work on `GET /api/whatsapp/conversations`** by separating the always-on unread total aggregation (`aggregateUnreadInboxConversationCount` + dual `buildInboxListQueryAsync`) and deferring non-critical per-page enrichment (guest outbound stats, lead profile pictures, “You” conversation creation) from the critical path that blocks the first paint of the conversation list. That directly targets the main user complaint (slow list appearance) without requiring a architectural rewrite, and it pairs well with a follow-up bundle split of `whatsapp.tsx` for faster client hydration.
