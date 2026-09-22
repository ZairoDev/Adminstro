"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/AuthStore";

// Client heartbeat cadence. Kept below the server's stale window so a session
// stays comfortably alive while the tab is open.
const HEARTBEAT_INTERVAL_MS = 25 * 1000;

const ALLOW_UNLOAD_FLAG = "__ADMINSTRO_ALLOW_UNLOAD__";

function windowFlags(): Record<string, boolean | undefined> {
  return window as unknown as Record<string, boolean | undefined>;
}

/**
 * Call this right before an INTENTIONAL navigation away / logout so the
 * "you're still logged in" warning does not nag the user on a deliberate exit.
 */
export function allowIntentionalUnload(): void {
  if (typeof window !== "undefined") {
    windowFlags()[ALLOW_UNLOAD_FLAG] = true;
  }
}

function isAllowUnloadSet(): boolean {
  return Boolean(windowFlags()[ALLOW_UNLOAD_FLAG]);
}

function isSameOriginUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function getNavigationApi(): EventTarget | undefined {
  return (window as unknown as { navigation?: EventTarget }).navigation;
}

/**
 * Keeps the web session alive while a tab is open, warns only before an
 * accidental tab/window close, and fires a release beacon on a real unload
 * (not bfcache / browser-tab switch).
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

    // `beforeunload` also fires for in-app page changes, reloads, and history
    // traversal. Closing the tab does not emit a `navigate` / same-origin
    // link click, so we skip the warning whenever those happen first.
    let skipUnloadWarning = false;
    let skipUnloadWarningTimer: number | undefined;

    const skipNextUnloadWarning = () => {
      skipUnloadWarning = true;
      if (skipUnloadWarningTimer !== undefined) {
        window.clearTimeout(skipUnloadWarningTimer);
      }
      // Macrotask: `beforeunload` runs during this event's default action,
      // which is before setTimeout(0). A microtask would reset too early.
      skipUnloadWarningTimer = window.setTimeout(() => {
        skipUnloadWarning = false;
        skipUnloadWarningTimer = undefined;
      }, 0);
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("javascript:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      const linkTarget = anchor.getAttribute("target");
      if (linkTarget && linkTarget !== "_self") return;
      if (isSameOriginUrl(anchor.href)) skipNextUnloadWarning();
    };

    const onDocumentSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const action = form.getAttribute("action") || window.location.href;
      if (isSameOriginUrl(action)) skipNextUnloadWarning();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const isReload =
        event.key === "F5" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r");
      if (isReload) skipNextUnloadWarning();
    };

    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("submit", onDocumentSubmit, true);
    window.addEventListener("keydown", onKeyDown, true);

    const navigation = getNavigationApi();
    const onNavigate = () => skipNextUnloadWarning();
    navigation?.addEventListener("navigate", onNavigate);

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAllowUnloadSet() || skipUnloadWarning) return;
      e.preventDefault();
      e.returnValue =
        "You are still logged in. Please use the Logout button before leaving.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // Real unload only. `event.persisted` means the page is entering bfcache
    // (tab switch, app switch, back/forward) — not a close. Releasing then
    // kicks people who just checked email.
    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      try {
        navigator.sendBeacon?.("/api/employee/session/release");
      } catch {
        // ignore
      }
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(interval);
      if (skipUnloadWarningTimer !== undefined) {
        window.clearTimeout(skipUnloadWarningTimer);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("click", onDocumentClick, true);
      document.removeEventListener("submit", onDocumentSubmit, true);
      window.removeEventListener("keydown", onKeyDown, true);
      navigation?.removeEventListener("navigate", onNavigate);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [loggedIn]);

  return null;
}
