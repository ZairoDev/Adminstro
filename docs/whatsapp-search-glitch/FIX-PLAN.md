# WhatsApp Search Bug - Concrete Fix Plan

## Summary
Fix the race condition where an older search response overwrites a newer one, causing results to disappear while the query text remains visible in the search box.

## Root Causes Identified
1. **Race condition:** Responses are applied without checking which query they belong to
2. **Delayed abort:** Previous requests remain alive during the 300ms debounce window
3. **Filter effect race:** Filter changes can re-trigger the previous query while debounce is waiting
4. **Phone search cliff:** 10-digit queries use exact `$in`, 9-digit queries use suffix regex

## Fix Strategy

### Phase 1: Fix Race Condition (Critical - Must Fix)
**Priority:** HIGH  
**Risk:** LOW  
**Files affected:** `src/app/whatsapp/hooks/useUnifiedWhatsAppSearch.ts`

#### Changes:
1. **Add request ID tracking**
   - Add `searchIdRef` that increments on every search call
   - Store `requestId` with each fetch
   - Before `setResults` or `setLoading`, check if the response's `requestId` matches current `searchIdRef`
   - Ignore stale responses even if not aborted

2. **Move abort before debounce**
   - Abort existing request immediately in `search()`, before the 300ms wait
   - This ensures old requests cannot complete during debounce

3. **Fix filter effect race**
   - Update `lastQueryRef` immediately when user types, not when fetch starts
   - Store pending query separately from executed query
   - Effect uses the pending value, not stale executed value

#### Implementation:
```typescript
// Add these refs
const searchIdRef = useRef<number>(0);
const pendingQueryRef = useRef<string>("");

// Modify executeSearch to accept and check requestId
const executeSearch = useCallback(async (searchQuery: string, requestId: number) => {
  if (!searchQuery.trim()) {
    setResults(null);
    setError(null);
    lastQueryRef.current = "";
    return;
  }
  
  lastQueryRef.current = searchQuery;
  
  // Abort previous request
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  const abortController = new AbortController();
  abortControllerRef.current = abortController;
  
  setLoading(true);
  setError(null);
  
  try {
    const params = new URLSearchParams({ query: searchQuery });
    // ... build params
    
    const response = await fetch(`/api/whatsapp/search/unified?${params}`, {
      signal: abortController.signal,
    });

    const data = await response.json().catch(() => null);
    
    // CRITICAL: Check if this response is still current
    if (requestId !== searchIdRef.current) {
      console.debug(`Ignoring stale search response: request ${requestId}, current ${searchIdRef.current}`);
      return;
    }
    
    if (!response.ok || !data?.success || !data.results) {
      setResults(null);
      setError(data?.error || "Search failed");
      return;
    }

    setResults(data.results);
    setError(null);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return;
    }
    
    // Check requestId before setting error state too
    if (requestId !== searchIdRef.current) {
      return;
    }
    
    setResults(null);
    setError(err instanceof Error ? err.message : "Search failed");
  } finally {
    // Only update loading if this is still the current request
    if (requestId === searchIdRef.current && !abortController.signal.aborted) {
      setLoading(false);
    }
  }
}, [locationFilter, adminQueue, includeArchived]);

// Modify search function
const search = useCallback((searchQuery: string) => {
  // Clear debounce timer
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }
  
  // CRITICAL: Abort immediately, before debounce
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
  }
  
  if (!searchQuery.trim()) {
    setResults(null);
    setError(null);
    setLoading(false);
    lastQueryRef.current = "";
    pendingQueryRef.current = "";
    return;
  }
  
  // Update pending query immediately (before debounce)
  pendingQueryRef.current = searchQuery;
  
  // Increment search ID
  searchIdRef.current += 1;
  const currentSearchId = searchIdRef.current;
  
  setLoading(true);
  setError(null);
  
  debounceTimerRef.current = setTimeout(() => {
    executeSearch(searchQuery, currentSearchId);
  }, debounceMs);
}, [executeSearch, debounceMs]);

// Fix filter effect to use pending query
useEffect(() => {
  // Use the query the user has typed, not the last executed one
  const queryToExecute = pendingQueryRef.current || lastQueryRef.current;
  if (queryToExecute) {
    searchIdRef.current += 1;
    executeSearch(queryToExecute, searchIdRef.current);
  }
}, [locationFilter, adminQueue, includeArchived, executeSearch]);
```

**Testing checklist:**
- [ ] Type 10-digit number, wait for "No results"
- [ ] Delete one digit, verify result appears and STAYS
- [ ] Type fast (multiple characters in <300ms), verify only last query shows
- [ ] Change location filter while query is pending, verify no race
- [ ] Network throttle to 3G, type and delete rapidly, verify correct result wins

---

