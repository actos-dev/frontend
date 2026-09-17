"use client";

import { useEffect, useRef } from "react";

interface UseInfiniteSentinelOptions {
  enabled: boolean;
  onIntersect: () => Promise<void> | void;
}

/** Observe a small sentinel near the end of a list to request its next page. */
export function useInfiniteSentinel({ enabled, onIntersect }: UseInfiniteSentinelOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onIntersect);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    callbackRef.current = onIntersect;
    enabledRef.current = enabled;
  }, [enabled, onIntersect]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!enabled || !target || typeof IntersectionObserver === "undefined") return;

    let requestPending = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!enabledRef.current || requestPending) return;
        if (entries.some((entry) => entry.isIntersecting)) {
          requestPending = true;
          void Promise.resolve(callbackRef.current()).finally(() => {
            requestPending = false;
          });
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled]);

  return sentinelRef;
}
