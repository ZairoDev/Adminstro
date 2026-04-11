"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ORGANIZATIONS, type Organization } from "@/util/organizationConstants";

import { useOrgSelectionStore } from "./useOrgSelectionStore";

const LABELS: Record<Organization, string> = {
  VacationSaga: "VacationSaga",
  Holidaysera: "Holidaysera",
  HousingSaga: "HousingSaga",
};

type OrgSelectorModalProps = {
  userId: string | null;
  /** Orgs this user may choose (SuperAdmin: all three). */
  allowedOrganizations: readonly Organization[];
};

export function OrgSelectorModal({ userId, allowedOrganizations }: OrgSelectorModalProps) {
  const modalOpen = useOrgSelectionStore((s) => s.modalOpen);
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);
  const pendingOrg = useOrgSelectionStore((s) => s.pendingOrg);
  const isLocked = useOrgSelectionStore((s) => s.isLocked);
  const setPendingOrg = useOrgSelectionStore((s) => s.setPendingOrg);
  const setSelectedOrg = useOrgSelectionStore((s) => s.setSelectedOrg);
  const closeModalIfAllowed = useOrgSelectionStore((s) => s.closeModalIfAllowed);

  const mustPick = !isLocked && !selectedOrg;
  const open = modalOpen || mustPick;

  useEffect(() => {
    if (open && !pendingOrg && allowedOrganizations.length > 0) {
      setPendingOrg(allowedOrganizations[0] ?? null);
    }
  }, [open, pendingOrg, allowedOrganizations, setPendingOrg]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        if (mustPick) return;
        closeModalIfAllowed();
      }}
    >
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => {
          if (mustPick) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (mustPick) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Select organization</DialogTitle>
          <DialogDescription>
            Choose which organization you are working in for Sales Offer. This filters leads, offers,
            and templates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ORGANIZATIONS.filter((o) => allowedOrganizations.includes(o)).map((org) => (
            <button
              key={org}
              type="button"
              onClick={() => setPendingOrg(org)}
              className={cn(
                "rounded-lg border-2 p-4 text-left transition-colors hover:bg-muted/50",
                pendingOrg === org ? "border-primary bg-muted/30" : "border-border",
              )}
            >
              <div className="font-semibold">{LABELS[org]}</div>
            </button>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!mustPick ? (
            <Button type="button" variant="outline" onClick={() => closeModalIfAllowed()}>
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={!pendingOrg}
            onClick={() => {
              if (!pendingOrg) return;
              setSelectedOrg(pendingOrg, { persistDefault: true, userId });
            }}
          >
            Set as default
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
