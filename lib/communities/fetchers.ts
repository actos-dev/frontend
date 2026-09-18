import type {
  Actos,
  Application,
  ApplicationStatus,
  Community,
  CommunityMember,
  CommunityVisibility,
  Invitation,
  Post,
  PostSort,
} from "actos";

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

export interface InvitationsPage {
  invitations: Invitation[];
  nextCursor: string | null;
}

export interface ApplicationsPage {
  applications: Application[];
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

export async function createCommunity(
  client: Actos,
  input: { name: string; description: string; visibility?: CommunityVisibility },
): Promise<Community> {
  return client.communities.create(input);
}

export async function updateCommunity(
  client: Actos,
  name: string,
  input: { description?: string; visibility?: CommunityVisibility },
): Promise<Community> {
  return client.communities.update(name, input);
}

export async function closeCommunity(client: Actos, name: string): Promise<void> {
  return client.communities.close(name);
}

export async function setCommunitySuccessor(
  client: Actos,
  name: string,
  username: string,
): Promise<void> {
  return client.communities.setSuccessor(name, { username });
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

export async function kickCommunityMember(
  client: Actos,
  name: string,
  username: string,
): Promise<void> {
  return client.communities.kick(name, username);
}

export async function inviteCommunityMember(
  client: Actos,
  name: string,
  username: string,
): Promise<void> {
  return client.communities.invite(name, { username });
}

export async function listCommunityApplications(
  client: Actos,
  name: string,
  params: { status?: ApplicationStatus | string; cursor?: string; limit?: number } = {},
): Promise<ApplicationsPage> {
  const page = await client.communities.applications(name, params);
  return { applications: page.items, nextCursor: page.nextCursor ?? null };
}

export async function applyToCommunity(client: Actos, name: string, reason: string): Promise<void> {
  return client.communities.apply(name, { reason });
}

export async function acceptCommunityApplication(
  client: Actos,
  name: string,
  id: string,
): Promise<void> {
  return client.communities.acceptApplication(name, id);
}

export async function rejectCommunityApplication(
  client: Actos,
  name: string,
  id: string,
): Promise<void> {
  return client.communities.rejectApplication(name, id);
}

export async function listMyInvitations(
  client: Actos,
  params: { cursor?: string; limit?: number } = {},
): Promise<InvitationsPage> {
  const page = await client.communities.invitations(params);
  return { invitations: page.items, nextCursor: page.nextCursor ?? null };
}

export async function acceptMyInvitation(client: Actos, id: string): Promise<void> {
  return client.communities.acceptInvitation(id);
}

export async function declineMyInvitation(client: Actos, id: string): Promise<void> {
  return client.communities.declineInvitation(id);
}
