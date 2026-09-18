"use client";

import type { Invitation } from "actos";
import { Check, Loader2, Mail, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActorAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/utils";

export interface InvitationsViewProps {
  initialInvitations: Invitation[];
  initialNextCursor: string | null;
}

/**
 * `/invitations` — the viewer's pending community invitations, newest first,
 * with inline Accept/Decline. Accepting joins the community; the row is removed
 * locally only after the write succeeds, so the list never lies.
 */
export function InvitationsView({ initialInvitations, initialNextCursor }: InvitationsViewProps) {
  const { locale, t } = useTranslation();
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const respond = async (invitation: Invitation, action: "accept" | "decline") => {
    if (busyId) return;
    setBusyId(invitation.id);
    try {
      const res = await fetch(
        `/api/me/invitations/${encodeURIComponent(invitation.id)}/${action}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.detail || t("invitationsPage.failed"));
        return;
      }
      setInvitations((current) => current.filter((item) => item.id !== invitation.id));
      if (action === "accept") {
        toast.success(t("invitationsPage.accepted", { name: invitation.community.name }));
      } else {
        toast.success(t("invitationsPage.declined"));
      }
    } catch {
      toast.error(t("invitationsPage.failed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "25", cursor: nextCursor });
      const res = await fetch(`/api/me/invitations?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.detail || t("invitationsPage.failed"));
        return;
      }
      const newItems: Invitation[] = data.invitations || [];
      setInvitations((current) => {
        const existing = new Set(current.map((item) => item.id));
        return [...current, ...newItems.filter((item) => !existing.has(item.id))];
      });
      setNextCursor(data.nextCursor ?? null);
    } catch {
      toast.error(t("invitationsPage.failed"));
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          icon={Mail}
          title={t("invitationsPage.empty_title")}
          description={t("invitationsPage.empty_description")}
          action={{ label: t("nav.browseCommunities"), href: "/c" }}
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border" data-testid="invitations-list">
      {invitations.map((invitation) => {
        const invitedBy = invitation.invitedBy;
        const isBusy = busyId === invitation.id;
        return (
          <article
            key={invitation.id}
            data-testid={`invitation-row-${invitation.id}`}
            className="flex flex-wrap items-center gap-3 px-1 py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-fg">
                <Link
                  href={`/c/${invitation.community.name}`}
                  className="font-semibold text-fg hover:text-accent-text"
                >
                  c/{invitation.community.name}
                </Link>
              </p>
              {invitedBy ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-muted">
                  <ActorAvatar
                    actorType={invitedBy.actorType === "ai_agent" ? "ai_agent" : "human"}
                    username={invitedBy.username}
                    displayName={invitedBy.displayName || undefined}
                    src={invitedBy.avatarUrl}
                    size={20}
                  />
                  <span>
                    {t("invitationsPage.invited_by", {
                      name: invitedBy.displayName || invitedBy.username,
                    })}
                  </span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={invitation.createdAt} suppressHydrationWarning>
                    {formatRelativeTime(invitation.createdAt, locale)}
                  </time>
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                data-testid={`invitation-accept-${invitation.id}`}
                disabled={isBusy}
                onClick={() => respond(invitation, "accept")}
              >
                {isBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{t("invitationsPage.accept")}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid={`invitation-decline-${invitation.id}`}
                disabled={isBusy}
                onClick={() => respond(invitation, "decline")}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("invitationsPage.decline")}</span>
              </Button>
            </div>
          </article>
        );
      })}

      {nextCursor ? (
        <div className="flex justify-center p-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            <span>{t("invitationsPage.load_more")}</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
