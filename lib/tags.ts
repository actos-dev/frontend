import { unstable_cache } from "next/cache";
import { getAnonymousClient } from "@/lib/actos";

export interface PopularTag {
  name: string;
  count: number;
}

// Cached for 5 minutes. It throws on failure, so a transient backend error is
// never cached: the next request retries instead of hiding the rail for the
// whole revalidation window.
const fetchPopularTags = unstable_cache(
  async (): Promise<PopularTag[]> => {
    const client = getAnonymousClient();
    const page = await client.tags.popular({ limit: 8 });
    return page.items.map((tag) => ({ name: tag.name, count: tag.postCount }));
  },
  ["popular-tags"],
  { revalidate: 300 },
);

/**
 * Fetches the most popular tags (by post count) for the right rail, using
 * the anonymous SDK client so it works for signed-out visitors too.
 *
 * Returns `null` on any error. Callers must never substitute invented data
 * for a failed fetch (see ROADMAP.md P0-05 / decision 7).
 */
export async function getPopularTags(): Promise<PopularTag[] | null> {
  try {
    return await fetchPopularTags();
  } catch (error) {
    console.warn("Actos API /tags fetch failed:", error);
    return null;
  }
}
