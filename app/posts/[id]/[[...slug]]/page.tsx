import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { CommentNode, Post } from "actos";
import { GoneError, NotFoundError } from "actos";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { CommentTree } from "@/components/comments/comment-tree";
import { PostActions } from "@/components/post/post-actions";
import { PostAttachments } from "@/components/post/post-attachments";
import { PostContent } from "@/components/post/post-content";
import { PostHeader } from "@/components/post/post-header";
import { PostJsonLd } from "@/components/seo/post-json-ld";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { Gone } from "@/components/ui/gone";
import { getServerClient } from "@/lib/actos";
import { describeError } from "@/lib/errors";
import { commentQueryOptions } from "@/lib/query/queries";
import { makeServerQueryClient, seedInfinitePage } from "@/lib/query/server";
import type { CommentQueryPage } from "@/lib/query/types";
import { renderCommentTree } from "@/lib/render/comment-tree";
import { excerpt } from "@/lib/render/excerpt";
import { renderContent } from "@/lib/render/index";
import { getSiteUrl } from "@/lib/seo";
import { slugify } from "@/lib/utils";
import { fetchVoteMap, type VoteValue } from "@/lib/votes";

interface PostPageProps {
  params: Promise<{
    id: string;
    slug?: string[];
  }>;
}

export const dynamic = "force-dynamic";

/**
 * Classifies a `client.posts.get` failure into the three outcomes the post
 * page and its metadata need. Anything that is not specifically a 404 or a
 * 410 is a real backend failure and must render an error state, never
 * fabricated content (ROADMAP.md P0-02, decision 7).
 */
function classifyPostError(err: unknown): "gone" | "not-found" | "error" {
  if (err instanceof GoneError) return "gone";
  if (err instanceof NotFoundError) return "not-found";
  const { status, code } = describeError(err);
  if (status === 410 || code === "GONE") return "gone";
  if (status === 404 || code === "NOT_FOUND") return "not-found";
  return "error";
}

/**
 * SEO ve Zengin Önizleme (OpenGraph & Twitter Card)
 * Plan Faz 7 Gereksinim 6
 */
export async function generateMetadata(props: PostPageProps): Promise<Metadata> {
  const { id } = await props.params;

  let post: Post | null = null;
  let isGone = false;
  let loadFailed = false;

  try {
    const client = await getServerClient();
    post = (await client.posts.get(id)) as Post;
  } catch (err) {
    const outcome = classifyPostError(err);
    if (outcome === "gone") {
      isGone = true;
    } else if (outcome === "error") {
      loadFailed = true;
    }
    // "not-found" leaves post null and falls through to the generic
    // not-found metadata below.
  }

  if (isGone || post?.deleted) {
    return {
      title: "410 İçerik Silindi — Actos",
      description: "Bu gönderi silinmiş veya yayından kaldırılmıştır.",
      robots: { index: false, follow: false },
    };
  }

  if (loadFailed) {
    // The backend is unreachable: no fabricated title (ROADMAP.md P0-02).
    return {
      title: "Actos",
      description: "Social platform for humans and autonomous agents.",
      robots: { index: false, follow: false },
    };
  }

  if (!post) {
    return {
      title: "Gönderi Bulunamadı — Actos",
      description: "Aradığınız gönderi mevcut değil.",
    };
  }

  const siteUrl = getSiteUrl();
  const canonicalSlug = slugify(post.title || "post");
  const canonicalUrl = `${siteUrl}/posts/${post.id}/${canonicalSlug}`;
  const bodyExcerpt = excerpt(post.body, 160);
  const authorName = post.author?.displayName || post.author?.username || "Actos Yazarı";

  // Raw attachments or thumbnail
  const rawAttachments = post.attachments as
    | Array<{ url?: string; thumbnailUrl?: string }>
    | undefined;
  const imageUrl =
    rawAttachments?.[0]?.url ||
    rawAttachments?.[0]?.thumbnailUrl ||
    `${siteUrl}/posts/${post.id}/opengraph-image`;

  return {
    title: `${post.title || "Gönderi"} — Actos`,
    description: bodyExcerpt,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${post.title || "Gönderi"} — Actos`,
      description: bodyExcerpt,
      url: canonicalUrl,
      type: "article",
      publishedTime: post.createdAt,
      modifiedTime: post.editedAt || undefined,
      authors: [authorName],
      tags: post.tags,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title || "Actos Gönderisi",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title || "Gönderi"} — Actos`,
      description: bodyExcerpt,
      images: [imageUrl],
    },
  };
}

/**
 * Post Detay Sayfası (RSC)
 * Plan Faz 7 Gereksinimleri 1 - 5
 */
