"use client";

import { ShortTermOwnerJourney } from "@/components/short-term-owner/ShortTermOwnerJourney";
import { MakeLiveButton } from "@/components/short-term-owner/MakeLiveButton";
import { useShortTermOwnerJourney } from "@/hooks/useShortTermOwnerJourney";
import { Loader2 } from "lucide-react";

interface PropertyListingReadinessProps {
  propertyMongoId: string;
  sourceOwnerSheetId?: string;
  onLive?: () => void;
}

export function PropertyListingReadiness({
  propertyMongoId,
  sourceOwnerSheetId,
  onLive,
}: PropertyListingReadinessProps) {
  const { journey, loading, refresh } = useShortTermOwnerJourney(
    sourceOwnerSheetId ? { ownerSheetId: sourceOwnerSheetId } : null,
    { enabled: Boolean(sourceOwnerSheetId) },
  );

  if (!sourceOwnerSheetId) return null;

  if (loading) {
    return (
      <div className="px-2 pb-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading readiness…
      </div>
    );
  }

  if (!journey) return null;

  return (
    <div className="px-2 pb-3 space-y-2 border-t border-dashed">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-2">
        Short-term go-live checklist
      </p>
      <ShortTermOwnerJourney
        steps={journey.steps}
        readyToGoLive={journey.readyToGoLive}
        missingSteps={journey.missingSteps}
        ownerStepsOnly
      />
      <MakeLiveButton
        propertyMongoId={propertyMongoId}
        readyToGoLive={journey.readyToGoLive}
        missingSteps={journey.missingSteps}
        onSuccess={() => {
          void refresh();
          onLive?.();
        }}
        className={
          journey.readyToGoLive ? "bg-emerald-600 hover:bg-emerald-700 w-full" : "w-full"
        }
      />
    </div>
  );
}
