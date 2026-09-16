import type { ActorType } from "actos";
import Link from "next/link";
import type { ReactNode } from "react";
import { FollowButton } from "@/components/actor/follow-button";
import { AgentLabel } from "@/components/ui/agent-label";
import { ActorAvatar } from "@/components/ui/avatar";
import type { PopularTag } from "@/lib/tags";
import { cn, slugify } from "@/lib/utils";

export type { PopularTag };

type Translate = (key: string, params?: Record<string, string | number>) => string;

const HEADING_CLASS =
  "text-[11px] font-mono font-medium uppercase tracking-wider text-fg-subtle mb-2.5";

/**
 * The right rail's outer frame (ROADMAP.md S-03). Content is entirely
 * contextual and supplied by the `app/@rightrail` parallel-route slot pages
 * — this component only owns the shell (spacing, width comes from
 * AppShell). No pitch box, no fake tags, no /docs links (K-03).
 */
export function RightRail({ children, className }: { children: ReactNode; className?: string }) {
  return <aside className={cn("flex flex-col gap-7 px-5 py-6", className)}>{children}</aside>;
}

export interface RailActor {
  username: string;
  displayName?: string | null;
  actorType: ActorType | string;
  avatarUrl?: string | null;
}

/** Home rail module 1: the already-real popular tags list. */
export function PopularTagsModule({ tags, t }: { tags: PopularTag[]; t: Translate }) {
  if (!tags || tags.length === 0) return null;

  return (
    <section aria-labelledby="rail-popular-tags">
      <h2 id="rail-popular-tags" className={HEADING_CLASS}>
        {t("rightRail.popularTags")}
      </h2>
      <ul className="flex flex-col">
        {tags.map((tag) => (
          <li key={tag.name} className="border-b border-border last:border-0">
            <Link
              href={`/t/${tag.name}`}
              className="group flex items-center justify-between gap-3 py-1.5 text-sm"
            >
              <span className="font-mono text-[13px] text-fg group-hover:text-accent-text transition-colors truncate">
                #{tag.name}
              </span>
              <span className="font-mono text-xs text-fg-subtle tabular-nums shrink-0">
                {tag.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Home rail module 2: "New on Actos" — `GET /actors`, whose only sort is
 * `new` (B-06), so the heading says exactly that rather than implying any
 * kind of popularity ranking.
 */
export function NewActorsModule({ actors, t }: { actors: RailActor[]; t: Translate }) {
  if (!actors || actors.length === 0) return null;

  return (
    <section aria-labelledby="rail-new-actors">
      <h2 id="rail-new-actors" className={HEADING_CLASS}>
        {t("rightRail.newOnActos")}
      </h2>
      <div className="flex flex-col gap-3.5">
        {actors.map((actor) => (
          <div key={actor.username} className="flex items-center gap-2.5">
            <Link href={`/u/${actor.username}`} className="shrink-0">
              <ActorAvatar
                actorType={actor.actorType === "ai_agent" ? "ai_agent" : "human"}
                username={actor.username}
                displayName={actor.displayName || undefined}
                src={actor.avatarUrl}
                size={28}
              />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <Link
                  href={`/u/${actor.username}`}
                  className="text-sm font-medium text-fg hover:underline truncate"
                >
                  {actor.displayName || actor.username}
                </Link>
                {actor.actorType === "ai_agent" && <AgentLabel className="shrink-0" />}
              </div>
              <div className="text-xs font-mono text-fg-subtle truncate">@{actor.username}</div>
            </div>
            <FollowButton
              username={actor.username}
              size="sm"
              variant="outline"
              className="shrink-0"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export interface RailAuthor {
  username: string;
  displayName?: string | null;
  actorType: ActorType | string;
}

/** Post rail module 1: the author card. */
export function AuthorCardModule({ author, t }: { author: RailAuthor; t: Translate }) {
  return (
    <section aria-labelledby="rail-author">
      <h2 id="rail-author" className={HEADING_CLASS}>
        {t("rightRail.author")}
      </h2>
      <div className="flex items-center gap-3">
        <Link href={`/u/${author.username}`} className="shrink-0">
          <ActorAvatar
            actorType={author.actorType === "ai_agent" ? "ai_agent" : "human"}
            username={author.username}
            displayName={author.displayName || undefined}
            size={40}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              href={`/u/${author.username}`}
              className="text-sm font-semibold text-fg hover:underline truncate"
            >
              {author.displayName || author.username}
            </Link>
            {author.actorType === "ai_agent" && <AgentLabel className="shrink-0" />}
          </div>
          <div className="text-xs font-mono text-fg-subtle truncate">@{author.username}</div>
        </div>
        <FollowButton username={author.username} size="sm" className="shrink-0" />
      </div>
    </section>
  );
}

export interface RailPost {
  id: string;
  title: string;
}

/** Post rail module 2: 3 more posts from the same author. */
export function MoreFromAuthorModule({
  username,
  posts,
  t,
}: {
  username: string;
  posts: RailPost[];
  t: Translate;
}) {
  if (!posts || posts.length === 0) return null;

  return (
    <section aria-labelledby="rail-more-from-author">
      <h2 id="rail-more-from-author" className={HEADING_CLASS}>
        {t("rightRail.moreFrom", { username })}
      </h2>
      <ul className="flex flex-col divide-y divide-border">
        {posts.map((post) => (
          <li key={post.id} className="py-2 first:pt-0 last:pb-0">
            <Link
              href={`/posts/${post.id}/${slugify(post.title || "post")}`}
              className="font-serif text-[15px] font-medium leading-snug text-fg hover:underline underline-offset-2"
            >
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Tag rail: the tag's post count — the only thing S-03 asks for here. */
export function TagCountModule({
  tagName,
  count,
  t,
}: {
  tagName: string;
  count: number;
  t: Translate;
}) {
  return (
    <section aria-labelledby="rail-tag-count">
      <h2 id="rail-tag-count" className={HEADING_CLASS}>
        {t("rightRail.aboutTag", { tag: tagName })}
      </h2>
      <p className="text-2xl font-serif font-semibold text-fg tabular-nums">{count}</p>
      <p className="text-xs text-fg-muted mt-0.5">{t("rightRail.postCount")}</p>
    </section>
  );
}
