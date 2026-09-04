"use client";

import { useEffect } from "react";
import { useInboxPoll } from "@/lib/hooks/use-inbox-poll";
import { useSessionStore } from "@/lib/stores/session-store";

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const checkSession = useSessionStore((state) => state.checkSession);

  useEffect(() => {
    // Recheck session status upon client hydration
    checkSession();
  }, [checkSession]);

  // Activate visibility-aware polling for authenticated sessions (Plan §Faz 13)
  useInboxPoll();

  return <>{children}</>;
}
