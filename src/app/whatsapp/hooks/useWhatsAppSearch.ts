import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

interface SearchResults {
  phoneNumbers: any[];
  conversations: any[];
  messages: any[];
}

interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResults;
  totalResults: {
    phoneNumbers: number;
    conversations: number;
    messages: number;
    total: number;
  };
  searchTime: number;
  cached?: boolean;
  error?: string;
}

interface UseWhatsAppSearchOptions {
  debounceMs?: number;
  minLength?: number;
  type?: "all" | "conversations" | "messages" | "phone";
  includeArchived?: boolean;
}

export function useWhatsAppSearch(options: UseWhatsAppSearchOptions = {}) {
  const {
    debounceMs = 300,
    minLength = 1,
    type = "all",
    includeArchived = false,
  } = options;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    phoneNumbers: [],
    conversations: [],
    messages: [],
  });
  const [totalResults, setTotalResults] = useState({
    phoneNumbers: 0,
    conversations: 0,
    messages: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Execute search
  const executeSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery || searchQuery.length < minLength) {
        setResults({
          phoneNumbers: [],
          conversations: [],
          messages: [],
        });
        setTotalResults({
          phoneNumbers: 0,
          conversations: 0,
          messages: 0,
          total: 0,
        });
        setIsSearchMode(false);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);
      setIsSearchMode(true);

      try {
        const response = await axios.get<SearchResponse>("/api/whatsapp/search", {
          params: {
            query: searchQuery,
            type,
            includeArchived,
            limit: 10,
          },
          signal: abortControllerRef.current.signal,
        });

        if (response.data.success) {
          setResults(response.data.results);
          setTotalResults(response.data.totalResults);
          setSearchTime(response.data.searchTime);
        } else {
          setError(response.data.error || "Search failed");
        }
      } catch (err: any) {
        if (err.name !== "CanceledError") {
          console.error("[WhatsApp Search] Error:", err);
          setError(err.response?.data?.error || "Search failed. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [type, includeArchived, minLength]
  );

  // Debounced search
  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(searchQuery);
      }, debounceMs);
    },
    [executeSearch, debounceMs]
  );

  // Update query and trigger search
  const search = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      debouncedSearch(newQuery);
    },
    [debouncedSearch]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery("");
    setResults({
      phoneNumbers: [],
      conversations: [],
      messages: [],
    });
    setTotalResults({
      phoneNumbers: 0,
      conversations: 0,
      messages: 0,
      total: 0,
    });
    setError(null);
    setIsSearchMode(false);
    setSearchTime(null);

    // Cancel pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear pending timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // Cleanup on unmount
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
    query,
    results,
    totalResults,
    loading,
    error,
    searchTime,
    isSearchMode,
    search,
    clearSearch,
  };
}

