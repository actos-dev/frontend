import type { Actos } from "actos";

/**
 * A viewer's vote value for one piece of content: 1 (up), -1 (down), or 0
 * (no vote / cleared).
 */
export type VoteValue = -1 | 0 | 1;

/** Maps a content id to the signed-in viewer's vote value for it. */
export type VoteMap = Record<string, VoteValue>;

/** The backend's own cap on the `content_ids` list for `/me/votes`. */
export const MAX_VOTE_IDS = 100;

function normalizeVoteMap(raw: Record<string, number>, ids: string[]): VoteMap {
  const votes: VoteMap = {};
  for (const id of ids) {
    const value = raw[id];
    votes[id] = value === 1 || value === -1 ? value : 0;
  }
  return votes;
}

/**
 * Server-side: fetch the signed-in viewer's votes for a page of content ids
 * directly through the SDK (ROADMAP.md P0-06). Callers must already know the
 * viewer is authenticated (see `hasSessionCookie` in `lib/actos.ts`) — this
 * never guesses from the client instance, and never throws: a failed lookup
 * degrades to "no vote known" rather than taking the page down
 * (ROADMAP.md P0-02, decision 7).
 */
export async function fetchVoteMap(client: Actos, ids: string[]): Promise<VoteMap> {
  const uniqueIds = Array.from(new Set(ids)).slice(0, MAX_VOTE_IDS);
  if (uniqueIds.length === 0) return {};

  try {
    const raw = await client.votes.list(uniqueIds);
    return normalizeVoteMap(raw, uniqueIds);
  } catch {
    return {};
  }
}

/**
 * Client-side: fetch the signed-in viewer's votes for newly appended ids
 * (pagination, search results) from the `/api/me/votes` route handler.
 * Returns `{}` on any failure or when `ids` is empty. Callers must only call
 * this for an authenticated viewer — anonymous viewers must not trigger the
 * request at all (ROADMAP.md P0-06).
 */
export async function fetchVoteMapClient(ids: string[]): Promise<VoteMap> {
  const uniqueIds = Array.from(new Set(ids)).slice(0, MAX_VOTE_IDS);
  if (uniqueIds.length === 0) return {};

  try {
    const res = await fetch(
      `/api/me/votes?content_ids=${encodeURIComponent(uniqueIds.join(","))}`,
      { cache: "no-store" },
    );
    if (!res.ok) return {};
    const data = await res.json();
    if (!data?.ok || !data.votes) return {};
    return normalizeVoteMap(data.votes, uniqueIds);
  } catch {
    return {};
  }
}
