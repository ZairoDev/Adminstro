import { useState, useCallback, useEffect, useRef } from "react";
import type {
  StartNewChatInfo,
  UnifiedConversationResult,
} from "@/lib/whatsapp/unifiedSearchUtils";

interface UseUnifiedSearchOptions {
  debounceMs?: number;
}

/** Wire shape of GET /api/whatsapp/search/unified (dates arrive as ISO strings). */
export interface UnifiedSearchResultsShape {
  conversations: Array<
    Omit<UnifiedConversationResult, "lastMessageTime"> & { lastMessageTime: string | Date }
  >;
  query?: string;
  totalResults?: number;
  searchTime?: number;
  hasStartNewChat?: boolean;
  startNewChatPhone?: string;
  startNewChat?: StartNewChatInfo;
  messageSearchIncomplete?: boolean;
  scopeTruncated?: boolean;
}

interface UseUnifiedSearchReturn {
  results: UnifiedSearchResultsShape | null;
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  retry: () => void;
  clearSearch: () => void;
}

type SearchResponseBody = {
  success?: boolean;
  error?: string;
  results?: UnifiedSearchResultsShape;
};

/**
 * Search is global within the caller's permissions, so the request depends only
 * on the query text. One debounce, one in-flight request, stale responses dropped.
 */
export function useUnifiedWhatsAppSearch(
  options: UseUnifiedSearchOptions = {},
): UseUnifiedSearchReturn {
  const { debounceMs = 300 } = options;

  const [results, setResults] = useState<UnifiedSearchResultsShape | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastQueryRef = useRef("");
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPending = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const executeSearch = useCallback(async (searchQuery: string) => {
    const query = searchQuery.trim();
    if (!query) {
      setResults(null);
      setError(null);
      setLoading(false);
      lastQueryRef.current = "";
      return;
    }

    const requestId = ++requestIdRef.current;
    lastQueryRef.current = query;

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ query });
      const response = await fetch(`/api/whatsapp/search/unified?${params}`, {
        signal: abortController.signal,
      });
      const data = (await response.json().catch(() => null)) as SearchResponseBody | null;

      if (requestId !== requestIdRef.current) return;

      if (!response.ok || !data?.success || !data.results) {
        setResults(null);
        setError(
          typeof data?.error === "string" && data.error ? data.error : "Search failed",
        );
        return;
      }

      // Tag results with the query they answer so the UI can ignore stale data.
      setResults({ ...data.results, query: searchQuery });
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (requestId !== requestIdRef.current) return;
      setResults(null);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const clearSearch = useCallback(() => {
    cancelPending();
    requestIdRef.current += 1;
    lastQueryRef.current = "";
    setResults(null);
    setError(null);
    setLoading(false);
  }, [cancelPending]);

  const search = useCallback(
    (searchQuery: string) => {
      cancelPending();

      if (!searchQuery.trim()) {
        clearSearch();
        return;
      }

      setLoading(true);
      setError(null);

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void executeSearch(searchQuery);
      }, debounceMs);
    },
    [cancelPending, clearSearch, debounceMs, executeSearch],
  );

  const retry = useCallback(() => {
    if (lastQueryRef.current) void executeSearch(lastQueryRef.current);
  }, [executeSearch]);

  useEffect(() => cancelPending, [cancelPending]);

  return { results, loading, error, search, retry, clearSearch };
}
