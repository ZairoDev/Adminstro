# WhatsApp inbox search — reliability report

Date: 9 October 2026

Scope: the primary search box on `/whatsapp` (“Search by name, phone or message”), the Chats results under it, the in-thread message search, and the sales-team location / rental / property-type rules that decide whether a chat is even allowed into that search.

Example used throughout: contact saved as **Zaid**, phone **9598023492**.

This is a code-path report. It explains why the same query can succeed for one account and return nothing for another, and why it feels slow even when it does return.

---

## What users actually hit

The sidebar does not filter the chats already on screen. Every keystroke (after 300ms) calls:

`GET /api/whatsapp/search/unified?query=...`

That handler is `src/app/api/whatsapp/search/unified/route.ts`. The client hook is `src/app/whatsapp/hooks/useUnifiedWhatsAppSearch.ts`.

If the server answers with an error, a timeout, or `{ success: false }`, the hook sets results to `null`. The UI then shows **“No results found”**. A failed search and a real miss look the same. That is why it feels random: sometimes the query finishes, sometimes it dies and the screen says the contact does not exist.

---

## 1. Search never looks at the whole inbox

This is the main break.

The aggregation does this, in order:

1. Match chats the user is allowed to see (`status` active or pending, not internal).
2. **`$limit: 500` — stop after 500 conversations.**
3. Only then test name, phone, notes, and messages.

The limit sits in `src/app/api/whatsapp/search/unified/route.ts` before any search condition. There is no sort before it. MongoDB returns whichever 500 documents the chosen index happens to walk first. That set is not “the 500 best matches” and it is not “the 500 newest chats” unless the planner happens to use the recency index.

Consequences for Zaid / 9598023492:

- If that conversation is inside those 500, both the name and the number can match.
- If it is outside those 500, **neither** matches, even though the chat is in the inbox and can be opened by scrolling.
- Which 500 you get depends on role, allotted cities, rental type, channel, and which index Mongo picks that moment. Two people searching the same text are not searching the same chats.
- A new chat inserted into the collection can push an older one out of the window. Yesterday’s search works, today’s does not, with no data change on that contact.

Why it works on an admin account and fails for sales:

- Full-access roles (SuperAdmin, Admin, Developer) use an empty visibility filter. The planner can walk `{ status, lastMessageTime }`, so the 500 rows are often the recently active ones. A contact you just opened is inside that window, so your test passes.
- A Sales user does not get that filter. Their first stage is “business phone is one of my lines **and** participant city is one of my allotted areas”, plus rental type and channel type. The city check is an `$expr` (`$toLower` / `$trim`), which cannot use the location index. Mongo then takes 500 rows off a phone-id scan in storage order, not by recency. Zaid can be visible in their scrolled inbox and still be absent from search.

The inbox list itself does not have this cap. It pages by `lastMessageTime`. Search and the list are not the same dataset.

---

## 2. Why it is slow, and why slowness becomes “not found”

After the 500-row cut, the pipeline runs a `$lookup` into `whatsappmessages` **for every one of those 500 chats**, with a case-insensitive regex on `content.text` and `content.caption`. That happens even when the user typed a phone number or a name. Message search is not a second step. It is part of every query.

There is no text index on message body. Each lookup is a regex scan of that conversation’s messages.

Then the handler races the aggregation against a **3 second** timer (`SEARCH_TIMEOUT`). On timeout it returns HTTP 500, `"Search timeout"`. The aggregation is not cancelled, so the heavy query keeps running. The next keystroke starts another one. Several sales users searching at once stack these scans. The next request is more likely to hit the same 3 second wall.

The client treats that 500 as an empty result. The spinner stops. The copy says nothing was found.

`allowDiskUse(false)` makes a large in-memory sort fail the same way instead of spilling to disk.

A search-result cache exists in `src/lib/whatsapp/searchUtils.ts` (`SearchCache`, 60 seconds). The unified route never reads it. It does not help, and it should not be turned on as-is: it is process-local and not scoped in a way that is safe across users.

`includeArchived` and `limit` are accepted by the hook and ignored. They are never sent. Archived chats are never searchable, including while the archive view is open.

---

## 3. Phone search is not a real phone match

Stored numbers are digits only, via `normalizePhone()` in `src/lib/whatsapp/normalizePhone.ts`. WhatsApp usually stores the country code, so Zaid is typically `919598023492`, not `9598023492`.

The search route does **not** use that normalizer, and it does not use `normalizePhoneForDeduplication()` (which strips a leading `91` when the rest is 10 digits). It uses a weaker helper that only deletes non-digits.

