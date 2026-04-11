"use client";

import { useEffect, useState } from "react";

import axios from "@/util/axios";
import { useAuthStore } from "@/AuthStore";
import { ORGANIZATIONS } from "@/util/organizationConstants";

import { OrgSelectorBadge } from "./org-selector-badge";
import { OrgSelectorModal } from "./org-selector-modal";
import { useOrgSelectionStore } from "./useOrgSelectionStore";

export default function SalesOfferLayout({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const initialize = useOrgSelectionStore((s) => s.initialize);
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);
  const initialized = useOrgSelectionStore((s) => s.initialized);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const role = String(token?.role ?? "").trim();
      const userId = token?.id ?? null;

      if (!userId) {
        if (!cancelled) setReady(true);
        return;
      }

      if (role === "HAdmin") {
        initialize({ role, userId });
        if (!cancelled) setReady(true);
        return;
      }

      if (role === "SuperAdmin") {
        initialize({ role, userId, employeeOrg: undefined });
        if (!cancelled) setReady(true);
        return;
      }

      let employeeOrg: string | undefined;
      try {
        const res = await axios.post("/api/employee/getEmployeeDetails", { userId });
        const org = res.data?.data?.organization;
        employeeOrg = typeof org === "string" ? org : undefined;
      } catch {
        employeeOrg = undefined;
      }

      initialize({ role, userId, employeeOrg });
      if (!cancelled) setReady(true);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token?.id, token?.role, initialize]);

  if (!ready) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Loading Sales Offer…
      </div>
    );
  }

  /** SuperAdmin must choose an org before sub-pages fetch data. */
  const awaitingOrgPick = initialized && !selectedOrg;

  return (
    <div className="px-2 pb-6">
      <OrgSelectorModal userId={token?.id ?? null} allowedOrganizations={ORGANIZATIONS} />
      {awaitingOrgPick ? (
        <div className="p-4 text-sm text-muted-foreground">
          Select an organization in the dialog above to continue.
        </div>
      ) : (
        <>
          <OrgSelectorBadge />
          {children}
        </>
      )}
    </div>
  );
}
