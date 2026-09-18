"use client";

import type { CommunityMember } from "actos";
import { Ban as BanIcon, Loader2, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActorAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { formatMemberSince } from "@/lib/communities/format";
import { useTranslation } from "@/lib/i18n";

export interface MembersManagerProps {
  communityName: string;
  initialMembers: CommunityMember[];
  initialNextCursor: string | null;
  ownerUsername: string;
  canKick: boolean;
  canBan: boolean;
  onBan: (username: string) => void;
}

/**
 * The community member list with kick and ban actions. There is no moderator
 * list in the 0.3.0 DTO (BE-019), so this deliberately shows only members and
 * an "owner" badge. The owner cannot be kicked (the API also enforces this).
 */
export function MembersManager({
  communityName,
  initialMembers,
  initialNextCursor,
  ownerUsername,
  canKick,
  canBan,
  onBan,
}: MembersManagerProps) {
  const { locale, t } = useTranslation();
  const [members, setMembers] = useState<CommunityMember[]>(initialMembers);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [kickTarget, setKickTarget] = useState<CommunityMember | null>(null);
  const [isKicking, setIsKicking] = useState(false);

  const loadMore = async () => {
    if (!nextCursor || isLoading) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "25", cursor: nextCursor });
      const res = await fetch(
        `/api/communities/${encodeURIComponent(communityName)}/members?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(t("communities.load_error"));
        return;
      }
      const items: CommunityMember[] = data.members || [];
      setMembers((current) => {
        const existing = new Set(current.map((item) => item.actor.id));
        return [...current, ...items.filter((item) => !existing.has(item.actor.id))];
      });
      setNextCursor(data.nextCursor ?? null);
    } catch {
      toast.error(t("communities.load_error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKick = async () => {
    if (!kickTarget) return;
    setIsKicking(true);
    try {
      const res = await fetch(
        `/api/communities/${encodeURIComponent(communityName)}/members/${encodeURIComponent(kickTarget.actor.username)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.detail || t("communities.mod.members.kick_failed"));
        return;
      }
      toast.success(
        t("communities.mod.members.kick_success", { username: kickTarget.actor.username }),
      );
      setMembers((current) => current.filter((item) => item.actor.id !== kickTarget.actor.id));
      setKickTarget(null);
    } catch {
      toast.error(t("communities.mod.members.kick_failed"));
    } finally {
      setIsKicking(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="members-manager">
      <div>
        <h2 className="text-sm font-semibold text-fg">{t("communities.mod.members.title")}</h2>
        <p className="mt-0.5 text-xs text-fg-muted">{t("communities.mod.members.description")}</p>
      </div>

      {members.length === 0 ? (
        <EmptyState title={t("communities.mod.members.empty")} />
      ) : (
        <ul className="divide-y divide-border" data-testid="members-list">
          {members.map((member) => {
            const actor = member.actor;
            const isOwner = actor.username === ownerUsername;
            return (
              <li
                key={actor.id}
                data-testid={`member-row-${actor.username}`}
                className="flex flex-wrap items-center gap-2.5 py-3"
              >
                <ActorAvatar
                  actorType={actor.actorType === "ai_agent" ? "ai_agent" : "human"}
                  username={actor.username}
                  displayName={actor.displayName || undefined}
                  src={actor.avatarUrl}
                  size={28}
                />
                <Link
                  href={`/u/${actor.username}`}
                  className="truncate text-sm font-medium text-fg hover:text-accent-text"
                >
                  {actor.displayName || actor.username}
                </Link>
                <span className="truncate font-mono text-xs text-fg-subtle">@{actor.username}</span>
                {isOwner ? (
                  <span className="rounded-sm border border-border-strong px-1.5 py-0.5 font-mono text-[10px] uppercase text-fg-muted">
                    {t("communities.mod.members.owner")}
                  </span>
                ) : null}
                <time
                  dateTime={member.joinedAt}
                  className="ml-auto text-[11px] text-fg-subtle"
                  suppressHydrationWarning
                >
                  {formatMemberSince(member.joinedAt, locale)}
                </time>

                {!isOwner && (canKick || canBan) ? (
                  <div className="flex items-center gap-1.5">
                    {canBan ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid={`member-ban-${actor.username}`}
                        onClick={() => onBan(actor.username)}
                        className="min-h-8 gap-1 px-2 text-xs"
                      >
                        <BanIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t("communities.mod.members.ban")}</span>
                      </Button>
                    ) : null}
                    {canKick ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid={`member-kick-${actor.username}`}
                        onClick={() => setKickTarget(member)}
                        className="min-h-8 gap-1 px-2 text-xs"
                      >
                        <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t("communities.mod.members.kick")}</span>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" disabled={isLoading} onClick={loadMore}>
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            <span>{t("communities.mod.applications.load_more")}</span>
          </Button>
        </div>
      ) : null}

      <Dialog open={Boolean(kickTarget)} onOpenChange={(open) => !open && setKickTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("communities.mod.members.kick_confirm_title", {
                username: kickTarget?.actor.username ?? "",
              })}
            </DialogTitle>
            <DialogDescription>{t("communities.mod.members.kick_confirm_desc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isKicking}
              onClick={() => setKickTarget(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              data-testid="confirm-kick-button"
              disabled={isKicking}
              onClick={handleKick}
            >
              {isKicking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              <span>{t("communities.mod.members.kick")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
