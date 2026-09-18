import type { CommunityVisibility, PostSort } from "actos";

/**
 * Query parameters and response-shape helpers for the 0.3.0 communities API
 * (ROADMAP.md Phase 7). Shared by the server pages and the `app/api/communities*`
 * route handlers so both sides agree on what is valid.
 *
 * The real 0.3 contract differs from ROADMAP §7.3 in three places this module
 * encodes deliberately:
 * - the directory has no `q`/`sort` (BE-017), so only pagination is accepted;
 * - `GET /communities/{name}` has no `viewer_capabilities`/`application_status`/
 *   `banned` (BE-018), so a cover is inferred from `visibility` + `isMember`;
 * - post lists live at `/communities/{name}/posts`, not `/feed`.
 */
export const COMMUNITY_POST_SORT_VALUES: readonly PostSort[] = ["new", "top", "hot"];
export const COMMUNITY_VISIBILITY_VALUES: readonly CommunityVisibility[] = ["public", "private"];
export const APPLICATION_STATUS_VALUES = ["pending", "accepted", "rejected"] as const;

export type ApplicationStatusValue = (typeof APPLICATION_STATUS_VALUES)[number];

export const COMMUNITY_PAGE_SIZE = 25;

export function isCommunityPostSort(value: unknown): value is PostSort {
  return (
    typeof value === "string" && (COMMUNITY_POST_SORT_VALUES as readonly string[]).includes(value)
  );
}

export function isApplicationStatus(value: unknown): value is ApplicationStatusValue {
  return (
    typeof value === "string" && (APPLICATION_STATUS_VALUES as readonly string[]).includes(value)
  );
}

export function isCommunityVisibility(value: unknown): value is CommunityVisibility {
  return (
    typeof value === "string" && (COMMUNITY_VISIBILITY_VALUES as readonly string[]).includes(value)
  );
}

/**
 * A private community whose inside the viewer may not see comes back as a
 * *cover*: the same summary shape with both counts zeroed and `isMember: false`
 * (there is no dedicated flag in 0.3.0 — BE-018). This is the single place that
 * decides cover-vs-full, so the page and the about page cannot disagree.
 */
export function isCommunityCover(community: { visibility: string; isMember: boolean }): boolean {
  return community.visibility === "private" && !community.isMember;
}

/** Parses and clamps the `limit` query parameter used by the BFF routes. */
export function parseCommunityLimit(raw: string | null): number | null {
  if (raw === null || raw === "") return COMMUNITY_PAGE_SIZE;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(parsed, 100);
}