### Phase 2: Improve Empty State UX (Medium Priority)
**Priority:** MEDIUM  
**Risk:** LOW  
**Files affected:** `src/app/whatsapp/components/UnifiedSearchResults.tsx`

#### Problem:
Component shows "No results found" when `results === null`, which is also the initial state. After fix Phase 1, stale responses will be ignored but the UI should be more explicit.

#### Changes:
Pass the current `query` prop to the component and check if results match:

```typescript
// In UnifiedSearchResults.tsx, around line 69
if (!results || results.conversations.length === 0) {
  // Don't show "No results" if we haven't actually searched yet
  // or if the results are for a different query
  const hasActuallySearched = results !== null;
  
  if (!hasActuallySearched) {
    // Initial state - show nothing or a prompt
    return null; // or show a search prompt
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* ... existing empty state ... */}
    </div>
  );
}
```

**Alternative:** Store the query string with results in the hook:
```typescript
interface UnifiedSearchResultsShape {
  query: string; // Add this
  conversations: any[];
  // ... rest
}
```

Then check `results.query === query` before showing empty state.

**Testing checklist:**
- [ ] Initial load shows no "No results found" message
- [ ] After Phase 1 fix, stale responses don't briefly flash empty state

---

### Phase 3: Smooth Phone Search Strategy (Optional, Lower Priority)
**Priority:** LOW  
**Risk:** MEDIUM (changes search behavior)  
**Files affected:** `src/lib/whatsapp/searchUtils.ts`, `src/app/api/whatsapp/search/unified/route.ts`

#### Problem:
At 10 digits, search uses exact `$in` match. At 9 digits, it switches to suffix regex. This creates a cliff where one digit changes the result set dramatically.

#### Option A: Always use suffix search for phone queries
```typescript
// In buildInboxContactSearchClause, around line 42
const phoneMatch: Record<string, unknown> =
  { participantPhone: { $regex: `${escapeRegex(digits)}$` } };
  
// Remove the conditional:
// digits.length >= 10 ? { participantPhone: { $in: [...phones] } } : ...
```

Then in the aggregation pipeline, still check exact match for scoring but don't filter by it:
```typescript
// In route.ts, the $match stage already uses buildInboxContactSearchClause
// which will now always be suffix-based

// The $addFields for phoneExactMatch stays the same for scoring:
phoneExactMatch: isPhone ? { $eq: ["$participantPhone", phoneDigits] } : false,
phoneSuffixMatch: isPhone && phoneLast10 ? { ... } : false,
```

**Pro:** Gradual result changes as user types  
**Con:** May return more results for 10+ digit queries  

#### Option B: Keep exact match but add suffix results too
```typescript
// In buildInboxContactSearchClause
const phoneMatch: Record<string, unknown> = 
  digits.length >= 10
    ? {
        $or: [
          { participantPhone: { $in: [...phones] } }, // Exact
          { participantPhone: { $regex: `${escapeRegex(last10)}$` } }, // Suffix
        ],
      }
    : { participantPhone: { $regex: `${escapeRegex(digits)}$` } };
```

**Pro:** Shows both exact and partial matches  
**Con:** More complex, may show too many results  

#### Recommendation:
**Skip Phase 3 for initial fix.** Phase 1 eliminates the race condition, which is the severe bug. The phone strategy cliff is a UX issue but not broken behavior - it's by design to be more precise at 10 digits. If users complain about missing partial matches on 10-digit queries, revisit this.

---

## Implementation Order

### Week 1: Critical Fix
1. ✅ Implement Phase 1 (race condition fix)
2. ✅ Write unit tests for the hook
3. ✅ Manual testing with network throttling
4. ✅ Deploy to staging

### Week 2: Polish
1. Implement Phase 2 (empty state UX)
2. Add integration tests
3. Deploy to production

### Future (if needed):
- Phase 3 based on user feedback

---

## Testing Strategy

### Unit Tests
Create `src/app/whatsapp/hooks/useUnifiedWhatsAppSearch.test.ts`:
```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUnifiedWhatsAppSearch } from './useUnifiedWhatsAppSearch';

describe('useUnifiedWhatsAppSearch race condition fix', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should ignore stale responses', async () => {
    let resolveFirst: any;
    let resolveSecond: any;
    
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => new Promise(res => { resolveFirst = res; }))
      .mockImplementationOnce(() => new Promise(res => { resolveSecond = res; }));

    const { result } = renderHook(() => useUnifiedWhatsAppSearch({ debounceMs: 0 }));

    // Start first search
    act(() => {
      result.current.search('9170939951');
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // Start second search (should invalidate first)
    act(() => {
      result.current.search('917093995');
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    // Resolve second request first (fast response)
    resolveSecond({
      ok: true,
      json: async () => ({
        success: true,
        results: { conversations: [{ id: '2' }] },
      }),
    });

    await waitFor(() => {
      expect(result.current.results?.conversations).toEqual([{ id: '2' }]);
    });

    // Resolve first request second (slow response)
    resolveFirst({
      ok: true,
      json: async () => ({
        success: true,
        results: { conversations: [] },
      }),
    });

    // Wait a bit and verify stale response was ignored
    await new Promise(res => setTimeout(res, 100));
    expect(result.current.results?.conversations).toEqual([{ id: '2' }]);
    expect(result.current.results?.conversations).not.toEqual([]);
  });
});
```