For a query that is “mostly digits” (`isPhoneQuery`: more than half the characters are digits):

| What the user types | What is compared | Result against stored `919598023492` |
| --- | --- | --- |
| `9598023492` | exact equality | Miss. Stored value is longer. |
| `9598023492` | suffix / contains regex | Hit, **only if** that chat is inside the 500. |
| `919598023492` | exact equality | Hit, only if inside the 500. |
| `+91 95980 23492` | digits `919598023492` | Same as the row above. |
| `919598023492` when an older row was saved as `9598023492` | exact, suffix, and contains | All miss. The query is longer than the stored value, so “ends with” cannot succeed. |

So the same person is found or missed depending on whether the agent included `91`, whether that row was saved with `91`, and whether the row survived the 500 cut. That is the “name sometimes, number sometimes” report. Name and number are also not the same test: a name match needs `participantName` to contain the text; a number match needs the digit pattern above. One can succeed while the other fails even inside the 500.

Other phone gaps:

- The regex is applied to the raw stored string. It is not matched on a normalized digit field. Any historical row with spaces, a plus, or a doubled `91` (`9191…`) will not suffix-match a clean 10-digit query. `normalizePhone` only fixes `9191` + length 14 at write time. Old rows are untouched.
- The phone regex is not escaped. A query that is still “mostly digits” but contains a regex character can throw. That throw becomes “No results found”.
- There is an index on `participantPhone`, but exact `$eq` only helps when the typed digits equal the stored digits. The useful case (last 10 digits) is an unanchored regex, so the index is not used. Combined with stage 1, the database never seeks Zaid’s number directly.

Phone masking makes this worse for agents who are not full-access. If `maskGuestPhones` or `maskOwnerPhones` is on, the API replaces `participantPhone` in the **response** with a mask such as `******3492` (`src/lib/whatsapp/phoneMask.ts`). Search itself still runs on the real number, but:

- The agent cannot see the full number, so they cannot type `9598023492`.
- Typing the masked text is not treated as a phone (`******3492` is only 40% digits). It is searched as a name/message string and will not match.
- Typing the visible tail `3492` is a phone suffix. It matches every number ending in 3492 that happens to sit in the 500, which is both incomplete and ambiguous.
- If the chat is not already loaded in the sidebar, opening the hit builds the thread from the search payload. That payload’s phone is the mask, not `919598023492`. The opened chat is a thin object (no business line, no city). Send, call, and identity checks then depend on a fake number.

Full-access accounts are never masked, so this path never shows up in an admin test.

---

## 4. Name search only sees `participantName`, inside those 500

“zaid” is a case-insensitive regex on `participantName` and on `notes`. It does not use a text index. `participantName` is not indexed for prefix search.

