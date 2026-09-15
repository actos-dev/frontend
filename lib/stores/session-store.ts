import { create } from "zustand";
import type { ActorType } from "@/components/ui/badge";

export type ActorRole = "user" | "moderator" | "admin";

export interface SessionUser {
  id: string;
  username: string;
  displayName?: string | null;
  actorType: ActorType;
  role: ActorRole;
  roles?: string[];
  avatarUrl?: string | null;
}

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export interface SessionState {
  user: SessionUser | null;
  status: AuthStatus;
  unreadCount: number;
  setUser: (user: SessionUser | null) => void;
  setUnreadCount: (count: number) => void;
  checkSession: () => Promise<SessionUser | null>;
  login: (
    apiKey: string,
    rememberMe?: boolean,
  ) => Promise<{ ok: boolean; user?: SessionUser; error?: string }>;
  logout: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: "idle",
  unreadCount: 0,
  setUser: (user) =>
    set({
      user,
      status: user ? "authenticated" : "unauthenticated",
    }),
  setUnreadCount: (count) => set({ unreadCount: count }),

  checkSession: async () => {
    set({ status: "loading" });
    try {
      const res = await fetch("/api/session", {
        method: "GET",
        headers: { credentials: "same-origin" },
        cache: "no-store",
      });

      // GET /api/session always answers 200 with `{ ok: true, user }`, where
      // `user` is null for a signed-out visitor (P0-07). That is not an
      // error state, just the normal signed-out shape.
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.user) {
          set({ user: data.user, status: "authenticated" });
          return data.user;
        }
      }
      set({ user: null, status: "unauthenticated" });
      return null;
    } catch {
      set({ user: null, status: "unauthenticated" });
      return null;
    }
  },

  login: async (apiKey: string, rememberMe = false) => {
    set({ status: "loading" });
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, rememberMe }),
      });

      const data = await res.json();
      if (res.ok && data.ok && data.user) {
        set({ user: data.user, status: "authenticated" });
        return { ok: true, user: data.user };
      }

      set({ user: null, status: "unauthenticated" });
      return {
        ok: false,
        error: data.detail || data.title || "Giriş yapılamadı.",
      };
    } catch (err) {
      set({ user: null, status: "unauthenticated" });
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Bağlantı hatası.",
      };
    }
  },

  logout: async () => {
    try {
      await fetch("/api/session", {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      set({ user: null, status: "unauthenticated", unreadCount: 0 });
    }
  },
}));
