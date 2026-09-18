"use client";

import {
  ArrowBigUp,
  AtSign,
  CornerDownRight,
  MessageSquare,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { useState } from "react";
import { Avatar, AvatarActorBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ActorType } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn, formatRelativeTime } from "@/lib/utils";

/**
 * The subset of `NotificationSummary` (from `actos`) this row actually
 * renders. A real API response always satisfies this shape; it is kept
 * narrower than the SDK type so fixtures don't have to fabricate unused
 * fields (e.g. `actor.createdAt`).
 */
export interface NotificationRow {
  id: string;
  kind: string;
  actor?: {
    id: string;
    username: string;
    displayName?: string | null;
    actorType: string;
    avatarUrl?: string | null;
  } | null;
  targetType: string;
  targetId: string;
  payload: unknown;
  createdAt: string;
  readAt?: string | null;
}

export interface NotificationCardProps {
  notification: NotificationRow;
  onRead?: (id: string) => void;
  className?: string;
}

type NotificationCategory = "replies" | "mentions" | "follows" | "activity";

interface NotificationPresentation {
  actionKey: string;
  category: NotificationCategory;
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
}

const notificationKindRegistry: Record<string, NotificationPresentation> = {
  comment_on_post: {
    actionKey: "reply_post",
    category: "replies",
    icon: MessageSquare,
    iconColor: "text-sky-500",
  },
  reply: {
    actionKey: "reply_post",
    category: "replies",
    icon: MessageSquare,
    iconColor: "text-sky-500",
  },
  reply_to_comment: {
    actionKey: "reply_comment",
    category: "replies",
    icon: CornerDownRight,
    iconColor: "text-sky-500",
  },
  mention: {
    actionKey: "mention",
    category: "mentions",
    icon: AtSign,
    iconColor: "text-indigo-500",
  },
  vote: {
    actionKey: "vote",
    category: "activity",
    icon: ArrowBigUp,
    iconColor: "text-amber-500",
  },
  upvote: {
    actionKey: "vote",
    category: "activity",
    icon: ArrowBigUp,
    iconColor: "text-amber-500",
  },
  new_follower: {
    actionKey: "follow",
    category: "follows",
    icon: UserPlus,
    iconColor: "text-emerald-500",
  },
  follow: {
    actionKey: "follow",
    category: "follows",
    icon: UserPlus,
    iconColor: "text-emerald-500",
  },
  moderation_action: {
    actionKey: "system",
    category: "activity",
    icon: ShieldAlert,
    iconColor: "text-purple-500",
  },
  system: {
    actionKey: "system",
    category: "activity",
    icon: ShieldAlert,
    iconColor: "text-purple-500",
  },
};

const unknownNotification: NotificationPresentation = {
  actionKey: "unknown",
  category: "activity",
  icon: MessageSquare,
  iconColor: "text-primary",
};

export function getNotificationPresentation(kind: string): NotificationPresentation {
  return notificationKindRegistry[kind] ?? unknownNotification;
}

