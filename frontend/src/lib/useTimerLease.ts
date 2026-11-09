import { useCallback, useEffect, useState } from "react";

// Web Locks reserves timer control across tabs in the same browser profile.
// Browser-only storage leases cannot make a simultaneous claim atomic.
export function useTimerLease(name: string, enabled: boolean) {
  const [status, setStatus] = useState<"idle" | "checking" | "owned" | "blocked" | "unavailable">(
    "idle"
  );
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    if (!navigator.locks) {
      setStatus("unavailable");
      return;
    }
    let disposed = false;
    let release: (() => void) | undefined;
    const controller = new AbortController();
    setStatus("checking");
    const waiting = window.setTimeout(() => {
      if (!disposed) setStatus("blocked");
    }, 200);
    const relinquish = () => {
      controller.abort();
      release?.();
    };
    window.addEventListener("pagehide", relinquish);
    void navigator.locks
      .request(name, { signal: controller.signal }, async (lock) => {
        window.clearTimeout(waiting);
        if (disposed) return;
        if (!lock) return;
        setStatus("owned");
        await new Promise<void>((resolve) => {
          release = resolve;
          if (disposed) resolve();
        });
      })
      .catch(() => {
        if (!disposed) setStatus("unavailable");
      });
    return () => {
      disposed = true;
      window.clearTimeout(waiting);
      window.removeEventListener("pagehide", relinquish);
      relinquish();
    };
  }, [name, enabled, attempt]);
  return { status, retry };
}
