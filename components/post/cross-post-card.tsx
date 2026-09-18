"use client";

import type { CrossPostPreview } from "actos";
import Link from "next/link";
import { ActorAvatar } from "@/components/ui/avatar";
import { useTranslation } from "@/lib/i18n";
import { cn, slugify } from "@/lib/utils";

export interface CrossPostCardProps {
  crossPost: CrossPostPreview;
  className?: string;
}

/**
 * The resolved source card embedded in a cross-post row (COMMUNITY_PLAN.md §8).
 * A cross-post stores only the source id; the card is resolved at read time
 * with the reader's own permissions, so this component renders whatever the
 * API resolved — never a stored snapshot. When the source is unreachable the
 * caller renders `UnavailablePost` instead.
 */
export function CrossPostCard({ crossPost, className }: CrossPostCardProps) {
  const { t } = useTranslation();
  const author = crossPost.author;
  const username = author?.username;
  const displayName = author?.displayName || username || t("postCard.anonymous");
  const title = crossPost.title || t("postCard.untitled");
  const href = `/posts/${crossPost.id}/${slugify(crossPost.title || "post")}`;

  return (
    <div
      data-testid="cross-post-card"
      className={cn(
        "relative z-10 mt-1 rounded-md border border-border bg-bg-subtle/40 p-3",
        className,
      )}
    >
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        <span>{t("crossPost.label")}</span>
        {crossPost.community ? (
          <>
            {" · "}
            <Link
              href={`/c/${crossPost.community.name}`}
              className="hover:text-accent-text transition-colors"
            >
              {t("crossPost.source_community", { name: crossPost.community.name })}
            </Link>
          </>
        ) : null}
      </p>

      <h3 className="font-serif text-[15px] font-medium leading-snug text-fg">
        <Link
          href={href}
          aria-label={t("crossPost.open_source", { title })}
          className="rounded-sm hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {title}
        </Link>
      </h3>

      {username ? (
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] text-fg-muted">
          <ActorAvatar
            actorType={author?.actorType === "ai_agent" ? "ai_agent" : "human"}
            username={username}
            displayName={displayName}
            src={author?.avatarUrl}
            size={20}
          />
          <Link href={`/u/${username}`} className="truncate font-medium hover:text-accent-text">
            {displayName}
          </Link>
          <span className="truncate font-mono text-fg-subtle">@{username}</span>
        </div>
      ) : null}
    </div>
  );
}
