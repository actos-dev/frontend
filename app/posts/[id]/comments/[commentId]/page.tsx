import type { CommentDetail, CommentNode, Post } from "actos";
import { GoneError, NotFoundError } from "actos";
import { ArrowLeft, GitFork } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentNodeComponent } from "@/components/comments/comment-node";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { Gone } from "@/components/ui/gone";
import { getServerClient } from "@/lib/actos";
import { describeError } from "@/lib/errors";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { renderCommentBody, renderCommentTree } from "@/lib/render/comment-tree";
import { excerpt } from "@/lib/render/excerpt";
import { slugify } from "@/lib/utils";

interface DeepCommentPageProps {
  params: Promise<{
    id: string;
    commentId: string;
  }>;
}

export const dynamic = "force-dynamic";

/**
 * Classifies a comment thread fetch failure. Anything that is not
 * specifically a 404 or a 410 is a real backend failure and must render an
 * error state, never fabricated content (ROADMAP.md P0-02, decision 7).
 */
function classifyCommentError(err: unknown): "gone" | "not-found" | "error" {
  if (err instanceof GoneError) return "gone";
  if (err instanceof NotFoundError) return "not-found";
  const { status, code } = describeError(err);
  if (status === 410 || code === "GONE") return "gone";
  if (status === 404 || code === "NOT_FOUND") return "not-found";
  return "error";
}

export async function generateMetadata(props: DeepCommentPageProps): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  const { id, commentId } = await props.params;

  return {
    title: t("commentPage.branch_title", { commentId }),
    description: t("commentPage.branch_description", { postId: id }),
    robots: { index: false, follow: true },
  };
}

/**
 * Derin Dal Sayfası (Plan §4.5)
 * 6 seviyeden derin veya doğrudan permalink ile erişilen yorumlar için kök dal sayfası.
 */
export default async function DeepCommentPage(props: DeepCommentPageProps) {
  const { t } = getTranslations(await getServerLocale());
  const { id: postId, commentId } = await props.params;

  const client = await getServerClient();

  // The source post preview is optional context (the "Kaynak Gönderi" card
  // below already renders conditionally), so a failure here does not block
  // the comment thread itself.
  let post: Post | null = null;
  try {
    post = (await client.posts.get(postId)) as Post;
  } catch {
    post = null;
  }

  let commentDetail: CommentDetail | null = null;
  let childNodes: CommentNode[] = [];
  let isGone = false;
  let loadError: unknown = null;

  try {
    commentDetail = await client.comments.get(commentId);
    const rawChildNodes = await client.comments.list(postId, { parent: commentId });
    childNodes = await renderCommentTree(rawChildNodes);
    if (commentDetail?.comment) {
      commentDetail = {
        ...commentDetail,
        comment: await renderCommentBody(commentDetail.comment),
      };
    }
  } catch (err) {
    const outcome = classifyCommentError(err);
    if (outcome === "gone") {
      isGone = true;
    } else if (outcome === "not-found") {
      notFound();
    } else {
      // A real backend failure (500, 429, timeout, connection): render an
      // error state below, never fabricated content.
      loadError = err;
    }
  }

  if (isGone) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] py-8 px-4 sm:px-6">
        <div className="reading-container">
          <Gone title={t("commentPage.deleted_title")} message={t("commentPage.deleted_message")} />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] py-8 px-4 sm:px-6">
        <div className="reading-container">
          <ErrorStateRetry {...describeError(loadError)} />
        </div>
      </div>
    );
  }

  if (!commentDetail?.comment) {
    notFound();
  }

  // Yorum düğümünü çocuklarıyla birleştirip kök düğüm olarak hazırla
  const rootNode: CommentNode = {
    ...commentDetail.comment,
    replies:
      childNodes.length > 0 ? childNodes : (commentDetail.comment as CommentNode).replies || [],
  };

  const postSlug = post?.title ? slugify(post.title) : "thread";
  const postHref = `/posts/${postId}/${postSlug}`;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-6 sm:py-10 px-4 sm:px-6">
      <div className="reading-container">
        {/* Üst Bar: Tüm Post ve Yorumlara Dön */}
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-border/60 pb-4">
          <Link
            href={postHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{t("commentPage.back_to_post")}</span>
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GitFork className="w-3.5 h-3.5 text-primary/80" />
            <span>{t("commentPage.thread_label")}</span>
          </div>
        </div>

        {/* Post Başlık Özeti */}
        {post && (
          <div className="mb-6 p-4 rounded-xl bg-card border border-border/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("commentPage.source_post")}
            </span>
            <h1 className="text-base sm:text-lg font-bold text-foreground mt-1 hover:text-primary transition-colors">
              <Link href={postHref}>{post.title}</Link>
            </h1>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {excerpt(post.body, 140)}
            </p>
          </div>
        )}

        {/* Derin Dal Kökü ve Alt Ağacı */}
        <div className="p-4 sm:p-6 rounded-xl bg-card border border-border/80 shadow-2xs">
          <CommentNodeComponent
            comment={rootNode}
            postId={postId}
            postAuthorId={post?.author?.id}
            postAuthorUsername={post?.author?.username}
            highlightedCommentId={commentId}
            depth={0}
            maxDepth={6}
            collapsedIds={new Set()}
            onToggleCollapse={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
