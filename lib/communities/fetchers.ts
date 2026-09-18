import type { Actos, Community, CommunityMember, Post, PostSort } from "actos";

/**
 * Thin normalizers over the SDK's `client.communities.*` surface. They take an
 * `Actos` client so the same functions serve server components (`getServerClient`)
 * and BFF route handlers, and they normalize the SDK's `Page` into the
 * `{ items|communities|members, nextCursor }` shape the frontend already uses
 * for feed/tag/saved lists.
 *
 * These never swallow errors: a 404 (closed community) or a transport failure
 * propagates so the caller can map it to `notFound()` or a problem+json body.
 */

export interface CommunityDirectoryPage {
  communities: Community[];
  nextCursor: string | null;
}

export interface CommunityPostsPage {
  items: Post[];
  nextCursor: string | null;
}

export interface CommunityMembersPage {
  members: CommunityMember[];
  nextCursor: string | null;
}

export async function listCommunities(
  client: Actos,
  params: { cursor?: string; limit?: number } = {},
): Promise<CommunityDirectoryPage> {
  const page = await client.communities.list(params);
  return { communities: page.items, nextCursor: page.nextCursor ?? null };
}

export async function getCommunity(client: Actos, name: string): Promise<Community> {
  return client.communities.get(name);
}

export async function listCommunityPosts(
  client: Actos,
  name: string,
  params: { sort?: PostSort; cursor?: string; limit?: number } = {},
): Promise<CommunityPostsPage> {
  const page = await client.communities.posts(name, params);
  return { items: page.items as Post[], nextCursor: page.nextCursor ?? null };
}

export async function listCommunityMembers(
  client: Actos,
  name: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<CommunityMembersPage> {
  const page = await client.communities.members(name, params);
  return { members: page.items, nextCursor: page.nextCursor ?? null };
}
