# Fix: search the whole inbox, then limit

Date: 9 October 2026

This is the implementation guide for **issue 1** in `docs/whatsapp-search-reliability-report.md` (lines 25–52).

Issue 1 is: the primary search on `/whatsapp` only tests name, phone, and notes on **500 conversations chosen before the query is applied**. Zaid can be in the inbox and still be missing from search. An admin often still finds him, because those 500 rows are frequently the recently active chats. A sales user gets a different 500, so the same search fails.

Do this change in one pass. Do not only delete `$limit: 500`.

---

## The problem, in one sentence

`src/app/api/whatsapp/search/unified/route.ts` cuts the inbox to 500 rows, and only after that cut does it ask “does this row match the text the user typed?”

Current order:

1. Keep chats this user is allowed to see.
2. Stop at 500. No sort. Whichever index Mongo walks decides the 500.
3. Test `participantName`, `participantPhone`, notes, and messages on that slice.
4. Sort the matches and return at most 50.

The “return at most 50” limit at the end is fine. The “stop at 500 before matching” limit is the bug. Search and the inbox list are not the same set of chats. The list pages by `lastMessageTime` and can scroll to Zaid. Search never sees him if he was not in that slice.

---

## What you must not do

| Change | Why it fails |
| --- | --- |
| Delete `$limit: 500` and leave the rest of the pipeline | The message `$lookup` then runs a regex over messages for **every** visible chat. Search gets slower and hits the 3 second timeout. The UI shows “No results found”. |
| Raise 500 to 2000 or 5000 | The miss becomes rarer and the timeout becomes more common. Old chats are still outside the window. |
| Sort by `lastMessageTime` and then take 500 | Search only finds recent chats. A contact from last month is still invisible. |
| Filter the chats already loaded in the sidebar | The sidebar is one page of the inbox. That repeats the same bug in the browser. |

The limit of 50 at the **end** stays. It means “show 50 matches”, not “only look at 50 chats”.

---

## The correct order

```
visibility filter          (same rules as today: city, phone line, rental, channel)
AND
name / phone / notes       (the actual search)
        ↓
score those matches
        ↓
sort by score, then lastMessageTime
        ↓
limit 50                   (results to display)
        ↓
lookup messages            (only those 50, for the Chats snippets)
```

Name and phone are tested on every chat the user is allowed to see. The 50 cap happens after a match exists. Message lookup does not run on the rest of the inbox.

Phone lookup must use the existing `participantPhone` index, not a “contains” regex. Stored numbers are digits and usually include `91`, so `9598023492` is stored as `919598023492`. Search has to ask for both strings with `$in`. That is an equality match. Mongo can seek it. A suffix regex cannot use that index, and it is what makes phone search feel random today.

---

## Files to change

| File | What changes |
| --- | --- |
| `src/lib/whatsapp/searchUtils.ts` | Add one function that builds the name / phone / notes clause. |
| `src/app/api/whatsapp/search/unified/route.ts` | Put that clause in the first `$match`. Remove the early `$limit: 500`. Move the message `$lookup` to after the result limit. |

No React change is required for this fix. The sidebar already calls `GET /api/whatsapp/search/unified?query=...`.

Do not edit location rules, phone masking, or in-thread search in this change. Those are later issues. They are listed at the bottom so a retest is not mistaken for a full fix.

---

## Step 1 — Add the search clause

Open `src/lib/whatsapp/searchUtils.ts`.

At the top, import the canonical phone normalizer. It strips non-digits and fixes a doubled `91`:

```ts
import { normalizePhone } from "@/lib/whatsapp/normalizePhone";
```

`escapeRegex` and `isPhoneQuery` are already in this file. Add this function next to `isPhoneQuery`:

