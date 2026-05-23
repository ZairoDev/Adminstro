"use client";

import { useCallback, useRef, useState } from "react";
import axios from "@/util/axios";
import type { MessageTranslationEntry } from "@/lib/translate/messageTranslate";

type TranslateApiResponse = {
  success: boolean;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  error?: string;
};

export function useMessageTranslation() {
  const cacheRef = useRef<Map<string, MessageTranslationEntry>>(new Map());
  const [version, setVersion] = useState(0);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const setLoading = useCallback((messageKey: string, loading: boolean) => {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      if (loading) next.add(messageKey);
      else next.delete(messageKey);
      return next;
    });
  }, []);

  const getEntry = useCallback(
    (messageKey: string): MessageTranslationEntry | undefined => {
      void version;
      return cacheRef.current.get(messageKey);
    },
    [version],
  );

  const isLoading = useCallback(
    (messageKey: string) => loadingIds.has(messageKey),
    [loadingIds],
  );

  const requestTranslate = useCallback(
    async (text: string, to: string, from?: string) => {
      const res = await axios.post<TranslateApiResponse>("/api/translate", {
        text,
        to,
        ...(from && from !== "auto" ? { from } : {}),
      });
      if (!res.data.success || !res.data.text) {
        throw new Error(res.data.error ?? "Translation failed");
      }
      return res.data;
    },
    [],
  );

  const toggleTranslation = useCallback(
    async (messageKey: string, originalText: string) => {
      const existing = cacheRef.current.get(messageKey);

      if (existing) {
        if (existing.showing === "english") {
          cacheRef.current.set(messageKey, { ...existing, showing: "original" });
          bump();
          return;
        }
        cacheRef.current.set(messageKey, { ...existing, showing: "english" });
        bump();
        return;
      }

      setLoading(messageKey, true);
      try {
        const data = await requestTranslate(originalText, "en");
        const sourceLanguage = data.sourceLanguage || "auto";
        cacheRef.current.set(messageKey, {
          originalText,
          sourceLanguage,
          englishText: data.text,
          showing: "english",
        });
        bump();
      } finally {
        setLoading(messageKey, false);
      }
    },
    [bump, requestTranslate, setLoading],
  );

  const clearConversationTranslations = useCallback(() => {
    cacheRef.current.clear();
    setLoadingIds(new Set());
    bump();
  }, [bump]);

  return {
    getEntry,
    isLoading,
    toggleTranslation,
    clearConversationTranslations,
  };
}
