import type { Comment } from "actos";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

export interface ProfileCommentCardProps {
  comment: Comment;
  username: string;
}

export function ProfileCommentCard({ comment, username }: ProfileCommentCardProps) {
  const relativeTime = formatRelativeTime(comment.createdAt);

  return (
    <article
      data-testid="profile-comment-card"
      className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs hover:border-border-strong transition-all space-y-3"
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span>@{username} bir yorum yaptı</span>
        </div>
        <time dateTime={comment.createdAt} title={comment.createdAt} suppressHydrationWarning>
          {relativeTime}
        </time>
      </div>

      <div className="text-sm text-foreground/90 leading-relaxed line-clamp-4 whitespace-pre-line">
        {comment.body}
      </div>

      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/60 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>▲ {comment.score ?? 0} puan</span>
        </div>

        <Link
          href={`/posts/${comment.id}`}
          className="text-primary hover:underline font-medium text-xs"
        >
          Yorumu Gör →
        </Link>
      </div>
    </article>
  );
}
