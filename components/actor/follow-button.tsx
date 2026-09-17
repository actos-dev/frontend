"use client";

import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { isAuthenticationProblem } from "@/lib/query/http";
import { useFollowMutation } from "@/lib/query/mutations";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn } from "@/lib/utils";

export interface FollowButtonProps {
  username: string;
  initialFollowing?: boolean;
  initialViewerId?: string | null;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showSelf?: boolean;
  onFollowChange?: (following: boolean) => void;
}

/**
 * Reusable optimistic Follow / Unfollow button (Plan §Faz 9).
 *
 * - Instantly reflects state change in the UI.
 * - Automatically rolls back on server/network errors and warns the user.
 * - Hides itself (or renders disabled if showSelf is true) when on user's own profile.
 * - Redirects unauthenticated users to `/login?returnUrl=...`.
 */
export function FollowButton({
  username,
  initialFollowing = false,
  initialViewerId,
  variant,
  size = "sm",
  className,
  showSelf = false,
  onFollowChange,
}: FollowButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);
  const viewerId =
    status === "authenticated"
      ? (user?.id ?? initialViewerId ?? null)
      : status === "unauthenticated"
        ? null
        : (initialViewerId ?? null);
  const initialStateMatchesViewer = initialViewerId === undefined || initialViewerId === viewerId;
  const viewerInitialFollowing = initialStateMatchesViewer ? initialFollowing : false;
  const followMutation = useFollowMutation(username, viewerInitialFollowing, viewerId);
  const following = followMutation.following ?? viewerInitialFollowing;
  const isPending = followMutation.isPending;

  // Kendi profili kontrolü (Plan §Faz 9)
  const isSelf = Boolean(user?.username && user.username.toLowerCase() === username.toLowerCase());

  if (isSelf && !showSelf) {
    return null;
  }

  if (isSelf && showSelf) {
    return (
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled
        title={t("interactions.follow_self_forbidden") || "Kendi profilinizi takip edemezsiniz."}
        data-testid="follow-button-self"
        className={cn("opacity-50 cursor-not-allowed text-muted-foreground", className)}
      >
        <span>{t("common.follow") || "Takip Et"}</span>
      </Button>
    );
  }

  const handleToggle = async () => {
    if (isPending) return;

    // Giriş yapmamış kullanıcı tıkladığında giriş sayfasına yönlendirilir
    if (!user && status === "unauthenticated") {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (isSelf) {
      toast.info(t("interactions.follow_self_forbidden") || "Kendi profilinizi takip edemezsiniz.");
      return;
    }

    const next = !following;

    try {
      await followMutation.toggle(next);

      const successMsg = next
        ? t("interactions.followed")?.replace("{username}", username) ||
          `@${username} takip edildi.`
        : t("interactions.unfollowed")?.replace("{username}", username) ||
          `@${username} takipten çıkarıldı.`;

      toast.success(successMsg);
      onFollowChange?.(next);
    } catch (error) {
      if (isAuthenticationProblem(error)) {
        const currentPath =
          typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
        router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      } else {
        const detail = (error as { detail?: string; message?: string }).detail;
        toast.error(detail || (error as Error).message || "Takip işlemi gerçekleştirilemedi.");
      }
    }
  };

  const buttonVariant = variant || (following ? "outline" : "default");

  return (
    <Button
      type="button"
      variant={buttonVariant}
      size={size}
      onClick={handleToggle}
      disabled={isPending}
      data-testid="follow-button"
      aria-pressed={following}
      aria-label={
        following
          ? `@${username} ${t("common.unfollow") || "takipten çık"}`
          : `@${username} ${t("common.follow") || "takip et"}`
      }
      className={cn(
        "cursor-pointer transition-all duration-150 gap-1.5",
        following && "hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5",
        className,
      )}
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : following ? (
        <UserCheck className="w-3.5 h-3.5 text-primary" />
      ) : (
        <UserPlus className="w-3.5 h-3.5" />
      )}
      <span>
        {following ? t("common.following") || "Takip Ediliyor" : t("common.follow") || "Takip Et"}
      </span>
    </Button>
  );
}