```ts
/**
 * Name / phone / notes predicate for inbox search.
 * Must be ANDed with the visibility filter, never written on top of its $or.
 *
 * Phone uses equality candidates so 9598023492 and 919598023492 hit the
 * participantPhone index. Short digit fragments stay a suffix match.
 */
export function buildInboxContactSearchClause(
  rawQuery: string,
): Record<string, unknown> {
  const query = rawQuery.trim();
  const escaped = escapeRegex(query);
  const textMatches: Record<string, unknown>[] = [
    { participantName: { $regex: escaped, $options: "i" } },
    { notes: { $regex: escaped, $options: "i" } },
  ];

  if (!isPhoneQuery(query)) {
    return { $or: textMatches };
  }

  const digits = normalizePhone(query);
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const phones = new Set<string>();
  if (digits) phones.add(digits);
  if (last10) phones.add(last10);
  if (last10.length === 10) phones.add(`91${last10}`);

  const phoneMatch: Record<string, unknown> =
    digits.length >= 10
      ? { participantPhone: { $in: [...phones] } }
      : { participantPhone: { $regex: `${escapeRegex(digits)}$` } };

  return { $or: [phoneMatch, ...textMatches] };
}
```

What this function does for the example:

| Typed | Clause |
| --- | --- |
| `zaid` | `participantName` or `notes` contains `zaid`, case-insensitive. The regex is escaped, so `Zaid (guest)` cannot throw. |
| `9598023492` | `participantPhone` is exactly `9598023492` **or** `919598023492`. |
| `919598023492` | Same two strings, plus the typed value itself. |
| `+91 95980 23492` | `normalizePhone` reduces it to `919598023492`, then the same `$in`. |
| `23492` (5 digits, still “mostly digits”) | Suffix regex. This cannot use the index. It is only for incomplete numbers. It still runs on the whole allowed inbox, not on 500 rows. |

A one-letter name is legal today and would sort a huge set. In the route (next step), reject queries shorter than 2 characters.

---

## Step 2 — Change the aggregation

Open `src/app/api/whatsapp/search/unified/route.ts`.

### 2a. Import the new function

Replace the searchUtils import with:

```ts
import {
  buildInboxContactSearchClause,
  isPhoneQuery,
  escapeRegex,
} from "@/lib/whatsapp/searchUtils";
```

You can leave `normalizePhoneNumber` imported only if something else in the file still uses it. After this edit, the route should use `buildInboxContactSearchClause` instead.

`calculateUnifiedRelevanceScore` and `normalizePhoneForDeduplication` are imported and unused. Remove them from the import so the file stays honest. Do not start using the in-memory `searchCache` from that file. It is per process and not safe to share across users.

### 2b. Build the clause after the visibility filter

Today, around the “prepare search parameters” block, the route does:

```ts
const normalizedQuery = query.trim();
const isPhone = isPhoneQuery(normalizedQuery);
const normalizedPhone = isPhone ? normalizePhoneNumber(normalizedQuery) : null;
```

Keep `normalizedQuery` and `isPhone`. Add:

```ts
if (normalizedQuery.length < 2) {
  return NextResponse.json(
    { success: false, error: "Type at least 2 characters" },
    { status: 400 },
  );
}

const contactClause = buildInboxContactSearchClause(normalizedQuery);
```

Keep building `permissionMatch` exactly as it is now (`buildConversationVisibilityFilterAsync`, status, source, `applyInboxLocationFilter`, archived). That object is the “who may see this chat” half. Do not put the search `$or` onto it. Visibility already has its own `$or` (phone line or channel). Assigning `permissionMatch.$or = ...` would wipe the city and phone rules and leak other cities’ chats.

Combine them like this:

```ts
const searchMatch = {
  $and: [permissionMatch, contactClause],
};
```

### 2c. Replace the pipeline stages

Delete these stages:

- Stage 2, the early limit:

```ts
{ $limit: 500 }
```

- Stage 5, the “drop rows with no matches” `$match`. The first `$match` already did that for name, phone, and notes.

Move Stage 4 (the `$lookup` into `whatsappmessages`) so it runs **after** `$sort` and **after** `{ $limit: limit }`.

The pipeline becomes:

