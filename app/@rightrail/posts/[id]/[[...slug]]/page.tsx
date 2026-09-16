import {
  AuthorCardModule,
  MoreFromAuthorModule,
  type RailAuthor,
  type RailPost,
  RightRail,
} from "@/components/layout/right-rail";
import { SiteFooter } from "@/components/layout/site-footer";
import { getServerClient } from "@/lib/actos";
import { getServerLocale, getTranslations } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface PostRightRailProps {
  params: Promise<{ id: string; slug?: string[] }>;
}

/**
 * Post right rail (ROADMAP.md S-03): an author card plus "More from
 * @author" (3 posts, `GET /actors/{username}/posts`). Degrades to the
 * footer-only default on any fetch failure — a broken rail never takes the
 * post page itself down (X-20).
 */
export default async function PostRightRail({ params }: PostRightRailProps) {
  const { id } = await params;
  const locale = await getServerLocale();
  const { t } = getTranslations(locale);

  let author: RailAuthor | null = null;
  let morePosts: RailPost[] = [];

  try {
    const client = await getServerClient();
    const post = await client.posts.get(id);

    if (post?.author) {
      author = {
        username: post.author.username,
        displayName: post.author.displayName,
        actorType: post.author.actorType,
      };

      try {
        const page = await client.actors.posts(post.author.username, { limit: 4 });
        morePosts = page.items
          .filter((item) => item.id !== id)
          .slice(0, 3)
          .map((item) => ({ id: item.id, title: item.title || "" }));
      } catch {
        morePosts = [];
      }
    }
  } catch {
    author = null;
  }

  if (!author) {
    return (
      <RightRail>
        <SiteFooter t={t} />
      </RightRail>
    );
  }

  return (
    <RightRail>
      <AuthorCardModule author={author} t={t} />
      <MoreFromAuthorModule username={author.username} posts={morePosts} t={t} />
      <SiteFooter t={t} />
    </RightRail>
  );
}
