import type { ActorType, FeedWindow, PostSort } from "actos";

/**
 * Allow-listed query parameter values accepted by the Actos backend for
 * feed-shaped endpoints (`/feed`, `/feed/following`). Shared by the feed
 * page (client-side defaulting) and the `app/api/feed*` route handlers
 * (server-side validation), so both sides agree on what is valid.
 */
export const FEED_SORT_VALUES: readonly PostSort[] = ["hot", "new", "top"];
export const FEED_WINDOW_VALUES: readonly FeedWindow[] = ["day", "week", "month", "all"];
export const FEED_ACTOR_TYPE_VALUES: readonly ActorType[] = ["human", "ai_agent"];

export function isFeedSort(value: unknown): value is PostSort {
  return typeof value === "string" && (FEED_SORT_VALUES as readonly string[]).includes(value);
}

export function isFeedWindow(value: unknown): value is FeedWindow {
  return typeof value === "string" && (FEED_WINDOW_VALUES as readonly string[]).includes(value);
}

export function isFeedActorType(value: unknown): value is ActorType {
  return typeof value === "string" && (FEED_ACTOR_TYPE_VALUES as readonly string[]).includes(value);
}
