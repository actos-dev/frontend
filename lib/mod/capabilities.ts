import type { PermissionSummary } from "actos";

export const MOD_CAPABILITIES = [
  "reports:read",
  "reports:resolve",
  "content:delete",
  "actors:ban",
  "audit:read",
  "roles:manage",
] as const;

export type ModCapability = (typeof MOD_CAPABILITIES)[number];

/**
 * Backend permission vocabulary (0.3.0, `actos-core::auth::Permission`) mapped
 * onto the capabilities the moderation UI already consumes. The frontend never
 * reads a role name: authority is a set of scoped permission grants returned by
 * `GET /auth/whoami`, and this map is the only place that knows the dotted
 * strings.
 */
const PERMISSION_CAPABILITY_MAP: Record<string, ModCapability> = {
  "report.view": "reports:read",
  "report.resolve": "reports:resolve",
  "content.delete": "content:delete",
  "member.ban": "actors:ban",
  "audit.view": "audit:read",
  "role.grant": "roles:manage",
};

/**
 * Global permission bundles. The moderation panel is a platform-wide console,
 * so assigning a "role" through the legacy `/mod/roles` form expands into the
 * global grants a moderator or admin holds in 0.3.0. Community-scoped grants
 * are deliberately absent: they govern a single community, not this console.
 */
export const GLOBAL_MODERATOR_PERMISSIONS = [
  "report.view",
  "report.resolve",
  "content.delete",
  "member.ban",
  "audit.view",
] as const;

export const GLOBAL_ADMIN_PERMISSIONS = [...GLOBAL_MODERATOR_PERMISSIONS, "role.grant"] as const;

/**
 * Derives UI capabilities directly from the scoped permissions in `whoami`.
 *
 * A global grant unlocks the platform-wide `/mod` console; a community-scoped
 * grant does not, because every endpoint behind that console is justified by
 * `authz::has_global`. Scoped capabilities will get a community-aware surface
 * when the community screens land.
 */
export function capabilitiesFromPermissions(
  permissions: readonly PermissionSummary[] = [],
): ModCapability[] {
  const capabilities = new Set<ModCapability>();

  for (const grant of permissions) {
    if (grant.scope !== "global") continue;
    const capability = PERMISSION_CAPABILITY_MAP[grant.permission];
    if (capability) capabilities.add(capability);
  }

  return [...capabilities];
}

export function hasModCapability(
  capabilities: readonly ModCapability[],
  capability: ModCapability,
): boolean {
  return capabilities.includes(capability);
}
