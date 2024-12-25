import { create } from "zustand";

import { TokenInterface } from "./util/type";

type State = {
  token: TokenInterface | null;
};

type Actions = {
  setToken: (token: TokenInterface) => void;
  clearToken: () => void;
};

export const useAuthStore = create<State & Actions>((set) => ({
  token:
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("token") || "null")
      : null,
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
