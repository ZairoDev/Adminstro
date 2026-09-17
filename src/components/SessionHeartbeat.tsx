"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/AuthStore";

// Client heartbeat cadence. Kept below the server's stale window so a session
// stays comfortably alive while the tab is open.
const HEARTBEAT_INTERVAL_MS = 25 * 1000;

const ALLOW_UNLOAD_FLAG = "__ADMINSTRO_ALLOW_UNLOAD__";

/**
 * Call this right before an INTENTIONAL navigation away / logout so the
 * "you're still logged in" warning does not nag the user on a deliberate exit.
 */
export function allowIntentionalUnload(): void {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, boolean>)[ALLOW_UNLOAD_FLAG] = true;
  }
}

/**
 * Keeps the web session alive while a tab is open, warns before an accidental
 * close, and fires a release beacon on close so the session frees up quickly.
 *
 * Mounted globally; it only does anything while the user is logged in.
 */
export default function SessionHeartbeat(): null {
  const token = useAuthStore((s) => s.token);
  const loggedIn = Boolean(token?.id);

  useEffect(() => {
    if (!loggedIn) return;

    const sendHeartbeat = () => {
      try {
        void fetch("/api/employee/session/heartbeat", {
          method: "POST",
          credentials: "include",
          headers: { "x-device-type": "web" },
          keepalive: true,
        }).catch(() => undefined);
      } catch {
        // ignore
      }
    };

    // Fire immediately (also clears any pending-release left by a refresh), then
    // on an interval.
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") sendHeartbeat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Warn before an accidental close/refresh/navigation-away. Browsers show a
    // generic, non-customizable message; returning a string is what triggers it.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const w = window as unknown as Record<string, boolean>;
      if (w[ALLOW_UNLOAD_FLAG]) return undefined;
      e.preventDefault();
      e.returnValue =
        "You are still logged in. Please use the Logout button before leaving.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // On actual unload, tell the server the tab is closing. sendBeacon is
    // reliable during unload. The server only marks pending-release; a refresh's
    // fresh heartbeat cancels it, so this never logs out on refresh.
    const onPageHide = () => {
      try {
        navigator.sendBeacon?.("/api/employee/session/release");
      } catch {
        // ignore
      }
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [loggedIn]);

  return null;
}
