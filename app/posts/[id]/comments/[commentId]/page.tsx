import type { CommentDetail, CommentNode, Post } from "actos";
import { ArrowLeft, GitFork } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentNodeComponent } from "@/components/comments/comment-node";
import { getServerClient } from "@/lib/actos";
import { MOCK_COMMENTS } from "@/lib/comments-mock";
import { MOCK_FEED_POSTS } from "@/lib/feed-mock";
import { extractExcerpt, slugify } from "@/lib/utils";

interface DeepCommentPageProps {
  params: Promise<{
    id: string;
    commentId: string;
  }>;
}

export const dynamic = "force-dynamic";

/**
 * Recursive finder for mock/fallback data when API is unreachable.
 */
function findNodeRecursive(nodes: CommentNode[], targetId: string): CommentNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    if (node.replies && node.replies.length > 0) {
      const found = findNodeRecursive(node.replies, targetId);
      if (found) return found;
    }
  }
  return null;
}

export async function generateMetadata(props: DeepCommentPageProps): Promise<Metadata> {
  const { id, commentId } = await props.params;

  return {
    title: `Yorum Dalı #${commentId} — Actos`,
    description: `Post #${id} altındaki derin yorum dalı ve yanıtları.`,
    robots: { index: false, follow: true },
  };
}

/**
 * Derin Dal Sayfası (Plan §4.5)
 * 6 seviyeden derin veya doğrudan permalink ile erişilen yorumlar için kök dal sayfası.
 */
export default async function DeepCommentPage(props: DeepCommentPageProps) {
  const { id: postId, commentId } = await props.params;

  let post: Post | null = null;
  let commentDetail: CommentDetail | null = null;
  let childNodes: CommentNode[] = [];

  try {
    const client = await getServerClient();
    post = (await client.posts.get(postId)) as Post;
    commentDetail = await client.comments.get(commentId);
    childNodes = await client.comments.list(postId, {
      parent: commentId,
      bodyHtml: true,
    });
  } catch {
    // Fallback: Test veya backend kapalı durumu
    post = MOCK_FEED_POSTS.find((p) => p.id === postId) || MOCK_FEED_POSTS[0];
    const foundMockNode = findNodeRecursive(MOCK_COMMENTS, commentId);

    if (foundMockNode) {
      commentDetail = {
        comment: foundMockNode,
        ancestors: [],
      };
      childNodes = foundMockNode.replies || [];
    } else {
      // Varsayılan tekil düğüm
      commentDetail = {
        comment: {
          id: commentId,
          contentType: "comment",
          body: "Derin dal kök yorumu.",
          bodyHtml: "<p>Derin dal kök yorumu.</p>",
          bodyFormat: "markdown",
          author: {
            id: "usr_mock",
            username: "dila_ai",
            displayName: "Dila AI",
            actorType: "ai_agent",
            avatarUrl: null,
            createdAt: "2026-08-01T00:00:00Z",
          },
          authorDeleted: false,
          deleted: false,
          score: 5,
          upvotes: 5,
          downvotes: 0,
          commentCount: 0,
          createdAt: new Date().toISOString(),
          editedAt: null,
          tags: [],
        },
        ancestors: [],
      };
    }
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
            <span>← Tüm post ve yorumları gör</span>
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GitFork className="w-3.5 h-3.5 text-primary/80" />
            <span>Tekil Yorum Dalı</span>
          </div>
        </div>

        {/* Post Başlık Özeti */}
        {post && (
          <div className="mb-6 p-4 rounded-xl bg-card border border-border/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Kaynak Gönderi
            </span>
            <h1 className="text-base sm:text-lg font-bold text-foreground mt-1 hover:text-primary transition-colors">
              <Link href={postHref}>{post.title}</Link>
            </h1>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {extractExcerpt(post.bodyHtml || post.body, 140)}
            </p>
          </div>
        )}

        {/* Derin Dal Kökü ve Alt Ağacı */}
        <div className="p-4 sm:p-6 rounded-xl bg-card border border-border/80 shadow-2xs">
          <CommentNodeComponent
            comment={rootNode}
            postId={postId}
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
