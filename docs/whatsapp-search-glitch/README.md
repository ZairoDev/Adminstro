# WhatsApp search glitch

The inbox search box and the result panel can disagree. A number that is not in the inbox correctly ends on “No results found”, then deleting one digit paints a row for about a second and that row is replaced by “No results found” again. The text in the box does not change the second time. The panel is showing the answer to an older query.

This is intermittent because it depends on which HTTP response lands last.

## What you see

Example query: `9170939951`.

1. The full number settles on **No results found**. That number is not an exact contact in this inbox, so that answer is right.
2. Backspace once. The box now shows `917093995` (or whichever digit was removed).
3. A contact row appears.
4. About a second later the row is gone and **No results found** is back.
5. The box still shows the shorter number. Nothing asks the server again, so the wrong empty state stays until the next keystroke.

“No results found” is only rendered by `UnifiedSearchResults`. The normal chat list says “No chats found”. The flash is the unified search panel, not the conversation list behind it.

## Where the panel gets its data

| Step | File | What it does |
| --- | --- | --- |
| Keystroke | `src/app/whatsapp/components/ConversationSidebar.tsx` | Writes the input, then calls `search(value)` on every change |
| Debounce and fetch | `src/app/whatsapp/hooks/useUnifiedWhatsAppSearch.ts` | Waits 300ms, then `GET /api/whatsapp/search/unified` |
| Match rules | `src/lib/whatsapp/searchUtils.ts` (`buildInboxContactSearchClause`) | Decides exact phone vs “ends with” |
| Query | `src/app/api/whatsapp/search/unified/route.ts` | Runs that clause inside the inbox visibility filter |
| Paint | `src/app/whatsapp/components/UnifiedSearchResults.tsx` | Spinner while `loading`, otherwise the latest `results` object |

The hook never stores which query a payload belongs to. The panel trusts whatever `results` it was last given, and it compares that to the current input only for highlighting.

There is a second search, and it is not this bug. `ConversationListContext` debounces the same text by another 300ms and sends it as `search` on the inbox list API. While the box is non-empty, the sidebar does not render that list. The list route also matches phones differently (`participantPhone` regex, and it assigns `$or` onto the visibility query). Ignore that path when reproducing this flash.

## Why one deleted digit changes the answer

Phone matching changes strategy at 10 digits. `buildInboxContactSearchClause` does this:

- **10 digits or more:** exact `$in` of the digit string, its last 10 digits, and `91` plus those last 10. For `9170939951` the set is `9170939951` and `919170939951`. A stored number that merely ends with `9170939951` is not included. Name and notes must contain the whole string `9170939951`.
- **9 digits or fewer:** `participantPhone` matches a regex that is anchored only at the end (`917093995$`). Any inbox number that ends with those digits qualifies. Name and notes match if they contain that shorter digit run anywhere.

So `9170939951` and `917093995` are not the same search with one character trimmed. The shorter one is a much wider net. A different contact, or a note that happens to contain those nine digits, is a real server hit. It is not a ghost row invented in the browser.

The aggregation then scores exact and suffix matches, but that scoring runs only on rows that already passed the clause above. For a 10-digit query the suffix score never sees numbers that were excluded by the exact `$in`. `phoneContainsMatch` in the pipeline is hardcoded to `false`, so a phone that contains the digits in the middle is never a phone hit.

That cliff is why the flash is so obvious on this example: the 10-digit request is an empty success, and the 9-digit request often is not.

## Why the row appears and then disappears

Two responses are applied to one piece of React state, and the older one is allowed to win.

`search()` in `useUnifiedWhatsAppSearch` does not cancel the request that is already running. It only clears the 300ms timer, sets `loading` to true, and schedules the next fetch. The in-flight request is aborted later, inside `executeSearch`, after that delay. Until then it can still call `setResults` and `setLoading(false)`.

After `await fetch` and `await response.json()`, the hook writes the payload with no further check:

- it does not look at a request id
- it does not compare `searchQuery` to the string currently in the box
- it does not check `abortController.signal.aborted` before `setResults`