```ts
const phoneDigits = isPhone
  ? normalizedQuery.replace(/\D/g, "")
  : "";
const phoneLast10 =
  phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;
const escapedQuery = escapeRegex(normalizedQuery);

const pipeline: Record<string, unknown>[] = [
  // Every chat this user may see AND that matches the typed name/phone/notes.
  { $match: searchMatch },

  {
    $addFields: {
      phoneExactMatch: isPhone
        ? { $eq: ["$participantPhone", phoneDigits] }
        : false,
      phoneSuffixMatch: isPhone
        ? {
            $regexMatch: {
              input: "$participantPhone",
              regex: `${escapeRegex(phoneLast10)}$`,
            },
          }
        : false,
      nameMatch: {
        $regexMatch: {
          input: { $ifNull: ["$participantName", ""] },
          regex: escapedQuery,
          options: "i",
        },
      },
      notesMatch: {
        $regexMatch: {
          input: { $ifNull: ["$notes", ""] },
          regex: escapedQuery,
          options: "i",
        },
      },
    },
  },

  {
    $addFields: {
      relevanceScore: {
        $add: [
          { $cond: [{ $eq: ["$phoneExactMatch", true] }, 100, 0] },
          {
            $cond: [
              {
                $and: [
                  { $eq: ["$phoneExactMatch", false] },
                  { $eq: ["$phoneSuffixMatch", true] },
                ],
              },
              80,
              0,
            ],
          },
          { $cond: [{ $eq: ["$nameMatch", true] }, 40, 0] },
          { $cond: [{ $eq: ["$notesMatch", true] }, 5, 0] },
        ],
      },
    },
  },

  { $sort: { relevanceScore: -1, lastMessageTime: -1 } },

  // 50 results to show. Not 500 chats to consider.
  { $limit: limit },

  // Snippets only. This must not decide who is found.
  {
    $lookup: {
      from: "whatsappmessages",
      let: { convId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$conversationId", "$$convId"] },
            type: { $nin: ["reaction", "system"] },
            $or: [
              { "content.text": { $regex: escapedQuery, $options: "i" } },
              { "content.caption": { $regex: escapedQuery, $options: "i" } },
            ],
          },
        },
        { $sort: { timestamp: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 1,
            content: 1,
            timestamp: 1,
            direction: 1,
            mediaUrl: 1,
          },
        },
      ],
      as: "matchedMessages",
    },
  },

  {
    $project: {
      conversationId: { $toString: "$_id" },
      participantPhone: 1,
      participantName: 1,
      participantProfilePic: 1,
      lastMessageContent: 1,
      lastMessageTime: 1,
      unreadCount: 1,
      conversationType: 1,
      assignedAgent: 1,
      status: 1,
      phoneExactMatch: 1,
      phoneSuffixMatch: 1,
      phoneContainsMatch: { $literal: false },
      nameMatch: 1,
      notesMatch: 1,
      matchedMessages: 1,
      relevanceScore: 1,
      _id: 0,
    },
  },
];
```

Notes on that pipeline:

- `phoneContainsMatch` is forced to false. The old “number appears anywhere inside another number” test is what matched the wrong contact and could not use an index. The response mapper still reads the field, so the project keeps it.
- A 10-digit query that hits `919598023492` gets `phoneSuffixMatch` and score 80. A query that equals the stored string exactly gets score 100. Both return the row.
- `$regexMatch` on `participantName` uses `$ifNull`. A missing name becomes `""` instead of failing the aggregation.
- The lookup still uses a regex, but only for the 50 chats already selected. It fills the **Chats** section for those contacts. It is not how People are found.

Leave the rest of the handler (masking, dedupe, “start new chat”, the JSON response) as it is.

### 2d. Do not widen the timeout to hide a bad plan

Leave `SEARCH_TIMEOUT` at 3000 while you test. A phone search that uses `$in` on `participantPhone` should finish well under that. If a two-letter name on a full-access account still times out, the next step is an index, not a longer timer:

```ts
whatsAppConversationSchema.index(
  { participantName: 1 },
  { name: "wa_participant_name_idx" },
);
```

A normal index does not speed up a case-insensitive “contains” regex. It does not make the query wrong. Add it only if the name scan is actually slow after this change. Do not add a text index in this same change unless you also switch the name clause to `$text`, because a text index does not help `$regex`.

`allowDiskUse(false)` can stay. After the match, the sort is over matching contacts, not over an arbitrary 500 plus their messages. If a very common token (for example `th`) still exceeds the memory limit, set `allowDiskUse(true)` on this aggregate only. That is a safety valve, not the fix.

---

## Step 3 — How to apply it

1. Add `buildInboxContactSearchClause` to `src/lib/whatsapp/searchUtils.ts` (Step 1).
2. Edit only the pipeline section of `src/app/api/whatsapp/search/unified/route.ts` (Step 2). Do not change `ConversationSidebar.tsx` or the hook.
3. Restart the Next.js server so the route is reloaded.
4. Run the checks below on a **sales** account, not only on SuperAdmin. SuperAdmin is the account that already looks fine.

