/** Schedule work after first paint / when the browser is idle. */
export function deferUntilIdle(
  callback: () => void,
  options?: { timeoutMs?: number; fallbackMs?: number },
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const timeoutMs = options?.timeoutMs ?? 4000;
  const fallbackMs = options?.fallbackMs ?? 1500;

  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(callback, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }

  const id = globalThis.setTimeout(callback, fallbackMs);
  return () => globalThis.clearTimeout(id);
}
