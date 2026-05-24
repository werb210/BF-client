import { useEffect, useRef } from "react";

type PollFn = () => void | Promise<void>;

export function useVisiblePoll(fetchFn: PollFn, intervalMs: number): void {
  const fetchRef = useRef(fetchFn);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const runFetch = () => {
      void fetchRef.current();
    };

    const clearPoll = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const startPoll = () => {
      clearPoll();
      intervalRef.current = window.setInterval(runFetch, intervalMs);
    };

    const handleVisibleState = () => {
      if (document.visibilityState === "visible") {
        runFetch();
        startPoll();
      } else {
        clearPoll();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState !== "visible") return;
      runFetch();
      startPoll();
    };

    if (document.visibilityState === "visible") {
      runFetch();
      startPoll();
    }

    document.addEventListener("visibilitychange", handleVisibleState);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibleState);
      window.removeEventListener("focus", handleFocus);
      clearPoll();
    };
  }, [intervalMs]);
}
