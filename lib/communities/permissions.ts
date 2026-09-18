import type { PermissionSummary } from "actos";

/**
 * The community-scoped permission vocabulary from the 0.3.0 API
 * (`actos-core::auth::Permission`). Keeping the list in one place means the
 * mod console, the global permissions screen and the tests all agree on what
 * a grant means; no component ever branches on a role name.
 *
 * `audit.view` is deliberately absent: it is global-only and never scoped to
 * a community.
 */
export const COMMUNITY_PERMISSION_VOCABULARY = [
  "content.delete",
  "community.edit",
  "community.close",
  "member.invite",
  "member.approve",
  "member.kick",
  "member.ban",
  "role.grant",
  "report.view",
  "report.resolve",
] as const;

export type CommunityPermission = (typeof COMMUNITY_PERMISSION_VOCABULARY)[number];

export const GLOBAL_PERMISSION_VOCABULARY = [
  ...COMMUNITY_PERMISSION_VOCABULARY,
  "audit.view",
] as const;

export type GlobalPermission = (typeof GLOBAL_PERMISSION_VOCABULARY)[number];

/**
 * The capability booleans the community mod screen renders from. `isOwner` is
 * a separate signal because the owner implicitly holds every community
 * permission even before a grant row exists for them.
 */
export interface CommunityCapabilities {
  canEdit: boolean;
  canClose: boolean;
  canInvite: boolean;
  canApprove: boolean;
  canKick: boolean;
  canBan: boolean;
  canDeleteContent: boolean;
  canViewReports: boolean;
  canResolveReports: boolean;
  canGrant: boolean;
}

/**
 * True when a scoped grant applies to this community: either a global grant or
 * a grant scoped to the community's name. The API remains the authority — this
 * only decides which controls to render.
 */
export function permissionAppliesToCommunity(
  grant: Pick<PermissionSummary, "scope" | "community">,
  communityName: string,
): boolean {
  return grant.scope === "global" || grant.community === communityName;
}

export function communityCapabilities(
  permissions: readonly PermissionSummary[] = [],
  communityName: string,
  isOwner = false,
): CommunityCapabilities {
  const held = new Set<CommunityPermission>();
  if (isOwner) {
    for (const permission of COMMUNITY_PERMISSION_VOCABULARY) held.add(permission);
  }
  for (const grant of permissions) {
    if (!permissionAppliesToCommunity(grant, communityName)) continue;
    if ((COMMUNITY_PERMISSION_VOCABULARY as readonly string[]).includes(grant.permission)) {
      held.add(grant.permission as CommunityPermission);
    }
  }

  return {
    canEdit: held.has("community.edit"),
    canClose: held.has("community.close"),
    canInvite: held.has("member.invite"),
    canApprove: held.has("member.approve"),
    canKick: held.has("member.kick"),
    canBan: held.has("member.ban"),
    canDeleteContent: held.has("content.delete"),
    canViewReports: held.has("report.view"),
    canResolveReports: held.has("report.resolve"),
    canGrant: held.has("role.grant"),
  };
}

export function hasAnyCommunityCapability(capabilities: CommunityCapabilities): boolean {
  return Object.values(capabilities).some(Boolean);
}
