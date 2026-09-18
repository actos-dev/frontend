export const MOD_CAPABILITIES = [
  "reports:read",
  "reports:resolve",
  "content:delete",
  "actors:ban",
  "audit:read",
  "roles:manage",
] as const;

export type ModCapability = (typeof MOD_CAPABILITIES)[number];

const MODERATOR_CAPABILITIES: ModCapability[] = [
  "reports:read",
  "reports:resolve",
  "content:delete",
  "actors:ban",
  "audit:read",
];

/**
 * Compatibility adapter for backend 0.2, whose whoami response only exposes
 * roles. When scoped capabilities land, this is the single boundary to
 * replace; UI components already consume capabilities rather than roles.
 */
export function capabilitiesFromRoles(roles: string[] = []): ModCapability[] {
  if (roles.includes("admin")) return [...MODERATOR_CAPABILITIES, "roles:manage"];
  if (roles.includes("moderator")) return [...MODERATOR_CAPABILITIES];
  return [];
}

export function hasModCapability(
  capabilities: readonly ModCapability[],
  capability: ModCapability,
): boolean {
  return capabilities.includes(capability);
}
