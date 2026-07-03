import { create } from "zustand";

import { TokenInterface } from "./util/type";

type State = {
  token: TokenInterface | null;
};

type Actions = {
  setToken: (token: TokenInterface) => void;
  clearToken: () => void;
  hydrateFromStorage: () => void;
};

export const useAuthStore = create<State & Actions>((set) => ({
  token: null,
  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("token");
      set({ token: stored ? (JSON.parse(stored) as TokenInterface) : null });
    } catch {
      set({ token: null });
    }
  },
  setToken: (token: TokenInterface) => {
    set({ token });
    if (typeof window !== "undefined") {
      localStorage.setItem("token", JSON.stringify(token));
    }
  },

  clearToken: () => {
    set({ token: null });
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  },
}));