The regex is the raw query, not escaped. `zaid` is fine. A parenthesis, `+`, or a trailing `\` (easy when pasting a number that still has formatting, or a name like `Zaid (guest)`) can make Mongo reject the regex. Again the UI says there are no results.

Notes are included in the score but the pipeline never returns the notes text, only a flag. A notes-only hit is easy to misread.

Message text is a third, separate match. “zaid” can show up under **Chats** because some other loaded conversation mentioned the word, while **People** stays empty because Zaid’s own row was outside the 500. Agents describe that as “the name works sometimes”.

---

## 5. Chat search does not stay working

There are two different “chat searches”, and neither searches the thread on the server.

### Sidebar → Chats

Message hits come from that same 500-conversation lookup, capped at 10 messages per chat and 3 shown. Anything older, or any chat outside the 500, is invisible. The section is empty whenever the aggregation times out.

Clicking a message hit is supposed to open the chat and scroll to that message. It does not, unless both of these are already true:

1. The conversation is already in the **currently loaded inbox page** (the container’s jump handler ignores search-only hits — `ConversationSidebarContainer.tsx`).
2. The message is already in the **latest 20 messages** downloaded for that thread (`useMessages.ts` pages with `limit=20`).

`MessageList` scrolls only if the id is already in memory. About 100ms later it clears the pending scroll **even when the element was not found**. The jump is dropped. The user lands on the bottom of the chat, not on the match. The next attempt fails the same way. That is “chat search is not permanently working”.

### Search box inside the open chat

`ChatHeader` filters `messages` in the browser (`displayText` contains the query). It does not call the API. Unloaded history is excluded. Media captions only count if they are already in the loaded page. The filter **removes** non-matching rows, so the thread looks empty or broken instead of highlighting a hit inside the full history.

Sidebar search and this in-thread filter are only loosely connected. The in-thread query is set when a Chats jump succeeds. When the jump is skipped (chat not on the current page), the thread search never receives the term.

---

## 6. Sales location and rules hide chats before search starts

Search uses `buildConversationVisibilityFilterAsync` plus `applyInboxLocationFilter`. The inbox list adds extra rules the search route never adds. A chat can be on screen and still be illegal for search, or the reverse. Opening a search hit can then 403.

Rules that remove Zaid from a sales user’s search even when an admin can find him:

### Allotted city

Visibility is phone line **and** participant city (`src/lib/whatsapp/locationAccess.ts`). `assignedAgent` is not used. Ownership does not grant search access.

If `participantLocationKey` is empty, a Sales / sales-intern / Sales-TeamLead / LeadGen user who **has** allotted areas does not see the chat. An admin does, because full-access skips the city check. This is the clearest “I can search it, they cannot” case: the contact was never given a city, or the city was cleared.

Matching is lowercase-trimmed on both `participantLocationKey` and `participantLocation`. A display name that does not normalize to the same key as `allotedArea` (spelling, extra space stored only on one side, “Athens” vs a custom label) drops the chat for that agent only.

The city dropdown is a second filter on top. It is shown for SuperAdmin, LeadGen-TeamLead, and anyone with two or more allotted cities. Search sends the **display name**. The API writes `participantLocationKey` to the normalized key with exact equality. If the stored key and that normalized dropdown value differ, search returns nothing while “All my locations” still lists the chat.

`sales-intern` is allowed to see unallocated chats when they have **no** areas, but they are **not** in `CITY_TEAM_ASSIGN_ROLES` (`participantLocationPrivileges.ts`). They cannot set the city. A chat they work stays without a key. The moment HR assigns them cities, that chat disappears from their inbox and from search.

Areas come from the JWT (`allotedArea` on the token). A city change in the employee record does not change search until the token is refreshed. Two agents with the “same” job can search different city sets.

### Rental type

Employees with no rental type are treated as **Long Term**. Short Term guest chats are hidden from them. `sales-intern` is the exception and sees both. Admin accounts bypass this. A Long Term sales agent will never search-find a Short Term Zaid. An admin will.

Legacy chats with no rental type stay visible. After a backfill, the same chat can vanish for part of the team.

### Channel type

Sales, sales-intern, and Sales-TeamLead are mapped to **guest** channels, with an extra allowance for `conversationType: "owner"`. Support chats are hidden. LeadGen also sees support. Admin sees all. A support thread an admin can search is invisible to sales.

### Guest property-type rules

`withGuestPropertyTypeClause` runs inside the async visibility filter, so it applies to search. For each allotted city, guest chats whose lead `typeOfProperty` is outside that employee’s allow-list are excluded by `participantPhone: { $nin: [...] }`.

The exclusion list is built from lead `phoneNo` passed through `normalizePhone`. The conversation stores the same helper’s output only if it was written that way. If the lead is `9598023492` and the chat is `919598023492`, `$nin` does not hit, and the rule **fails open** (the chat stays). If both sides share one format, the rule **hides** the chat. The same property-type setup therefore hides Zaid for one agent’s data and not another’s. Untyped leads stay visible. That is why the rule feels inconsistent rather than simply strict.

Admin and other bypass roles skip the rule entirely.

### Handoff and retarget — search does not use the inbox rules

The inbox query (`buildInboxListQueryAsync`) also enforces:

- Sales do not see LeadGen-owned chats (`handedToSales: false`) until they are forwarded.
- Plain LeadGen only sees chats they still own.
- Sales do not see retarget threads unless `retargetStage` is `handed_to_sales`.
- Advert only sees retarget threads, and the search route only lets Advert call search when the query looks like a phone. A name search returns 403, which the UI shows as no results.

The unified search route does **not** apply the handoff or retarget clauses. Effects:

- Sales search can return a LeadGen-owned or not-yet-handed retarget chat that is not in their inbox. Opening it is then forbidden (`canAccessByLeadGenHandoff` / retarget checks in `src/lib/whatsapp/access.ts`).
- The opposite also happens: a chat the inbox shows is still subject to the 500-row cut, so search misses it.

`Sales-TeamLead` is in the handoff ownership list but is **not** in `isSalesWhatsAppRole`, so the retarget-stage inbox clause does not apply to team leads. `Subscription-Sales` is treated as sales for retarget and handoff, but is **not** in `WHATSAPP_ACCESS_ROLES`, so the search route rejects them with “No WhatsApp access”.

### Admin queue

Chats with no city are the admin queue. Search has no `adminQueue` flag. Those chats are included for full-access users (they see everything) and excluded for allotted sales users. Searching from the admin-queue banner still runs the normal visibility filter.

---

## 7. Client behavior that makes a good result look broken

- Debounce is 300ms, then the previous request is aborted. A slow server plus fast typing means the request that would have succeeded is cancelled, and the one that times out is the one that paints “No results”.
- Abort leaves `loading` true until a newer request finishes. If the newer one errors, results are cleared. There is no error message.
- `clearSearch()` does not clear `lastQueryRef`. Changing the city filter re-runs the previous query in the background even after the box was emptied.
- Choosing a person from results clears the box immediately, then builds a conversation from the search row if that chat is not in the loaded page. That row is missing fields the thread expects, and may contain a masked phone (section 3).

---

## What is actually broken (short list)

1. Search is capped at 500 conversations **before** the name or number is applied, with no relevance sort. Most of the inbox is never tested.
2. Every search regex-scans messages for those 500 chats and is killed at 3 seconds. The UI reports that as “not found”.
3. Phone match does not treat `9598023492` and `919598023492` as the same number. Exact match only works when the typed digits equal the stored digits.
4. Name match is an unindexed, unescaped regex on `participantName` inside that same 500.
5. In-chat search only filters messages already downloaded (20 at a time) and does not load the matching page. Jump-to-message gives up if the chat is not on the current inbox page or the message is not in the latest 20.
6. Sales visibility (city, rental type, channel, property-type allow-list, masked phones) runs before search and is stricter than an admin account. Empty city, Long Term vs Short Term, and phone-format mismatches in the property-type rule make the same contact available to one user and invisible to another.
7. Search does not apply the inbox handoff and retarget rules, so some hits cannot be opened, while other visible chats are still lost to the 500-row cut.
8. Failures are shown as an empty result, so the team cannot tell a miss from an error.

---

## What should replace this

These are the changes that make the primary search stable. They are ordered by how much of the “sometimes works” behavior each one removes.

1. **Match first, then limit.** The first `$match` should include the search predicate, then sort by relevance / `lastMessageTime`, then limit to 50. Delete the `$limit: 500` that runs before matching. One person named Zaid must be found whether they messaged today or last year, as long as the visibility rules allow that user to see them.

2. **Store and index a canonical phone.** Keep `participantPhone` as digits. Also store `phoneLast10` (and search that with equality, not regex). Query normalization should go through `normalizePhone()` and then compare both the full digits and the last 10. `9598023492`, `919598023492`, and `+91 95980 23492` must hit the same row. Backfill old rows that still contain spaces or a doubled country code.

3. **Split message search from contact search.** Name and phone should be one indexed query on the conversation collection and should return in well under a second. Message search should be a separate query (text index on `content.text` / `content.caption`, or a bounded recent-message scan) and should be allowed to be slower. Do not `$lookup` messages for hundreds of chats on every keystroke.

4. **Return a real error.** If the query times out, respond with a timeout flag and keep any partial hits. The client should say the search did not finish, not “No results found”. Cancel or ignore the Mongo cursor when the HTTP request is aborted so sales traffic does not pile up.

5. **Use the same visibility function as the inbox.** Call the same builder the list uses, including LeadGen handoff and the sales retarget stage, then add the text predicate. A chat that is on screen must be searchable. A chat the user is not allowed to open must not appear. Align `Sales-TeamLead` and `Subscription-Sales` with the role lists so team leads and subscription sales are not special cases.

6. **In-thread search must ask the server.** Given a conversation id and a string, return matching message ids with a cursor. The thread should load the page that contains the chosen id and scroll to it. Do not clear the pending scroll until the element is actually on screen. Do not hide the rest of the thread; highlight the hit.

7. **Mask after open, not inside the identity.** Search responses can hide the number in the label, but the conversation id must be what gets opened, loaded from the conversation API, not from a masked search DTO. Agents who only see the last four digits need a server-side search; they cannot be expected to type a number they are not shown. A last-4 query should stay on the server and should not be answered from a 500-row sample.

8. **Make the city rule explain a miss.** Empty `participantLocationKey` will keep hiding the chat from allotted sales until someone sets a city. `sales-intern` needs to be able to set that city, or unassigned chats they already have must stay visible after areas are added. Property-type exclusion must compare phones with the same normalizer as the conversation (`phoneLast10`), otherwise the rule hides a different set of chats than the one the business thinks it configured.

Until item 1 and item 2 are in place, retesting on an admin account will keep passing while sales keeps missing the same Zaid.