No migration. No new phone field. Existing `participantPhone` values are already digits from `normalizePhone()` on the webhook. `$in` of the 10-digit form and the `91` + 10-digit form covers the Zaid example without a backfill.

Rows that still contain spaces or a plus in `participantPhone` will not match `$in`. Those are old dirty rows. They are not what this issue is. A later backfill can run `normalizePhone` over them. Do not block this fix on that.

---

## Step 4 — How to prove it is fixed

Use a sales user whose inbox is large enough that Zaid is **not** on the first screen. Scroll until you can open that chat in the list. Then search. The list and the search box must agree.

| Check | Pass |
| --- | --- |
| Sales user searches `zaid` | Zaid is under People, even when the chat is far down the inbox. |
| Same user searches `9598023492` | Same chat. |
| Same user searches `919598023492` | Same chat. |
| Same user searches `+91 95980 23492` | Same chat. |
| SuperAdmin searches the same three strings | Same chat. This account was already likely to pass. It is not the proof. |
| A second sales user allotted to a **different** city | Zaid does not appear if his `participantLocationKey` is outside their areas. This fix must not leak chats. |
| Search a contact you have not opened in weeks | Still found. Recency no longer decides whether the row is tested. |
| Response JSON `searchTime` on the phone query | Usually a few hundred milliseconds, not a 3 second error. |
| Type `z` only | API returns 400. The box can show no results for one character. That is intentional. |

Watch the server log while searching. You should not see `Search timeout` for `zaid` or for the phone. If the UI still says “No results found” and the log says timeout, the lookup is still in front of the limit. Re-read Step 2c.

Two sales users with the same cities and the same rental type must both find Zaid. Before this fix they could disagree, because each query walked a different 500.

---

## What is fixed when this is done

- Searching `zaid` tests every conversation that user is allowed to see, not 500 of them.
- Searching `9598023492` finds the row stored as `919598023492`, and the reverse, anywhere in that allowed inbox.
- A new conversation can no longer push an older one out of search. There is no window to fall out of.
- Admin and sales stop searching different slices. They still only see chats their own visibility rules allow, and those rules are unchanged.
- Phone search uses the `participantPhone` index instead of a contains-regex over a random slice, so it stops feeling slow and intermittent.
- The message collection is not scanned for hundreds of unrelated chats on every keystroke. Timeouts that were caused by that scan stop being reported as “Zaid does not exist”.
- A name that contains `(`, `+`, or `\` no longer throws the aggregation and comes back as an empty result.

---

## What this does not fix

Completing this file does not close the rest of the reliability report. Retest only the table above. These will still fail, and they need their own changes:

| Still broken | Why this change leaves it |
| --- | --- |
| A word that appears only inside a message, not in the name or phone | The Chats lookup runs after the 50 contact hits. It no longer searches message text across the inbox. That is deliberate. A real message search is a separate query, not another `$lookup` in front of the limit. |
| In-thread “Search messages…” and jump-to-message | The open chat still filters the 20 messages already downloaded. The jump still gives up if the chat is not on the current inbox page. |
| Sales cannot find a chat that has no city | Empty `participantLocationKey` is still excluded for allotted sales. Admin can still find it. Set a city, or change the location rule in a later change. |
| Long Term sales cannot find a Short Term Zaid | Rental type is unchanged. |
| Property-type allow-list hides some guest phones | Unchanged, and still sensitive to `9598023492` vs `919598023492` inside `$nin`. |
| Search returns a chat the user is then forbidden to open | Handoff and retarget rules are still missing from this route. The inbox applies them. This route does not. |
| Masked numbers (`******3492`) | The agent still cannot see the full number. This fix helps when they type the real digits. It does not teach search to accept the mask. Opening a hit that is not already in the sidebar can still build the thread from the masked payload. |
| “No results found” after a real server error | The hook still turns HTTP 500 into an empty list. This change should stop the timeout. It does not add an error message. |
| Archived chats | The hook never sends `includeArchived=true`. |

If Zaid is still missing after this fix, he is being removed by one of those rules, not by the 500-row cap. Check his `participantLocationKey`, `rentalType`, `channelType` / `conversationType`, and `handedToSales` against that sales user’s allotted areas before changing the pipeline again.
