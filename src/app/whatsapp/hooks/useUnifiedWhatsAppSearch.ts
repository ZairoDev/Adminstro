import { useState, useCallback, useEffect, useRef } from "react";

interface UseUnifiedSearchOptions {
  debounceMs?: number;
  includeArchived?: boolean;
  limit?: number;
  phoneId?: string;
}

interface UseUnifiedSearchReturn {
  results: { conversations: any[] } | null;
  loading: boolean;
  search: (query: string) => void;
  clearSearch: () => void;
}

export function useUnifiedWhatsAppSearch(
  options: UseUnifiedSearchOptions = {}
): UseUnifiedSearchReturn {
  const { debounceMs = 300, phoneId } = options;
  
  const [results, setResults] = useState<{ conversations: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const executeSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setLoading(true);
    
    try {
      const params = new URLSearchParams({ query: searchQuery });
      if (phoneId) {
        params.append("phoneId", phoneId);
      }
      const response = await fetch(`/api/whatsapp/search?${params}`, {
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setResults({ conversations: data.conversations });
      } else {
        setResults(null);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      setResults(null);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [phoneId]);
  
  const search = useCallback((searchQuery: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (!searchQuery.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(searchQuery);
    }, debounceMs);
  }, [executeSearch, debounceMs]);

  const clearSearch = useCallback(() => {
    setResults(null);
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
    search,
    clearSearch,
  };
}

