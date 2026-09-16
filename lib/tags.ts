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

/**
 * The exact post count for one tag, for the tag page's right rail
 * (ROADMAP.md S-03). There is no `GET /tags/{name}` endpoint, so this looks
 * the tag up in the popular list first; a tag that doesn't crack the top
 * 100 there falls back to the size of its own (live) posts page, which is
 * an honest floor rather than an invented total.
 *
 * Returns `null` only on a real fetch failure — never fabricated (P0-02).
 */
export async function getTagPostCount(name: string): Promise<number | null> {
  const client = getAnonymousClient();

  try {
    const popular = await client.tags.popular({ limit: 100 });
    const match = popular.items.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
    if (match) {
      return match.postCount;
    }

    const posts = await client.tags.posts(name, { limit: 25 });
    return posts.items.length;
  } catch (error) {
    console.warn("Actos API tag post-count fetch failed:", error);
    return null;
  }
}
