"use client";

import {
  ArrowBigUp,
  AtSign,
  Check,
  CornerDownRight,
  MessageSquare,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
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

export function NotificationCard({ notification, onRead, className }: NotificationCardProps) {
  const { t } = useTranslation();
  const [internalRead, setInternalRead] = useState(false);
  const isRead = Boolean(notification.readAt) || internalRead;
  const [isMarking, setIsMarking] = useState(false);

  const actor = notification.actor;
  const actorType = (actor?.actorType || "human") as ActorType;
  const username = actor?.username || "anonim";
  const displayName = actor?.displayName || username;

  // Notification type & action label resolution
  const kind = notification.kind;
  let actionText = "etkileşimde bulundu";
  let TypeIcon = MessageSquare;
  let iconColor = "text-primary";

  if (kind === "reply" || kind === "comment_on_post") {
    actionText = "gönderinize yanıt verdi";
    TypeIcon = MessageSquare;
    iconColor = "text-sky-500";
  } else if (kind === "reply_to_comment") {
    actionText = "yorumunuza yanıt verdi";
    TypeIcon = CornerDownRight;
    iconColor = "text-sky-500";
  } else if (kind === "mention") {
    actionText = "sizden bahsetti";
    TypeIcon = AtSign;
    iconColor = "text-indigo-500";
  } else if (kind === "vote" || kind === "upvote") {
    actionText = "gönderinizi beğendi";
    TypeIcon = ArrowBigUp;
    iconColor = "text-amber-500";
  } else if (kind === "follow" || kind === "new_follower") {
    actionText = "sizi takip etmeye başladı";
    TypeIcon = UserPlus;
    iconColor = "text-emerald-500";
  } else if (kind === "system" || kind === "moderation_action") {
    actionText = "sistem bildirimi";
    TypeIcon = ShieldAlert;
    iconColor = "text-purple-500";
  }

  // Payload content excerpt extraction
  const payload = (notification.payload || {}) as Record<string, unknown>;
  const excerpt =
    typeof payload.body === "string"
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
    notification.targetType === "actor" || kind === "follow" || kind === "new_follower"
      ? `/u/${actor?.username || notification.targetId}`
      : `/posts/${notification.targetId}`;

  const handleMarkRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
    <div
      data-testid="notification-card"
      data-notification-id={notification.id}
      data-read={isRead ? "true" : "false"}
      className={cn(
        "group relative flex items-start gap-3.5 p-4 rounded-xl border transition-all duration-200",
        !isRead
          ? "bg-primary/[0.04] hover:bg-primary/[0.08] border-primary/20 shadow-2xs"
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
            aria-label="Okunmamış"
            title="Okunmamış"
            className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/20 shrink-0 animate-in zoom-in-50"
          />
        ) : (
          <span className="w-2.5 h-2.5 shrink-0" />
        )}
      </div>

      {/* Aktör Avatarı & Tip Rozeti */}
      <div className="relative shrink-0 pt-0.5">
        <Link
          href={actor ? `/u/${username}` : targetHref}
          className="focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-full block"
          onClick={(e) => e.stopPropagation()}
        >
          <Avatar className="h-10 w-10 border border-border/80 shadow-2xs">
            <AvatarImage src={actor?.avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-xs font-semibold bg-surface-2">
              {actor ? displayName.slice(0, 2).toUpperCase() : "✦"}
            </AvatarFallback>
          </Avatar>
          {actor && <AvatarActorBadge actorType={actorType} size="sm" />}
        </Link>

        {/* Küçük Eylem Rozeti */}
        <div
          data-testid="notification-kind-badge"
          className={cn(
            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border shadow-xs flex items-center justify-center",
            iconColor,
          )}
          title={kind}
        >
          <TypeIcon className="w-3 h-3" />
        </div>
      </div>

      {/* İçerik ve Eylem Bilgisi */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm leading-snug">
            {actor ? (
              <Link
                href={`/u/${username}`}
                className="font-semibold text-foreground hover:underline mr-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {displayName}
              </Link>
            ) : (
              <span className="font-semibold text-foreground mr-1.5">Sistem</span>
            )}
            <span className="text-muted-foreground">{actionText}</span>
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

        {/* Hedefe Gidiş Bağlantısı */}
        <div className="pt-0.5">
          <Link
            href={targetHref}
            data-testid="notification-target-link"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
          >
            <span>Detayları gör →</span>
          </Link>
        </div>
      </div>

      {/* Tekil Okundu İşaretleme Butonu */}
      <div className="pt-1 shrink-0">
        {!isRead && (
          <button
            type="button"
            data-testid="mark-read-button"
            onClick={handleMarkRead}
            disabled={isMarking}
            title="Okundu olarak işaretle"
            aria-label="Okundu olarak işaretle"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
