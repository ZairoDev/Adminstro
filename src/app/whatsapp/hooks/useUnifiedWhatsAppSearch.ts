import { useState, useCallback, useEffect, useRef } from "react";

interface UseUnifiedSearchOptions {
  debounceMs?: number;
  includeArchived?: boolean;
  limit?: number;
  /** SuperAdmin inbox city filter (display name) */
  locationFilter?: string;
  adminQueue?: boolean;
}

interface UnifiedSearchResultsShape {
  conversations: any[];
  query?: string;
  totalResults?: number;
  searchTime?: number;
  hasStartNewChat?: boolean;
  startNewChatPhone?: string;
  messageSearchIncomplete?: boolean;
}

interface UseUnifiedSearchReturn {
  results: UnifiedSearchResultsShape | null;
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearSearch: () => void;
}

export function useUnifiedWhatsAppSearch(
  options: UseUnifiedSearchOptions = {}
): UseUnifiedSearchReturn {
  const { debounceMs = 300, locationFilter, includeArchived = false, adminQueue = false } = options;
  
  const [results, setResults] = useState<UnifiedSearchResultsShape | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastQueryRef = useRef<string>("");
  const requestIdRef = useRef<number>(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const executeSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      setError(null);
      lastQueryRef.current = "";
      return;
    }
    
    // Increment request ID to track this specific request
    const requestId = ++requestIdRef.current;
    lastQueryRef.current = searchQuery;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ query: searchQuery });
      if (locationFilter && locationFilter !== "all") {
        params.append("locationFilter", locationFilter);
      }
      if (adminQueue) {
        params.append("adminQueue", "true");
      }
      if (includeArchived) {
        params.append("includeArchived", "true");
      }
      const response = await fetch(`/api/whatsapp/search/unified?${params}`, {
        signal: abortController.signal,
      });

      const data = await response.json().catch(() => null);
      
      // Only update state if this is still the current request
      if (requestId !== requestIdRef.current) {
        return;
      }
      
      if (!response.ok || !data?.success || !data.results) {
        setResults(null);
        setError(
          typeof data?.error === "string" && data.error
            ? data.error
            : "Search failed",
        );
        return;
      }

      // Store results with the query so UI can validate
      setResults({ ...data.results, query: searchQuery });
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      // Only update state if this is still the current request
      if (requestId !== requestIdRef.current) {
        return;
      }
      setResults(null);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      if (!abortController.signal.aborted && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [locationFilter, adminQueue, includeArchived]);

  useEffect(() => {
    if (lastQueryRef.current) {
      executeSearch(lastQueryRef.current);
    }
  }, [locationFilter, adminQueue, includeArchived, executeSearch]);
  
  const search = useCallback((searchQuery: string) => {
    // Abort previous request immediately, not after debounce
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (!searchQuery.trim()) {
      setResults(null);
      setError(null);
      setLoading(false);
      lastQueryRef.current = "";
      return;
    }
    
    setLoading(true);
    setError(null);
    
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(searchQuery);
    }, debounceMs);
  }, [executeSearch, debounceMs]);

  const clearSearch = useCallback(() => {
    lastQueryRef.current = "";
    setResults(null);
    setError(null);
    setLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  return {
    results,
    loading,
    error,
    search,
    clearSearch,
  };
}
