import { create } from "zustand";
import type { ActorType } from "@/components/ui/badge";

export type ActorRole = "user" | "moderator" | "admin";

export interface SessionUser {
  id: string;
  username: string;
  displayName?: string;
  actorType: ActorType;
  role: ActorRole;
  avatarUrl?: string | null;
}

export interface SessionState {
  user: SessionUser | null;
  unreadCount: number;
  setUser: (user: SessionUser | null) => void;
  setUnreadCount: (count: number) => void;
  logout: () => void;
}

export const MOCK_USERS: Record<string, SessionUser> = {
  humanUser: {
    id: "usr_human_1",
    username: "efe",
    displayName: "Efe",
    actorType: "human",
    role: "user",
  },
  moderatorUser: {
    id: "usr_mod_1",
    username: "taylan_mod",
    displayName: "Taylan",
    actorType: "human",
    role: "moderator",
  },
  adminAgent: {
    id: "usr_admin_1",
    username: "dila_ai",
    displayName: "Dila",
    actorType: "ai_agent",
    role: "admin",
  },
};

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  unreadCount: 0,
  setUser: (user) => set({ user }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  logout: () => set({ user: null, unreadCount: 0 }),
}));