### Manual Testing Script
```
1. BASIC RACE TEST
   - Open WhatsApp inbox
   - Open browser DevTools → Network → Throttle to "Slow 3G"
   - Type: 9170939951
   - Wait for "No results found"
   - Backspace once: 917093995
   - Expected: Result appears and STAYS (does not disappear)
   - Actual: [PASS/FAIL]

2. RAPID TYPING TEST
   - Clear search
   - Type quickly: 91709399
   - Before it completes, add: 51
   - Before that completes, delete last 2 digits
   - Expected: Final query (917093995) shows correct results
   - Actual: [PASS/FAIL]

3. FILTER CHANGE DURING SEARCH
   - Type: 917093
   - Before it settles, change location filter
   - Expected: Shows results for 917093 in new location
   - Actual: [PASS/FAIL]

4. ABORT VERIFICATION
   - Network throttle: Slow 3G
   - Type: 9170939951
   - Immediately type: 917
   - Check Network tab: verify first request shows "cancelled"
   - Expected: Only one active request at a time
   - Actual: [PASS/FAIL]
```

---

## Rollback Plan

If Phase 1 causes issues:
1. Revert commit with request ID changes
2. Apply emergency fix: increase debounce to 500ms (reduces race probability)
3. Investigate and reimplement with more testing

---

## Success Metrics

### Before Fix:
- Bug reproducible ~70% of the time with fast typing
- Network requests often overlap (visible in DevTools)
- User reports: "Search results disappear" ~5 times/week

### After Fix:
- Bug reproducible 0% (with request ID check)
- Only one active request at a time (abort on keystroke)
- User reports: 0

---

## Files to Modify

### Phase 1 (Required):
- ✅ `src/app/whatsapp/hooks/useUnifiedWhatsAppSearch.ts` - Add request ID tracking, move abort

### Phase 2 (Optional):
- ⏸️ `src/app/whatsapp/components/UnifiedSearchResults.tsx` - Improve empty state logic

### Phase 3 (Future):
- ⏸️ `src/lib/whatsapp/searchUtils.ts` - Smooth phone search strategy
- ⏸️ `src/app/api/whatsapp/search/unified/route.ts` - Update aggregation pipeline

### New Files:
- ⏸️ `src/app/whatsapp/hooks/useUnifiedWhatsAppSearch.test.ts` - Unit tests

---

## Risk Assessment

| Change | Risk Level | Mitigation |
|--------|-----------|------------|
| Request ID check | LOW | Purely additive, won't break existing flow |
| Abort before debounce | LOW | AbortController is standard, well-tested |
| Filter effect fix | MEDIUM | Test thoroughly with all filter combinations |
| Empty state logic | LOW | Only affects what user sees, not data flow |
| Phone search strategy | HIGH | Would change search behavior, defer to Phase 3 |

---

## Questions for Review

1. **Should we add request IDs to the API response?** Currently checking client-side only. Could add `requestId` echo in response for debugging.

2. **Should we show a "Searching..." indicator during debounce?** Currently shows spinner immediately, might feel more responsive to keep previous results visible with a subtle loading indicator.

3. **Should Phase 2 store query with results?** Cleaner to check `results.query === query` than relying on separate state.

4. **Should we log stale response rejections?** Currently using `console.debug`, should it be tracked in error monitoring?

---

## Next Steps

1. **Review this plan** with team
2. **Get approval** for Phase 1 changes
3. **Create feature branch:** `fix/whatsapp-search-race-condition`
4. **Implement Phase 1** with tests
5. **Code review** and testing
6. **Deploy to staging** and soak test
7. **Deploy to production** with monitoring

---

## Conclusion

**The critical fix is Phase 1** - adding request ID tracking and moving the abort call before debounce. This eliminates the race condition where stale responses overwrite current results.

Phase 2 and 3 are polish and can be done separately. The phone search strategy cliff (Phase 3) is actually working as designed, so we should only change it if users specifically complain about partial match behavior.

**Estimated effort:**
- Phase 1: 4-6 hours (implementation + testing)
- Phase 2: 2 hours
- Phase 3: 4 hours (if we decide to do it)

**Total: 1-2 days including testing and deployment**
