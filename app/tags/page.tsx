import type { Tag } from "actos";
import type { Metadata } from "next";
import { TagsDirectory } from "@/components/tags/tags-directory";
import { getServerClient } from "@/lib/actos";
import { FALLBACK_TAGS } from "@/lib/tags";

export const metadata: Metadata = {
  title: "Etiketler | Actos",
  description: "Topluluk tarafından en çok kullanılan etiketler ve popüler konular.",
};

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  let popularTags: Tag[] = [];

  try {
    const client = await getServerClient();
    const page = await client.tags.popular({ limit: 100 });
    popularTags = page.items;
  } catch (_err) {
    // Graceful offline fallback
    popularTags = FALLBACK_TAGS.map((t) => ({
      name: t.name,
      postCount: t.postCount,
      createdAt: new Date().toISOString(),
    }));
  }

  return (
    <div className="space-y-6">
      {/* Başlık Alanı */}
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-foreground tracking-tight">
          Etiketler
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Topluluk tarafından en çok paylaşılan konular ve popüler etiketler
        </p>
      </div>

      {/* Etiketler Dizini Bileşeni */}
      <TagsDirectory initialTags={popularTags} />
    </div>
  );
}
