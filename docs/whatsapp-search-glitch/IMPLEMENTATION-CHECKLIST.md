# WhatsApp Search Fix - Implementation Checklist

## Pre-Implementation
- [ ] Read both README.md and FIX-PLAN.md thoroughly
- [ ] Backup current working code
- [ ] Create feature branch: `fix/whatsapp-search-race-condition`
- [ ] Set up local test environment with network throttling

---

## Phase 1: Critical Race Condition Fix

### Code Changes

#### File: `src/app/whatsapp/hooks/useUnifiedWhatsAppSearch.ts`

- [ ] **Add new refs at top of hook:**
  ```typescript
  const searchIdRef = useRef<number>(0);
  const pendingQueryRef = useRef<string>("");
  ```

- [ ] **Modify `executeSearch` signature:**
  ```typescript
  const executeSearch = useCallback(async (
    searchQuery: string, 
    requestId: number  // ADD THIS PARAMETER
  ) => {
  ```

- [ ] **Add request ID check before state updates (3 locations):**
  
  **Location 1 - Success path (after response.json()):**
  ```typescript
  const data = await response.json().catch(() => null);
  
  // ADD THIS CHECK
  if (requestId !== searchIdRef.current) {
    console.debug(`Ignoring stale search: req ${requestId}, current ${searchIdRef.current}`);
    return;
  }
  
  if (!response.ok || !data?.success || !data.results) {
    setResults(null);
    // ...
  ```

  **Location 2 - Error path (in catch block):**
  ```typescript
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return;
    }
    
    // ADD THIS CHECK
    if (requestId !== searchIdRef.current) {
      return;
    }
    
    setResults(null);
    setError(err instanceof Error ? err.message : "Search failed");
  ```

  **Location 3 - Finally block:**
  ```typescript
  } finally {
    // ADD REQUEST ID CHECK HERE TOO
    if (requestId === searchIdRef.current && !abortController.signal.aborted) {
      setLoading(false);
    }
  }
  ```

- [ ] **Update `search()` function - abort immediately:**
  ```typescript
  const search = useCallback((searchQuery: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // ADD THIS: Abort immediately, BEFORE debounce
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (!searchQuery.trim()) {
      setResults(null);
      setError(null);
      setLoading(false);
      lastQueryRef.current = "";
      pendingQueryRef.current = "";  // ADD THIS
      return;
    }
    
    // ADD THIS: Update pending query immediately
    pendingQueryRef.current = searchQuery;
    
    // ADD THIS: Increment search ID
    searchIdRef.current += 1;
    const currentSearchId = searchIdRef.current;
    
    setLoading(true);
    setError(null);
    
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(searchQuery, currentSearchId);  // PASS REQUEST ID
    }, debounceMs);
  }, [executeSearch, debounceMs]);
  ```

- [ ] **Update filter effect to use pending query:**
  ```typescript
  useEffect(() => {
    // MODIFY THIS LINE:
    const queryToExecute = pendingQueryRef.current || lastQueryRef.current;
    if (queryToExecute) {
      // ADD THESE TWO LINES:
      searchIdRef.current += 1;
      executeSearch(queryToExecute, searchIdRef.current);
    }
  }, [locationFilter, adminQueue, includeArchived, executeSearch]);
  ```

- [ ] **Update `clearSearch()` to reset new refs:**
  ```typescript
  const clearSearch = useCallback(() => {
    lastQueryRef.current = "";
    pendingQueryRef.current = "";  // ADD THIS
    setResults(null);
    // ... rest stays the same
  ```

---

### Testing Before Committing

#### Unit Test Setup
- [ ] Create file: `src/app/whatsapp/hooks/useUnifiedWhatsAppSearch.test.ts`
- [ ] Add test: "should ignore stale responses"
- [ ] Add test: "should abort previous request on new search"
- [ ] Add test: "should handle rapid typing correctly"
- [ ] Run tests: `npm test useUnifiedWhatsAppSearch`
- [ ] All tests pass: ✅

#### Manual Testing

**Test 1: Basic Race Condition**
- [ ] Open WhatsApp inbox
- [ ] Open DevTools → Network → Throttle to "Slow 3G"
- [ ] Type: `9170939951`
- [ ] Wait for "No results found"
- [ ] Backspace once to: `917093995`
- [ ] **Expected:** Result appears and STAYS visible
- [ ] **Actual:** ____________
- [ ] Result: PASS / FAIL

**Test 2: Rapid Typing**
- [ ] Clear search box
- [ ] Type very quickly: `917093995`
- [ ] Immediately delete last 4 digits: `91709`
- [ ] Immediately type: `3995`
- [ ] **Expected:** Final query `9170939951` shows correct results
- [ ] **Actual:** ____________
- [ ] Result: PASS / FAIL