export default async function PostDetailPage(props: PostPageProps) {
  const { id, slug: slugArray } = await props.params;

  let post: Post | null = null;
  let isGone = false;
  let loadError: unknown = null;

  const client = await getServerClient();

  try {
    post = (await client.posts.get(id)) as Post;
  } catch (err: unknown) {
    const outcome = classifyPostError(err);

    if (outcome === "gone") {
      isGone = true;
    } else if (outcome === "not-found") {
      // Plan §Faz 13 & YAPILACAKLAR.md §3: Post ve yorumlar aynı c_ ID uzayını paylaşır
      let commentRedirectUrl: string | null = null;
      try {
        const commentDetail = await client.comments.get(id);
        if (commentDetail?.comment) {
          const rootPostId = commentDetail.ancestors?.[0]?.id || id;
          commentRedirectUrl = `/posts/${rootPostId}/comments/${id}`;
        }
      } catch (commentErr: unknown) {
        if (classifyPostError(commentErr) === "gone") {
          isGone = true;
        }
      }

      if (commentRedirectUrl) {
        permanentRedirect(commentRedirectUrl);
      } else if (!isGone) {
        notFound();
      }
    } else {
      // A real backend failure (500, 429, timeout, connection): render an
      // error state below, never fabricated content (ROADMAP.md P0-02).
      loadError = err;
    }
  }

  if (loadError) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] py-8 px-4 sm:px-6">
        <div className="reading-container">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Akışa Dön</span>
            </Link>
          </div>
          <ErrorStateRetry {...describeError(loadError)} />
        </div>
      </div>
    );
  }

  // 1. Plan §2 İlke 7: "Silinmiş ≠ hiç olmamış" (410 GONE)
  if (isGone || post?.deleted) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] py-8 px-4 sm:px-6">
        <div className="reading-container">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Akışa Dön</span>
            </Link>
          </div>
          <Gone
            title="Bu içerik silindi"
            message="Bu gönderi daha önce Actos'ta mevcuttu, ancak yazarın kendi isteğiyle veya moderasyon kararıyla kaldırıldı."
            author={
              post?.author
                ? {
                    username: post.author.username,
                    displayName: post.author.displayName || undefined,
                  }
                : undefined
            }
            deletedAt={post?.editedAt || post?.createdAt}
            reason={post?.authorDeleted ? "author" : "unknown"}
          />
        </div>
      </div>
    );
  }

  // 2. Post bulunamadıysa (404)
  if (!post) {
    notFound();
  }

  // 3. Kanonik URL & 301 Yönlendirmesi
  const canonicalSlug = slugify(post.title || "post");
  const currentSlug = slugArray && slugArray.length > 0 ? slugArray[0] : "";

  if (currentSlug !== canonicalSlug) {
    permanentRedirect(`/posts/${id}/${canonicalSlug}`);
  }

  // 4. Oturum Kontrolü ve Yazar Sahipliği
  let isAuthor = false;
  let viewerVote: VoteValue = 0;
  let viewerId: string | null = null;
  try {
    const client = await getServerClient();
    const whoami = await client.auth.whoami();
    viewerId = whoami?.actor?.id ?? null;
    if (whoami?.actor?.id && whoami.actor.id === post.author.id) {
      isAuthor = true;
    } else if (whoami?.actor?.username && whoami.actor.username === post.author.username) {
      isAuthor = true;
    }
    // P0-06: fetch the signed-in viewer's own vote on this post so the
    // action bar reflects it correctly straight after a reload.
    if (whoami?.actor?.id) {
      const voteMap = await fetchVoteMap(client, [post.id]);
      viewerVote = voteMap[post.id] ?? 0;
    }
  } catch {
    // Anonim ziyaretçi
  }

  // 5. Comment tree fetch. The API is no longer asked for `body_html`
  // (F-02: lib/render is now the only renderer) — bodies are rendered here,
  // on the server, before the tree reaches the (client) CommentTree.
  let comments: CommentNode[] = [];
  let commentsNextCursor: string | null = null;
  let commentsError: unknown = null;
  try {
    const response = await client.transport.request<{
      comments: CommentNode[];
      nextCursor?: string | null;
    }>({
      method: "GET",
      path: `/posts/${encodeURIComponent(id)}/comments`,
      query: { sort: "top", limit: 25 },
    });
    comments = await renderCommentTree(response.data.comments);
    commentsNextCursor = response.data.nextCursor ?? null;
  } catch (error) {
    // No fabricated comments: this section renders its own error state below
    // instead of taking the whole post page down (ROADMAP.md P0-02).
    commentsError = error;
  }

  const commentsQueryClient = makeServerQueryClient();
  if (!commentsError) {
    const initialCommentPage: CommentQueryPage = {
      items: comments,
      nextCursor: commentsNextCursor,
    };
    seedInfinitePage(
      commentsQueryClient,
      commentQueryOptions(id, "top").queryKey,
      initialCommentPage,
      null,
    );
  }

  const postBodyHtml = await renderContent(post.body, {
    format: post.bodyFormat === "plain" ? "plain" : "markdown",
  });

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-6 sm:py-10 px-4 sm:px-6">
      <div className="reading-container">
        {/* Schema.org DiscussionForumPosting JSON-LD (Plan §Faz 16) */}
        <PostJsonLd post={post} />

        {/* Üst Navigasyon: Geri Dön */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Akışa Dön</span>
          </Link>
        </div>

        {/* 1. Yazar Başlığı (Plan §7.3 Glif + Etiket ve Düzenleme Göstergesi) */}
        <PostHeader post={post} />

        {/* 2. Editorial title and body (rendered by lib/render) */}
        <PostContent post={post} bodyHtml={postBodyHtml} />

        {/* 3. Ekler ve Görsel Galerisi */}
        {post.attachments && post.attachments.length > 0 && (
          <PostAttachments attachments={post.attachments} />
        )}

        {/* 4. Aksiyon Çubuğu (Oy, Kaydet, Paylaş, Rapor, Düzenle) */}
        <PostActions
          post={post}
          isAuthor={isAuthor}
          initialUserVote={viewerVote}
          initialViewerId={viewerId}
          className="my-8"
        />

        {/* 5. Faz 8: Yorum Ağacı (6 seviye girinti sınırı, katlanabilir ağaç, silinmiş yorum sözleşmesi) */}
        {commentsError ? (
          <div className="my-10">
            <ErrorStateRetry {...describeError(commentsError)} />
          </div>
        ) : (
          <HydrationBoundary state={dehydrate(commentsQueryClient)}>
            <CommentTree postId={post.id} postSlug={canonicalSlug} className="my-10" />
          </HydrationBoundary>
        )}
      </div>
    </div>
  );
}
