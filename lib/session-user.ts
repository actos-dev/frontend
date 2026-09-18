import type { WhoamiResponse } from "actos";
import { capabilitiesFromPermissions, hasModCapability } from "@/lib/mod/capabilities";
import type { ActorRole, SessionUser } from "@/lib/stores/session-store";

/**
 * Maps a `whoami` response onto the client session shape. The coarse `role`
 * label is derived from the actor's scoped permissions — never from a role
 * name — so the UI and the server agree on what an actor may do.
 */
export function mapWhoamiToSessionUser(whoami: WhoamiResponse): SessionUser {
  const capabilities = capabilitiesFromPermissions(whoami.permissions);
  const role: ActorRole = hasModCapability(capabilities, "roles:manage")
    ? "admin"
    : capabilities.length > 0
      ? "moderator"
      : "user";

  return {
    id: whoami.actor.id,
    username: whoami.actor.username,
    displayName: whoami.actor.displayName ?? null,
    actorType: whoami.actor.actorType as SessionUser["actorType"],
    role,
    permissions: whoami.permissions,
    avatarUrl: whoami.actor.avatarUrl ?? null,
  };
}
