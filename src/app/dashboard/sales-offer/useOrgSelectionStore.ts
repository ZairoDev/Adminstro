import { create } from "zustand";

import {
  DEFAULT_ORGANIZATION,
  ORGANIZATIONS,
  type Organization,
} from "@/util/organizationConstants";

function isOrganization(value: string): value is Organization {
  return (ORGANIZATIONS as readonly string[]).includes(value);
}

function storageKey(userId: string): string {
  return `salesOfferDefaultOrg:${userId}`;
}

type OrgSelectionState = {
  selectedOrg: Organization | null;
  /** True when org is fixed (HAdmin, employees by DB org). */
  isLocked: boolean;
  initialized: boolean;
  /** SuperAdmin must pick org on first visit; modal cannot be dismissed empty. */
  modalOpen: boolean;
  /** Highlighted choice in modal before confirming. */
  pendingOrg: Organization | null;
  setPendingOrg: (org: Organization | null) => void;
  setSelectedOrg: (org: Organization, options?: { persistDefault?: boolean; userId?: string | null }) => void;
  openChangeModal: () => void;
  closeModalIfAllowed: () => void;
  /**
   * Resolve org from role + employee record + localStorage (SuperAdmin).
   */
  initialize: (params: {
    role: string;
    userId: string | null;
    employeeOrg?: string | null;
  }) => void;
};

export const useOrgSelectionStore = create<OrgSelectionState>((set, get) => ({
  selectedOrg: null,
  isLocked: false,
  initialized: false,
  modalOpen: false,
  pendingOrg: null,

  setPendingOrg: (org) => set({ pendingOrg: org }),

  setSelectedOrg: (org, options) => {
    const { persistDefault = false, userId = null } = options ?? {};
    if (persistDefault && userId && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey(userId), org);
      } catch {
        // ignore
      }
    }
    set({ selectedOrg: org, modalOpen: false, pendingOrg: null });
  },

  openChangeModal: () => {
    const { selectedOrg, isLocked } = get();
    if (isLocked) return;
    set({
      modalOpen: true,
      pendingOrg: selectedOrg,
    });
  },

  closeModalIfAllowed: () => {
    const { selectedOrg, isLocked } = get();
    if (isLocked) {
      set({ modalOpen: false });
      return;
    }
    if (selectedOrg) {
      set({ modalOpen: false, pendingOrg: null });
    }
  },

  initialize: ({ role, userId, employeeOrg }) => {
    const r = role.trim();

    if (r === "HAdmin") {
      set({
        selectedOrg: "Holidaysera",
        isLocked: true,
        initialized: true,
        modalOpen: false,
        pendingOrg: null,
      });
      return;
    }

    if (r !== "SuperAdmin") {
      const raw = employeeOrg && isOrganization(employeeOrg) ? employeeOrg : DEFAULT_ORGANIZATION;
      set({
        selectedOrg: raw,
        isLocked: true,
        initialized: true,
        modalOpen: false,
        pendingOrg: null,
      });
      return;
    }

    // SuperAdmin (and test-superadmin with real flow): prefer localStorage
    let stored: Organization | null = null;
    if (userId && typeof window !== "undefined") {
      try {
        const v = localStorage.getItem(storageKey(userId));
        if (v && isOrganization(v)) stored = v;
      } catch {
        stored = null;
      }
    }

    if (stored) {
      set({
        selectedOrg: stored,
        isLocked: false,
        initialized: true,
        modalOpen: false,
        pendingOrg: null,
      });
      return;
    }

    set({
      selectedOrg: null,
      isLocked: false,
      initialized: true,
      modalOpen: true,
      pendingOrg: null,
    });
  },
}));