export function NotificationCard({ notification, onRead, className }: NotificationCardProps) {
  const { t } = useTranslation();
  const [internalRead, setInternalRead] = useState(false);
  const isRead = Boolean(notification.readAt) || internalRead;
  const [isMarking, setIsMarking] = useState(false);

  const actor = notification.actor;
  const actorType = (actor?.actorType || "human") as ActorType;
  const displayName = actor?.displayName || actor?.username || t("inbox.unknown_actor");

  const presentation = getNotificationPresentation(notification.kind);
  const TypeIcon = presentation.icon;
  const actionText = t(`inbox.actions.${presentation.actionKey}`);

  // Payload content excerpt extraction
  const payload = (notification.payload || {}) as Record<string, unknown>;
  const excerpt =
    typeof payload.postTitle === "string"
      ? payload.postTitle
      : typeof payload.post_title === "string"
        ? payload.post_title
        : typeof payload.title === "string"
          ? payload.title
          : typeof payload.commentExcerpt === "string"
            ? payload.commentExcerpt
            : typeof payload.comment_excerpt === "string"
              ? payload.comment_excerpt
              : typeof payload.body === "string"
                ? payload.body
                : typeof payload.text === "string"
                  ? payload.text
                  : typeof payload.excerpt === "string"
                    ? payload.excerpt
                    : typeof payload.comment_body === "string"
                      ? payload.comment_body
                      : typeof payload.commentBody === "string"
                        ? payload.commentBody
                        : typeof payload.preview === "string"
                          ? payload.preview
                          : typeof payload.reason === "string"
                            ? payload.reason
                            : null;

  // Target navigation link
  // YAPILACAKLAR.md §3: Hedefi silinmiş bildirim: Bağlantı 410 ekranına gider, bildirim durur.
  const targetHref =
    notification.targetType === "actor"
      ? actor?.username
        ? `/u/${actor.username}`
        : null
      : `/posts/${notification.targetId}`;

  const handleOpen = async () => {
    if (isRead || isMarking) return;

    setIsMarking(true);
    setInternalRead(true);

    // Snapshot the pre-optimistic count so a failed write can restore the
    // exact original value, not just increment whatever the count happens
    // to be later (the store may have moved on by then).
    const previousUnreadCount = useSessionStore.getState().unreadCount;
    useSessionStore.getState().setUnreadCount(Math.max(0, previousUnreadCount - 1));

    try {
      const res = await fetch(`/api/inbox/${encodeURIComponent(notification.id)}/read`, {
        method: "PATCH",
      });
      if (!res.ok) {
        throw new Error(`Failed to mark notification as read: ${res.status}`);
      }
      onRead?.(notification.id);
    } catch (error) {
      // The write did not actually happen: undo the optimistic update instead
      // of pretending it succeeded (ROADMAP.md decision 7).
      console.warn("Failed to mark notification as read:", error);
      setInternalRead(false);
      useSessionStore.getState().setUnreadCount(previousUnreadCount);
      toast.error(t("states.notificationReadFailed"));
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <Link
      href={targetHref ?? "/inbox"}
      onClick={handleOpen}
      data-testid="notification-card"
      data-notification-id={notification.id}
      data-read={isRead ? "true" : "false"}
      className={cn(
        "group relative flex items-start gap-3.5 p-4 rounded-xl border transition-colors duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
        !isRead
          ? "bg-primary/[0.04] hover:bg-primary/[0.08] border-primary/25 shadow-2xs"
          : "bg-card/40 hover:bg-surface-2/60 border-border/70",
        className,
      )}
    >
      {/* Okunmamış Nokta Göstergesi */}
      <div className="pt-2.5 flex items-center justify-center w-3 shrink-0">
        {!isRead ? (
          <span
            role="status"
            data-testid="unread-indicator"
            aria-label={t("inbox.unread")}
            title={t("inbox.unread")}
            className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/15 shrink-0 animate-in zoom-in-50"
          />
        ) : (
          <span className="w-2.5 h-2.5 shrink-0" />
        )}
      </div>

      {/* Aktör Avatarı & Tip Rozeti */}
      <div className="relative shrink-0 pt-0.5">
        <Avatar className="h-10 w-10 border border-border/80 shadow-2xs">
          <AvatarImage src={actor?.avatarUrl || undefined} alt="" />
          <AvatarFallback className="text-xs font-semibold bg-surface-2">
            {actor ? displayName.slice(0, 2).toUpperCase() : "✦"}
          </AvatarFallback>
        </Avatar>
        {actor && <AvatarActorBadge actorType={actorType} size="sm" />}

        {/* Küçük Eylem Rozeti */}
        <div
          data-testid="notification-kind-badge"
          className={cn(
            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border shadow-xs flex items-center justify-center",
            presentation.iconColor,
          )}
          title={notification.kind}
        >
          <TypeIcon className="w-3 h-3" />
        </div>
      </div>

      {/* İçerik ve Eylem Bilgisi */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm leading-snug">
            {presentation.actionKey === "unknown" ? (
              <span
                className={cn(!isRead ? "font-medium text-foreground" : "text-muted-foreground")}
              >
                {actionText}
              </span>
            ) : (
              <>
                <span className={cn("mr-1.5", !isRead && "font-bold", isRead && "font-semibold")}>
                  {actor ? displayName : t("inbox.system_actor")}
                </span>
                <span
                  className={cn(!isRead ? "font-medium text-foreground" : "text-muted-foreground")}
                >
                  {actionText}
                </span>
              </>
            )}
          </div>

          <time
            dateTime={notification.createdAt}
            title={notification.createdAt}
            className="text-[11px] text-muted-foreground font-mono shrink-0 whitespace-nowrap"
            suppressHydrationWarning
          >
            {formatRelativeTime(notification.createdAt)}
          </time>
        </div>

        {/* Varsa İçerik Alıntısı / Önizlemesi */}
        {excerpt && (
          <p
            data-testid="notification-excerpt"
            className="text-xs text-muted-foreground/90 line-clamp-2 bg-surface-2/40 border border-border/50 rounded-lg p-2 leading-relaxed"
          >
            {excerpt}
          </p>
        )}
      </div>
      {targetHref === null && <span className="sr-only">{t("inbox.target_unavailable")}</span>}
    </Link>
  );
}