`AbortController` only rejects the fetch if the request is still outstanding. If the body has already arrived, aborting does not throw, and the code still stores that body. The `finally` block skips `setLoading(false)` when the signal is aborted, but the results were already replaced.

Typical overlap when the box goes from `9170939951` to `917093995`:

1. The 10-digit request is in flight, or it is started again before the shorter request is the only one running. Exact `$in` returns `{ conversations: [] }` with `success: true`.
2. The 9-digit request is a suffix/substring search. It returns one or more conversations. The panel paints them. `loading` is false, so they are visible.
3. The 10-digit response is applied second. `setResults` replaces the list with an empty `conversations` array. The panel renders **No results found**.
4. The input is still the 9-digit string. The hook does not send that query again.

The empty paint sticks. That is the severe part. It is not a flicker that corrects itself.

The same hook can start the old query on purpose. An effect calls `executeSearch(lastQueryRef.current)` when location, admin queue, or archived view changes. `lastQueryRef` is updated only when a fetch starts, not when the user types. During the 300ms debounce it still holds the previous string (`9170939951`). A filter change in that window fires the exact query again, beside the debounced suffix query. Same race.

`search()` also forces `loading` true on the keystroke, and `UnifiedSearchResults` returns a spinner whenever `loading` is true. The older request’s `finally` can set `loading` back to false before the debounced fetch starts. For that moment the panel shows the previous payload under the new text. Then the other response lands and the row vanishes. Network time plus the 300ms debounce is why it feels like about a second. The contact aggregation is allowed to run for up to 3 seconds (`maxTimeMS`), so the late response can be slower than that.

A failed search is a different message (**Search failed**). This glitch is a successful empty payload from the query that is no longer on screen.

## Why it only happens sometimes

If the shorter request is the last one to resolve, the row stays and the bug is invisible. It shows up when the exact 10-digit response is applied after the shorter one. That happens when:

- the previous request was not aborted yet (the debounce gap), and it resolves after the new one, or
- abort ran, but the old response had already been received, so `setResults` still ran, or
- the filter effect reissued the previous query while `lastQueryRef` was stale.

Typing the last digit and immediately deleting it is the easy overlap: the 10-digit fetch and the 9-digit fetch are both alive, they return different sets, and whichever finishes last is what stays on screen.

## How to confirm in the browser

1. Open the inbox, type `9170939951`, wait until the panel says **No results found**.
2. Open the network log and filter for `search/unified`.
3. Backspace once and do not type anything else.
4. You should see two calls whose `query` values differ by one digit, or one call for the shorter value and a late response for the longer value that was still open.
5. The shorter query’s response has `results.conversations.length > 0`. The longer query’s response has `results.conversations.length === 0` and `success: true`.
6. The row disappears at the moment the empty response is handled, while the input still shows the shorter number.

If only one request is sent and its body has conversations, but the row still vanishes, the panel was unmounted or `results` was cleared without a new payload. That is not what the current hook does on a single settled keystroke. The report above matches the code path that produces a successful empty follow-up.

## What has to change

The match cliff and the race are separate. Both are required for this symptom. Fixing only the spinner will not stop an empty payload from wiping a real hit.

1. **Bind every response to the query that produced it.** Keep a monotonically increasing id. Before `setResults` or `setLoading(false)`, ignore the response unless that id is still current. Do this even when the fetch was not aborted.
2. **Abort inside `search()`, before the debounce wait.** The request for the previous string must not be allowed to finish during those 300ms and publish into state.
3. **Do not treat `loading === false` plus `results === null` as “No results found”.** That is also the initial state. Show the empty copy only when the stored payload’s query equals the current input.
4. **Use one phone rule on both sides of 10 digits.** Rank an exact number higher, but do not switch the filter from exact `$in` to an end-anchored regex (and a shorter name/notes substring) when one digit is removed. A 10-digit miss and a 9-digit hit will keep racing until those two requests can return the same kind of set.

Until then, a late empty success from `9170939951` will keep deleting the rows that `917093995` actually found.
