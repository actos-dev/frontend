"use client";

import type { Post } from "actos";
import { ArrowBigDown, ArrowBigUp, Bookmark, Flag, Pencil, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReportDialog } from "@/components/post/report-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useSessionStore } from "@/lib/stores/session-store";
import { slugify } from "@/lib/utils";

export interface PostActionsProps {
  post: Post;
  initialUserVote?: -1 | 0 | 1;
  initialSaved?: boolean;
  isAuthor?: boolean;
  className?: string;
  saveAriaLabel?: string;
}

export function PostActions({
  post,
  initialUserVote = 0,
  initialSaved = false,
  isAuthor = false,
  className,
  saveAriaLabel,
}: PostActionsProps) {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);

  const [userVote, setUserVote] = useState<-1 | 0 | 1>(initialUserVote);
  const [score, setScore] = useState<number>(post.score ?? 0);
  const [isVoting, setIsVoting] = useState(false);

  const [saved, setSaved] = useState<boolean>(initialSaved);
  const [isSaving, setIsSaving] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);

  const isUserAuthor =
    isAuthor ||
    Boolean(user && (user.id === post.author?.id || user.username === post.author?.username));

  const slug = slugify(post.title || "post");
  const postHref = `/posts/${post.id}/${slug}`;

  // Optimistic Vote Handler (Plan §2.8 & §Faz 9)
  const handleVote = async (targetVote: 1 | -1) => {
    if (isVoting) return;

    if (!user && status === "unauthenticated") {
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : postHref;
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (isUserAuthor) {
      toast.error("Kendi içeriğinize oy veremezsiniz.");
      return;
    }

    const previousVote = userVote;
    const previousScore = score;

    const nextVote = userVote === targetVote ? 0 : targetVote;
    const scoreDiff = nextVote - previousVote;
    const nextScore = previousScore + scoreDiff;

    setUserVote(nextVote);
    setScore(nextScore);
    setIsVoting(true);

    try {
      const res = await fetch("/api/actions/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: post.id, value: nextVote }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setUserVote(previousVote);
        setScore(previousScore);

        if (
          res.status === 401 ||
          data.code === "MISSING_CREDENTIALS" ||
          data.code === "INVALID_KEY"
        ) {
          const currentPath =
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : postHref;
          router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
          return;
        }

        toast.error(data.detail || data.title || "Oy kaydedilemedi.");
        return;
      }

      if (data.data?.score !== undefined) {
        setScore(data.data.score);
      }
    } catch {
      setUserVote(previousVote);
      setScore(previousScore);
      toast.error("Bağlantı hatası: Oy verilemedi.");
    } finally {
      setIsVoting(false);
    }
  };

  // Optimistic Save Handler (Plan §2.8 & §Faz 9)
  const handleSave = async () => {
    if (isSaving) return;

    if (!user && status === "unauthenticated") {
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : postHref;
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    const previousSaved = saved;
    const nextSaved = !previousSaved;

    setSaved(nextSaved);
    setIsSaving(true);

    try {
      const res = await fetch("/api/actions/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: post.id,
          action: nextSaved ? "add" : "remove",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSaved(previousSaved);

        if (
          res.status === 401 ||
          data.code === "MISSING_CREDENTIALS" ||
          data.code === "INVALID_KEY"
        ) {
          const currentPath =
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : postHref;
          router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
          return;
        }

        toast.error(data.detail || data.title || "Kayıt işlemi gerçekleştirilemedi.");
        return;
      }

      toast.success(nextSaved ? "Post kaydedildi!" : "Kayıt kaldırıldı.");
    } catch {
      setSaved(previousSaved);
      toast.error("Bağlantı hatası: Post kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  // Share Handler
  const handleShare = async () => {
    const fullUrl =
      typeof window !== "undefined" ? `${window.location.origin}${postHref}` : postHref;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: post.title || "Actos Gönderisi",
          url: fullUrl,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
        toast.success("Bağlantı panoya kopyalandı!");
      }
    } catch {
      toast.info(`Bağlantı: ${fullUrl}`);
    }
  };

  return (
    <div
      data-testid="post-actions-bar"
      className={`flex items-center justify-between gap-2 py-4 border-y border-border/60 ${className || ""}`}
    >
      {/* Sol Grup: Oy Sistemi */}
      <div className="inline-flex items-center rounded-xl bg-surface-2/90 border border-border/80 p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => handleVote(1)}
          disabled={isVoting || isUserAuthor}
          title={
            isUserAuthor
              ? "Kendi içeriğinize oy veremezsiniz"
              : userVote === 1
                ? "Oyu geri çek"
                : "Yukarı oy ver"
          }
          aria-label="Yukarı oy ver"
          aria-pressed={userVote === 1}
          className={`p-1.5 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background ${
            isUserAuthor
              ? "opacity-50 cursor-not-allowed text-muted-foreground"
              : userVote === 1
                ? "text-vote-up bg-vote-up/10 font-bold cursor-pointer"
                : "text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer"
          }`}
        >
          <ArrowBigUp className="w-5 h-5" />
        </button>

        <span
          data-testid="post-score"
          className={`px-2.5 font-bold text-sm sm:text-base font-mono select-none ${
            userVote === 1 ? "text-vote-up" : userVote === -1 ? "text-vote-down" : "text-foreground"
          }`}
        >
          {score}
        </span>

        <button
          type="button"
          onClick={() => handleVote(-1)}
          disabled={isVoting || isUserAuthor}
          title={
            isUserAuthor
              ? "Kendi içeriğinize oy veremezsiniz"
              : userVote === -1
                ? "Oyu geri çek"
                : "Aşağı oy ver"
          }
          aria-label="Aşağı oy ver"
          aria-pressed={userVote === -1}
          className={`p-1.5 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background ${
            isUserAuthor
              ? "opacity-50 cursor-not-allowed text-muted-foreground"
              : userVote === -1
                ? "text-vote-down bg-vote-down/10 font-bold cursor-pointer"
                : "text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer"
          }`}
        >
          <ArrowBigDown className="w-5 h-5" />
        </button>
      </div>

      {/* Sağ Grup: Kaydet, Paylaş, Rapor Et ve Düzenle */}
      <div className="flex items-center gap-1.5">
        {/* Yazar Düzenle Butonu */}
        {isUserAuthor && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl border-border hover:bg-surface-2"
          >
            <Link href={`/posts/${post.id}/edit`} data-testid="post-edit-button">
              <Pencil className="w-3.5 h-3.5" />
              <span className="text-xs">Düzenle</span>
            </Link>
          </Button>
        )}

        {/* Kaydet Butonu */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          title={saved ? "Kaydedilenlerden çıkar" : (saveAriaLabel ?? "Gönderiyi kaydet")}
          aria-label={saved ? "Kaydedilenlerden çıkar" : (saveAriaLabel ?? "Kaydet")}
          aria-pressed={saved}
          className={`gap-1.5 rounded-xl ${
            saved ? "text-primary bg-primary/10 hover:bg-primary/20" : ""
          }`}
        >
          <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
          <span className="text-xs hidden sm:inline">{saved ? "Kaydedildi" : "Kaydet"}</span>
        </Button>

        {/* Paylaş Butonu */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleShare}
          aria-label="Paylaş"
          className="gap-1.5 rounded-xl"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">Paylaş</span>
        </Button>

        {/* Şikayet Butonu */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setReportOpen(true)}
          aria-label="Şikayet et"
          data-testid="post-report-button"
          className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Flag className="w-4 h-4" />
          <span className="sr-only">Şikayet Et</span>
        </Button>
      </div>

      {/* Şikayet Modalı */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetId={post.id}
        targetType="content"
      />
    </div>
  );
}
