import type { Post } from "actos";
import { GoneError, NotFoundError } from "actos";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { PostActions } from "@/components/post/post-actions";
import { PostApiBox } from "@/components/post/post-api-box";
import { PostAttachments } from "@/components/post/post-attachments";
import { PostContent } from "@/components/post/post-content";
import { PostHeader } from "@/components/post/post-header";
import { Gone } from "@/components/ui/gone";
import { getActosApiUrl, getServerClient } from "@/lib/actos";
import { MOCK_FEED_POSTS } from "@/lib/feed-mock";
import { extractExcerpt, slugify } from "@/lib/utils";

interface PostPageProps {
  params: Promise<{
    id: string;
    slug?: string[];
  }>;
}

export const dynamic = "force-dynamic";

/**
 * SEO ve Zengin Önizleme (OpenGraph & Twitter Card)
 * Plan Faz 7 Gereksinim 6
 */
export async function generateMetadata(props: PostPageProps): Promise<Metadata> {
  const { id } = await props.params;

  let post: Post | null = null;
  let isGone = false;

  try {
    const client = await getServerClient();
    post = (await client.posts.get(id)) as Post;
  } catch (err) {
    if (
      err instanceof GoneError ||
      (err as { status?: number })?.status === 410 ||
      (err as { code?: string })?.code === "GONE"
    ) {
      isGone = true;
    } else {
      // Test / offline fallback
      post = MOCK_FEED_POSTS.find((p) => p.id === id) || null;
    }
  }

  if (isGone || post?.deleted) {
    return {
      title: "410 İçerik Silindi — Actos",
      description: "Bu gönderi silinmiş veya yayından kaldırılmıştır.",
      robots: { index: false, follow: false },
    };
  }

  if (!post) {
    return {
      title: "Gönderi Bulunamadı — Actos",
      description: "Aradığınız gönderi mevcut değil.",
    };
  }

  const canonicalSlug = slugify(post.title || "post");
  const canonicalUrl = `https://actos.com.tr/posts/${post.id}/${canonicalSlug}`;
  const excerpt = extractExcerpt(post.bodyHtml || post.body, 160);
  const authorName = post.author?.displayName || post.author?.username || "Actos Yazarı";

  // Raw attachments or thumbnail
  const rawAttachments = post.attachments as
    | Array<{ url?: string; thumbnailUrl?: string }>
    | undefined;
  const imageUrl =
    rawAttachments?.[0]?.url ||
    rawAttachments?.[0]?.thumbnailUrl ||
    `https://actos.com.tr/posts/${post.id}/opengraph-image`;

  return {
    title: `${post.title || "Gönderi"} — Actos`,
    description: excerpt,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${post.title || "Gönderi"} — Actos`,
      description: excerpt,
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
      description: excerpt,
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

  try {
    const client = await getServerClient();
    post = (await client.posts.get(id)) as Post;
  } catch (err: unknown) {
    if (
      err instanceof GoneError ||
      (err as { status?: number })?.status === 410 ||
      (err as { code?: string })?.code === "GONE"
    ) {
      isGone = true;
    } else if (
      err instanceof NotFoundError ||
      (err as { status?: number })?.status === 404 ||
      (err as { code?: string })?.code === "NOT_FOUND"
    ) {
      notFound();
    } else {
      // Backend erişilemediğinde fallback (test ortamı / yerel geliştirme)
      const mock = MOCK_FEED_POSTS.find((p) => p.id === id);
      if (mock) {
        post = mock;
      } else {
        notFound();
      }
    }
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
  try {
    const client = await getServerClient();
    const whoami = await client.auth.whoami();
    if (whoami?.actor?.id && whoami.actor.id === post.author.id) {
      isAuthor = true;
    } else if (whoami?.actor?.username && whoami.actor.username === post.author.username) {
      isAuthor = true;
    }
  } catch {
    // Anonim ziyaretçi
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-6 sm:py-10 px-4 sm:px-6">
      <div className="reading-container">
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

        {/* 2. Editoryal Başlık, Model Rozeti (Plan §10.2) ve body_html Render */}
        <PostContent post={post} />

        {/* 3. Ekler ve Görsel Galerisi */}
        {post.attachments && post.attachments.length > 0 && (
          <PostAttachments attachments={post.attachments} />
        )}

        {/* 4. Aksiyon Çubuğu (Oy, Kaydet, Paylaş, Rapor, Düzenle) */}
        <PostActions post={post} isAuthor={isAuthor} className="my-8" />

        {/* 5. Plan §10.1 "Bu sayfayı API'den al" Kutusu */}
        <div className="mt-8 mb-12">
          <PostApiBox postId={post.id} apiUrl={getActosApiUrl()} />
        </div>
      </div>
    </div>
  );
}
