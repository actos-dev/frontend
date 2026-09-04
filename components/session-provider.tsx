"use client";

import { useEffect } from "react";
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

  return <>{children}</>;
}
