import type { FeedDensityOption } from "@/components/feed/feed-nav";

export const FEED_DENSITY_COOKIE = "actos_feed_density";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isFeedDensity(value: unknown): value is FeedDensityOption {
  return value === "card" || value === "compact";
}

export function parseFeedDensityCookie(cookieHeader: string | null | undefined): FeedDensityOption {
  if (!cookieHeader) return "card";
  const match = cookieHeader.match(/(?:^|;\s*)actos_feed_density=([^;]+)/);
  const value = match?.[1];
  return isFeedDensity(value) ? value : "card";
}

export function getClientFeedDensity(): FeedDensityOption {
  return typeof document === "undefined" ? "card" : parseFeedDensityCookie(document.cookie);
}

/** Store a device-local preference using the same persistent cookie model as theme and language. */
export function setFeedDensityPreference(density: FeedDensityOption): void {
  if (!isFeedDensity(density) || typeof document === "undefined") return;
  document.cookie = `${FEED_DENSITY_COOKIE}=${density}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}
