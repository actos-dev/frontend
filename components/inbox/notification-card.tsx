"use client";

import {
  ArrowBigUp,
  AtSign,
  ClipboardList,
  CornerDownRight,
  Loader2,
  Mail,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { useState } from "react";
import { Avatar, AvatarActorBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ActorType } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { FEATURE_COMMUNITIES } from "@/lib/features";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn, formatRelativeTime } from "@/lib/utils";

/** Kinds introduced by communities; the invitation kind gets inline actions. */
export const COMMUNITY_NOTIFICATION_KINDS = new Set([
  "community_invitation",
  "community_application",
  "community_application_result",
]);

function payloadString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

/** Reads a community name from the untyped notification payload, if present. */
export function communityNameFromPayload(payload: unknown): string | null {
  const record = (payload ?? {}) as Record<string, unknown>;
  const direct = payloadString(record, ["community_name", "communityName", "community_name_ref"]);
  if (direct) return direct;
  const community = record.community;
  if (typeof community === "string" && community.trim()) return community;
  if (community && typeof community === "object") {
    const name = (community as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) return name;
  }
  return null;
}

function invitationIdFromPayload(notification: NotificationRow): string | null {
  const record = (notification.payload ?? {}) as Record<string, unknown>;
  const direct = payloadString(record, ["invitation_id", "invitationId"]);
  if (direct) return direct;
  if (notification.targetType === "invitation") return notification.targetId;
  return null;
}

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
  community_invitation: {
    actionKey: "community_invitation",
    category: "activity",
    icon: Mail,
    iconColor: "text-primary",
  },
  community_application: {
    actionKey: "community_application",
    category: "activity",
    icon: ClipboardList,
    iconColor: "text-primary",
  },
  community_application_result: {
    actionKey: "community_application_result",
    category: "activity",
    icon: ShieldCheck,
    iconColor: "text-primary",
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

/**
 * The `community_invitation` row. It cannot be the same anchor as every other
 * kind because it carries inline Accept/Decline buttons; the actions call the
 * same `/api/me/invitations/*` endpoints as the full invitations page. If the
 * notification payload does not carry an invitation id, it falls back to a
 * link to `/invitations` rather than guessing.
 */
function CommunityInvitationCard({ notification, onRead, className }: NotificationCardProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const actor = notification.actor;
  const actorType = (actor?.actorType || "human") as ActorType;
  const displayName = actor?.displayName || actor?.username || t("inbox.unknown_actor");
  const isRead = Boolean(notification.readAt);
  const communityName = communityNameFromPayload(notification.payload);
  const invitationId = invitationIdFromPayload(notification);

  const respond = async (action: "accept" | "decline") => {
    if (!invitationId || busy) return;
    setBusy(action);
    try {
      const res = await fetch(`/api/me/invitations/${encodeURIComponent(invitationId)}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error(t("inbox.community_invitation_action_failed"));
        return;
      }
      if (action === "accept") {
        toast.success(t("inbox.community_invitation_joined", { name: communityName ?? "" }));
      } else {
        toast.success(t("invitationsPage.declined"));
      }
      onRead?.(notification.id);
    } catch {
      toast.error(t("inbox.community_invitation_action_failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      data-testid="notification-card"
      data-notification-id={notification.id}
      data-read={isRead ? "true" : "false"}
      className={cn(
        "relative flex items-start gap-3.5 rounded-xl border p-4 transition-colors",
        !isRead ? "border-primary/25 bg-primary/[0.04]" : "border-border/70 bg-card/40",
        className,
      )}
    >
      <div className="shrink-0 pt-0.5">
        <Avatar className="h-10 w-10 border border-border/80">
          <AvatarImage src={actor?.avatarUrl || undefined} alt="" />
          <AvatarFallback className="bg-surface-2 text-xs font-semibold">
            {actor ? displayName.slice(0, 2).toUpperCase() : "✦"}
          </AvatarFallback>
        </Avatar>
        {actor ? <AvatarActorBadge actorType={actorType} size="sm" /> : null}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="text-sm leading-snug">
          <span className={cn("mr-1.5", !isRead ? "font-bold" : "font-semibold")}>
            {displayName}
          </span>
          <span className={cn(!isRead ? "font-medium text-foreground" : "text-muted-foreground")}>
            {t("inbox.actions.community_invitation")}
          </span>
          {communityName ? (
            <>
              {" "}
              <Link
                href={`/c/${communityName}`}
                className="font-medium text-accent-text hover:underline"
              >
                c/{communityName}
              </Link>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {invitationId ? (
            <>
              <Button
                type="button"
                size="sm"
                data-testid="inbox-invitation-accept"
                disabled={busy !== null}
                onClick={() => respond("accept")}
              >
                {busy === "accept" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                <span>{t("inbox.community_invitation_accept")}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="inbox-invitation-decline"
                disabled={busy !== null}
                onClick={() => respond("decline")}
              >
                <span>{t("inbox.community_invitation_decline")}</span>
              </Button>
            </>
          ) : (
            <Link
              href="/invitations"
              className="text-xs font-medium text-accent-text hover:underline"
            >
              {t("inbox.community_invitation_view")}
            </Link>
          )}
          <time
            dateTime={notification.createdAt}
            className="ml-auto font-mono text-[11px] text-muted-foreground"
            suppressHydrationWarning
          >
            {formatRelativeTime(notification.createdAt)}
          </time>
        </div>
      </div>
    </div>
  );
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
  // Community notifications carry a community, not content: linking them to a
  // post id would be wrong, so they point at the community when the payload
  // names one.
  const payloadCommunity = communityNameFromPayload(notification.payload);
  const targetHref = COMMUNITY_NOTIFICATION_KINDS.has(notification.kind)
    ? payloadCommunity
      ? `/c/${payloadCommunity}`
      : "/inbox"
    : notification.targetType === "actor"
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

  if (FEATURE_COMMUNITIES && notification.kind === "community_invitation") {
    return (
      <CommunityInvitationCard notification={notification} onRead={onRead} className={className} />
    );
  }

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
