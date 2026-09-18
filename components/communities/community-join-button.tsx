"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { isAuthenticationProblem } from "@/lib/query/http";
import { useSessionStore } from "@/lib/stores/session-store";

export interface CommunityJoinButtonProps {
  name: string;
  initialIsMember: boolean;
  className?: string;
}

/**
 * Join/Leave for a public community. The backend requires membership to post
 * but not to read, so this is the only membership control on the read half.
 * After a successful write the route is refreshed so the server-rendered
 * member count is real, never optimistically invented.
 */
export function CommunityJoinButton({
  name,
  initialIsMember,
  className,
}: CommunityJoinButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const status = useSessionStore((state) => state.status);
  const [isMember, setIsMember] = useState(initialIsMember);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === "unauthenticated") {
    return (
      <Button asChild variant="secondary" size="sm" className={className}>
        <Link href={`/login?returnUrl=${encodeURIComponent(`/c/${name}`)}`}>
          {t("communities.login_to_join")}
        </Link>
      </Button>
    );
  }

  const handleToggle = async () => {
    if (isSubmitting) return;
    const nextIsMember = !isMember;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(name)}/join`, {
        method: nextIsMember ? "POST" : "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (isAuthenticationProblem({ status: res.status, code: data?.code })) {
          router.push(`/login?returnUrl=${encodeURIComponent(`/c/${name}`)}`);
          return;
        }
        toast.error(
          data?.detail ||
            (nextIsMember ? t("communities.join_failed") : t("communities.leave_failed")),
        );
        return;
      }

      setIsMember(nextIsMember);
      toast.success(
        nextIsMember
          ? t("communities.join_success", { name })
          : t("communities.leave_success", { name }),
      );
      router.refresh();
    } catch {
      toast.error(nextIsMember ? t("communities.join_failed") : t("communities.leave_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      variant={isMember ? "secondary" : "primary"}
      size="sm"
      disabled={isSubmitting}
      onClick={handleToggle}
      data-testid="community-join-button"
      data-member={isMember ? "true" : "false"}
      aria-pressed={isMember}
      className={className}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>{isMember ? t("communities.leaving") : t("communities.joining")}</span>
        </>
      ) : (
        <span>{isMember ? t("communities.leave") : t("communities.join")}</span>
      )}
    </Button>
  );
}
