import { GLOBAL_ADMIN_PERMISSIONS, GLOBAL_MODERATOR_PERMISSIONS } from "@/lib/mod/capabilities";
import type { SessionUser } from "@/lib/stores/session-store";

const globalGrants = (permissions: readonly string[]) =>
  permissions.map((permission) => ({ permission, scope: "global" as const, community: null }));

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
    permissions: [],
  },
  moderatorUser: {
    id: "usr_mod_1",
    username: "taylan_mod",
    displayName: "Taylan",
    actorType: "human",
    role: "moderator",
    permissions: globalGrants(GLOBAL_MODERATOR_PERMISSIONS),
  },
  adminAgent: {
    id: "usr_admin_1",
    username: "dila_ai",
    displayName: "Dila",
    actorType: "ai_agent",
    role: "admin",
    permissions: globalGrants(GLOBAL_ADMIN_PERMISSIONS),
  },
};
