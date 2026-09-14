import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/AuthStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PipAcknowledgmentScreen } from "@/components/pip/PipAcknowledgmentScreen";
import axios from "@/util/axios";
import type { PIPRecord } from "@/util/type";
interface PipAcknowledgmentGateProps {
  children: React.ReactNode;
}
interface PipSummaryResponse {
  unacknowledgedPips: PIPRecord[];
  activePips: PIPRecord[];
}
type GateStatus = "loading" | "blocked" | "allowed" | "error";
export function PipAcknowledgmentGate({
  children,
}: PipAcknowledgmentGateProps) {
  const token = useAuthStore((state) => state.token);
  const [status, setStatus] = useState<GateStatus>("loading");
  const [unacknowledgedPips, setUnacknowledgedPips] = useState<PIPRecord[]>([]);
  const checkPips = useCallback(async () => {
    if (!token?.id) return;
    setStatus("loading");
    try {
      const { data } = await axios.get<PipSummaryResponse>(
        "/api/employee/pip/me",
      );
      const pending = data.unacknowledgedPips ?? [];
      setUnacknowledgedPips(pending);
      setStatus(pending.length > 0 ? "blocked" : "allowed");
    } catch (error) {
      console.error("Failed to check PIP acknowledgment status:", error);
      // Fail closed: an employee must never bypass a mandatory PIP notice
      // simply because the status request failed.
      setStatus("error");
    }
  }, [token?.id]);
  const acknowledgePips = useCallback(async () => {
    await axios.post("/api/employee/pip/acknowledge");
    await checkPips();
    toast.success("PIP acknowledgment recorded");
  }, [checkPips]);
  useEffect(() => {
    if (!token?.id) return;
    void checkPips();
  }, [token?.id, checkPips]);
  if (status === "loading") {
    return (
      <div
        className="w-full space-y-4 p-4 sm:p-6"
        aria-label="Checking PIP acknowledgment status"
      >
        <Skeleton className="h-10 w-2/3 max-w-md" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-foreground">
            We couldn&apos;t load your PIP notice
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Please check your connection and try again. Access to the dashboard
            will resume after your acknowledgment status is verified.
          </p>
          <Button type="button" onClick={checkPips} className="mt-5 min-h-11 w-full">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (status === "blocked") {
    return (
      <PipAcknowledgmentScreen
        pips={unacknowledgedPips}
        onAcknowledge={acknowledgePips}
      />
    );
  }
  return <>{children}</>;
}