**Test 3: Request Cancellation Verification**
- [ ] Keep DevTools Network tab open
- [ ] Network throttle: Slow 3G
- [ ] Type: `9170939951`
- [ ] Before response arrives, type: `917`
- [ ] Check Network tab
- [ ] **Expected:** First request shows "cancelled" status
- [ ] **Actual:** ____________
- [ ] Result: PASS / FAIL

**Test 4: Filter Change During Search**
- [ ] Type partial query: `91709`
- [ ] While search is pending, change location filter
- [ ] **Expected:** Results for `91709` in new location appear
- [ ] **Actual:** ____________
- [ ] Result: PASS / FAIL

**Test 5: Empty Query Handling**
- [ ] Type: `9170939951`
- [ ] Clear search box (delete all text)
- [ ] **Expected:** Results cleared, no error
- [ ] **Actual:** ____________
- [ ] Result: PASS / FAIL

**Test 6: Normal Flow (Sanity Check)**
- [ ] Type: `test user` (name search)
- [ ] Wait for results
- [ ] **Expected:** Name matches appear
- [ ] **Actual:** ____________
- [ ] Result: PASS / FAIL

**Test 7: No Regression - Message Search**
- [ ] Type: `hello` (message content search)
- [ ] Wait for results
- [ ] **Expected:** Message matches appear in "Chats" section
- [ ] **Actual:** ____________
- [ ] Result: PASS / FAIL

---

### Code Review Checklist

- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Request ID increments monotonically
- [ ] Stale responses logged to console.debug
- [ ] Abort happens before debounce wait
- [ ] All existing functionality preserved
- [ ] No breaking changes to API

---

### Commit and Push

- [ ] Commit message follows convention:
  ```
  fix(whatsapp): prevent race condition in unified search
  
  - Add request ID tracking to ignore stale responses
  - Abort previous requests immediately on new search
  - Fix filter effect to use pending query instead of stale lastQueryRef
  
  Fixes bug where deleting a digit shows result briefly then clears it
  
  Refs: docs/whatsapp-search-glitch/README.md
  ```
- [ ] Push to feature branch
- [ ] Create PR with link to docs/whatsapp-search-glitch/FIX-PLAN.md

---

## Phase 2: Empty State UX (Optional)

### Code Changes

#### File: `src/app/whatsapp/components/UnifiedSearchResults.tsx`

- [ ] Modify empty state condition (around line 69):
  ```typescript
  if (!results || results.conversations.length === 0) {
    // Don't show "No results" in initial state
    if (!results) {
      return null; // or return a "Start typing to search" prompt
    }
    
    // Show "No results found" only when we have an actual empty result
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        {/* existing empty state UI */}
      </div>
    );
  }
  ```

### Testing
- [ ] Initial load: no "No results found" message
- [ ] After typing query with no matches: shows "No results found"
- [ ] After clearing query: back to initial state

---

## Deployment Checklist

### Staging Deployment
- [ ] Deploy to staging environment
- [ ] Verify build succeeds
- [ ] Manual testing on staging (all tests above)
- [ ] Check browser console for any errors
- [ ] Load test: verify no performance regression
- [ ] Soak test: leave running for 24 hours, check error logs

### Production Deployment
- [ ] Get approval from team lead
- [ ] Schedule deployment window
- [ ] Deploy to production
- [ ] Monitor error logs for 1 hour
- [ ] Check user feedback channels
- [ ] Mark task complete

---

## Rollback Procedure (If Needed)

If issues occur after deployment:

1. **Immediate Rollback:**
   - [ ] Revert commit: `git revert <commit-hash>`
   - [ ] Push to production immediately
   - [ ] Notify team

2. **Emergency Fix (if rollback fails):**
   - [ ] Increase debounce to 500ms as temporary measure
   - [ ] Deploy hotfix
   - [ ] Schedule proper fix

3. **Post-Mortem:**
   - [ ] Document what went wrong
   - [ ] Update fix plan
   - [ ] Re-test and re-deploy

---

## Success Criteria

✅ **Bug is fixed when:**
- [ ] User types phone number, deletes digit, result stays visible
- [ ] No stale responses overwrite current results
- [ ] Only one active request at a time (verified in Network tab)
- [ ] All existing search functionality works
- [ ] No user reports of "results disappearing"

---

## Notes

- Request ID approach is safer than relying only on AbortController
- Abort before debounce prevents overlapping requests entirely
- Phase 3 (phone search strategy) deferred - not critical for bug fix
- Keep detailed logs during initial deployment for debugging

---

## Sign-Off

- [ ] Developer: Tested locally, all tests pass
- [ ] Code reviewer: Reviewed changes, approved
- [ ] QA: Manual testing complete, no regressions
- [ ] Deployed to staging: Verified working
- [ ] Deployed to production: Monitoring active
- [ ] Bug verified fixed: No user reports after 1 week
