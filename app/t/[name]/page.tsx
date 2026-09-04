import type { Post } from "actos";
import { Hash } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TagStream } from "@/components/tags/tag-stream";
import { getServerClient } from "@/lib/actos";
import { MOCK_FEED_POSTS } from "@/lib/feed-mock";

interface TagPageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ cursor?: string; sort?: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `#${decodedName} | Actos`,
    description: `#${decodedName} etiketi ile paylaşılan gönderiler ve tartışmalar.`,
  };
}

export const dynamic = "force-dynamic";

export default async function TagDetailPage({ params, searchParams }: TagPageProps) {
  const { name } = await params;
  const { cursor, sort } = await searchParams;
  const decodedName = decodeURIComponent(name).toLowerCase();

  let posts: Post[] = [];
  let nextCursor: string | null = null;
  let totalCount: number = 0;

  try {
    const client = await getServerClient();
    const page = await client.tags.posts(decodedName, {
      limit: 25,
      cursor,
      sort: (sort as "hot" | "new" | "top") || "hot",
      fields: ["bodyHtml" as keyof Post],
    });

    posts = page.items;
    nextCursor = page.nextCursor ?? null;
    totalCount = posts.length;

    // Also attempt to get tag summary for total post count if available
    try {
      const tagList = await client.tags.popular({ limit: 100 });
      const currentTag = tagList.items.find((t) => t.name.toLowerCase() === decodedName);
      if (currentTag && currentTag.postCount !== undefined) {
        totalCount = currentTag.postCount;
      }
    } catch {
      // Ignore count fetch error
    }
  } catch (_err) {
    // Offline fallback: filter mock posts by tag
    const matched = MOCK_FEED_POSTS.filter((p) =>
      p.tags?.some((t) => t.toLowerCase() === decodedName),
    );
    posts = cursor ? [] : matched;
    totalCount = matched.length;
    nextCursor = null;
  }

  return (
    <div className="space-y-6">
      {/* Etiket Başlığı */}
      <div className="border-b border-border/60 pb-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border flex items-center justify-center shadow-xs text-primary">
              <Hash className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-foreground tracking-tight flex items-center gap-1">
                <span className="text-primary font-bold">#</span>
                <span>{decodedName}</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                <span className="font-semibold text-foreground">{totalCount}</span> gönderi
              </p>
            </div>
          </div>

          <Link
            href="/tags"
            className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            <span>← Tüm etiketlere dön</span>
          </Link>
        </div>
      </div>

      {/* Gönderi Akışı */}
      <TagStream tagName={decodedName} initialPosts={posts} initialNextCursor={nextCursor} />
    </div>
  );
}
