/**
 * Unified WhatsApp Search Hook - Conversation-Centric Results
 * Manages search state and API calls for the unified search system
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { UnifiedSearchResults } from "@/lib/whatsapp/unifiedSearchUtils";

interface UseUnifiedSearchOptions {
  debounceMs?: number;
  includeArchived?: boolean;
  limit?: number;
}

interface UseUnifiedSearchReturn {
  query: string;
  results: UnifiedSearchResults | null;
  loading: boolean;
  error: string | null;
  isSearchMode: boolean;
  search: (query: string) => void;
  clearSearch: () => void;
}

export function useUnifiedWhatsAppSearch(
  options: UseUnifiedSearchOptions = {}
): UseUnifiedSearchReturn {
  const { debounceMs = 300, includeArchived = false, limit = 50 } = options;
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Derived state
  const isSearchMode = query.trim().length > 0;
  
  // Execute search
  const executeSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      setError(null);
      return;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        limit: String(limit),
        includeArchived: String(includeArchived),
      });
      
      const response = await fetch(`/api/whatsapp/search/unified?${params}`, {
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        setError(null);
      } else {
        setError(data.error || "Search failed");
        setResults(null);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      
      console.error("Unified search error:", err);
      setError(err.message || "Search failed");
      setResults(null);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [limit, includeArchived]);
  
  // Debounced search
  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (!searchQuery.trim()) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }
    
    // Set loading immediately
    setLoading(true);
    
    // Debounce the actual search
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(searchQuery);
    }, debounceMs);
  }, [executeSearch, debounceMs]);
  
  // Clear search
  const clearSearch = useCallback(() => {
    setQuery("");
    setResults(null);
    setError(null);
    setLoading(false);
    
    // Cancel any pending search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
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
    loading,
    error,
    isSearchMode,
    search,
    clearSearch,
  };
}

