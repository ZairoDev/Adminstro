"use client";

import { useCallback, useState } from "react";
import axios from "@/util/axios";
import { useToast } from "@/hooks/use-toast";
import { useVisitOverdue } from "@/components/visits/VisitOverdueContext";

export function useVisitCloseActions(onSuccess?: () => void) {
  const { toast } = useToast();
  const { refresh } = useVisitOverdue();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const run = useCallback(
    async (visitId: string, request: () => Promise<unknown>, successMessage: string) => {
      setLoadingId(visitId);
      try {
        await request();
        toast({ description: successMessage });
        await refresh();
        onSuccess?.();
      } catch {
        toast({
          title: "Unable to update visit",
          variant: "destructive",
        });
      } finally {
        setLoadingId(null);
      }
    },
    [onSuccess, refresh, toast],
  );

  const complete = useCallback(
    (visitId: string) =>
      run(
        visitId,
        () => axios.patch(`/api/visits/${visitId}/complete`, {}),
        "Visit marked as completed",
      ),
    [run],
  );

  const cancel = useCallback(
    (visitId: string, reason: string) =>
      run(
        visitId,
        () => axios.patch(`/api/visits/${visitId}/cancel`, { reason }),
        "Visit cancelled",
      ),
    [run],
  );

  const noShow = useCallback(
    (visitId: string, reason: string) =>
      run(
        visitId,
        () => axios.patch(`/api/visits/${visitId}/no-show`, { reason }),
        "Visit marked as no-show",
      ),
    [run],
  );

  return { loadingId, complete, cancel, noShow };
}
