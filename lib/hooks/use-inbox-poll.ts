"use client";

import { useEffect, useRef } from "react";
import { useSessionStore } from "@/lib/stores/session-store";

export interface UseInboxPollOptions {
  /**
   * Polling interval in ms when the browser tab is active/visible.
   * Default: 30,000 ms (30 seconds)
   */
  activeInterval?: number;

  /**
   * Polling interval in ms when the browser tab is hidden/backgrounded.
   * Default: 120,000 ms (120 seconds)
   */
  hiddenInterval?: number;

  /**
   * Explicit override to enable or disable polling.
   * Defaults to true if user is logged in, false otherwise.
   */
  enabled?: boolean;

  /**
   * Callback fired when unreadCount is updated.
   */
  onCountUpdated?: (count: number) => void;
}

/**
 * Visibility-aware background polling hook for inbox unreadCount.
 * Adheres to Plan §Faz 13:
 * - Active tab: polls every 30 seconds.
 * - Background/hidden tab (document.visibilityState === 'hidden'): slows to 120 seconds.
 * - Tab returns to visible: immediately polls and restarts active 30s cycle.
 * - Sızıntısız temizleme: AbortController cancels in-flight fetches, timers are cleared on unmount.
 */
export function useInboxPoll(options?: UseInboxPollOptions) {
  const {
    activeInterval = 30_000,
    hiddenInterval = 120_000,
    enabled,
    onCountUpdated,
  } = options || {};

  const user = useSessionStore((state) => state.user);
  const userId = user?.id ?? null;
  const setUnreadCount = useSessionStore((state) => state.setUnreadCount);

  const isEnabled = enabled !== undefined ? enabled : Boolean(user);

  const onCountUpdatedRef = useRef(onCountUpdated);
  onCountUpdatedRef.current = onCountUpdated;

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    let timerId: ReturnType<typeof setTimeout> | null = null;
    let abortController: AbortController | null = null;
    let isDisposed = false;

    const poll = async () => {
      if (isDisposed) return;

      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();

      try {
        const res = await fetch("/api/inbox/count", {
          method: "GET",
          signal: abortController.signal,
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (res.ok) {
          const data = await res.json();
          const count =
            typeof data.unread_count === "number"
              ? data.unread_count
              : typeof data.unreadCount === "number"
                ? data.unreadCount
                : 0;

          if (!isDisposed && useSessionStore.getState().user?.id === userId) {
            setUnreadCount(count);
            onCountUpdatedRef.current?.(count);
          }
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          return;
        }
        // Network or offline errors handled silently
      }
    };

    const getDelay = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return hiddenInterval;
      }
      return activeInterval;
    };

    const scheduleNext = () => {
      if (isDisposed) return;
      const delay = getDelay();
      timerId = setTimeout(async () => {
        await poll();
        scheduleNext();
      }, delay);
    };

    // Immediate initial poll on hook activation
    poll();
    scheduleNext();

    const handleVisibilityChange = () => {
      if (isDisposed) return;
      if (timerId) {
        clearTimeout(timerId);
      }
      // When tab becomes visible again, poll immediately and schedule with active delay
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        poll();
      }
      scheduleNext();
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isDisposed = true;
      if (timerId) {
        clearTimeout(timerId);
      }
      if (abortController) {
        abortController.abort();
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [isEnabled, userId, activeInterval, hiddenInterval, setUnreadCount]);
}
