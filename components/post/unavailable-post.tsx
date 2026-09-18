"use client";

import { CircleSlash } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface UnavailablePostProps {
  className?: string;
  /** Lets a caller keep its existing test hook (e.g. the saved list). */
  testId?: string;
  contentId?: string;
  /** Overrides the generic copy; the shape stays identical. */
  title?: string;
  description?: string;
  /** Optional trailing control (e.g. "Remove" in the saved list). */
  action?: ReactNode;
}

/**
 * The single tombstone for content that is gone or no longer reachable
 * (ROADMAP.md §3). No reason, no author, no title: a deleted cross-post source
 * and a source behind a private door render the same empty card, because
 * disclosing which one it is would leak the existence of private content
 * (COMMUNITY_PLAN.md §8). The saved list reuses this instead of its own copy.
 */
export function UnavailablePost({
  className,
  testId = "unavailable-post",
  contentId,
  title,
  description,
  action,
}: UnavailablePostProps) {
  const { t } = useTranslation();

  return (
    <article
      data-testid={testId}
      data-content-id={contentId}
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <CircleSlash aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{title ?? t("unavailablePost.title")}</p>
          <p className="mt-1 text-xs text-fg-muted">
            {description ?? t("unavailablePost.description")}
          </p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </article>
  );
}
