"use client";

import { useEffect } from "react";

/**
 * Axios Provider Component
 * 
 * Initializes axios interceptors on the client side.
 * This component should be included in the root layout.
 */
export function AxiosProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Import and set up axios interceptors on client side
    import("@/lib/axios");
  }, []);

  return <>{children}</>;
}

