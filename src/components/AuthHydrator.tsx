"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/AuthStore";

/** Restores auth token from localStorage after mount so SSR and first client paint match. */
export function AuthHydrator() {
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return null;
}
