"use client";

import { useEffect, useState } from "react";
import axios from "@/util/axios";
import {
  readAddListingDraftContext,
  saveAddListingDraftContext,
  type AddListingDraftContext,
} from "@/lib/add-listing-draft-context";

export function useShortTermDraftContext(
  userId: string | null,
  urlOwnerSheetId: string | null,
  urlShortTermDraft: boolean,
) {
  const [ctx, setCtx] = useState<AddListingDraftContext | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setCtx(null);
      setLoading(false);
      return;
    }

    if (urlShortTermDraft && urlOwnerSheetId) {
      const next: AddListingDraftContext = {
        userId,
        ownerSheetId: urlOwnerSheetId,
        shortTermDraft: true,
      };
      saveAddListingDraftContext(next);
      setCtx(next);
      setLoading(false);
      return;
    }

    const stored = readAddListingDraftContext(userId);
    if (stored) {
      setCtx(stored);
      setLoading(false);
      return;
    }

    let cancelled = false;
    axios
      .get(`/api/unregisteredOwnersShortTerm/by-owner/${userId}`)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.shortTermDraft && res.data?.ownerSheetId) {
          const next: AddListingDraftContext = {
            userId,
            ownerSheetId: res.data.ownerSheetId,
            shortTermDraft: true,
          };
          saveAddListingDraftContext(next);
          setCtx(next);
        } else {
          setCtx(null);
        }
      })
      .catch(() => {
        if (!cancelled) setCtx(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, urlOwnerSheetId, urlShortTermDraft]);

  return {
    loading,
    shortTermDraft: ctx?.shortTermDraft === true,
    ownerSheetId: ctx?.ownerSheetId ?? null,
  };
}
