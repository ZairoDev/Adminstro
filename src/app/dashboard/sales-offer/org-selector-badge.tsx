"use client";

import { Button } from "@/components/ui/button";

import { useOrgSelectionStore } from "./useOrgSelectionStore";

export function OrgSelectorBadge() {
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);
  const isLocked = useOrgSelectionStore((s) => s.isLocked);
  const initialized = useOrgSelectionStore((s) => s.initialized);
  const openChangeModal = useOrgSelectionStore((s) => s.openChangeModal);

  if (!initialized || !selectedOrg) {
    return (
      <div className="mb-4 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        Loading organization…
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
      <span className="text-sm text-muted-foreground">Working in</span>
      <span className="rounded-md bg-background px-2 py-0.5 text-sm font-medium">{selectedOrg}</span>
      {!isLocked ? (
        <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={openChangeModal}>
          Change default
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">(locked to your account)</span>
      )}
    </div>
  );
}
