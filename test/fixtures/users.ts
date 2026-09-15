import type { SessionUser } from "@/lib/stores/session-store";

/**
 * Sample signed-in users for tests. Moved out of `lib/stores/session-store.ts`
 * (ROADMAP.md P0-02): production code must never import fixture data.
 */
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
