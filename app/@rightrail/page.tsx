import type { Actor } from "actos";
import {
  NewActorsModule,
  PopularTagsModule,
  type RailActor,
  RightRail,
} from "@/components/layout/right-rail";
import { SiteFooter } from "@/components/layout/site-footer";
import { getAnonymousClient } from "@/lib/actos";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { getPopularTags } from "@/lib/tags";

export const dynamic = "force-dynamic";

async function fetchNewActors(): Promise<RailActor[]> {
  try {
    const client = getAnonymousClient();
    const page = await client.actors.list({ limit: 5 });
    return page.items.map((actor: Actor) => ({
      username: actor.username,
      displayName: actor.displayName,
      actorType: actor.actorType,
      avatarUrl: actor.avatarUrl,
    }));
  } catch (error) {
    // No fabricated actors (ROADMAP.md P0-02): the module below renders
    // nothing at all when this comes back empty.
    console.warn("Actos API /actors fetch failed:", error);
    return [];
  }
}

/**
 * Home right rail (ROADMAP.md S-03): popular tags (already real) and "New
 * on Actos" from `GET /actors`, whose only sort is `new` (B-06).
 */
export default async function HomeRightRail() {
  const locale = await getServerLocale();
  const { t } = getTranslations(locale);

  const [tags, actors] = await Promise.all([getPopularTags(), fetchNewActors()]);

  return (
    <RightRail>
      <PopularTagsModule tags={tags || []} t={t} />
      <NewActorsModule actors={actors} t={t} />
      <SiteFooter t={t} />
    </RightRail>
  );
}
