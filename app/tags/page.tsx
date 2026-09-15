import type { Tag } from "actos";
import type { Metadata } from "next";
import { TagsDirectory } from "@/components/tags/tags-directory";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { getServerClient } from "@/lib/actos";
import { describeError } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Etiketler | Actos",
  description: "Topluluk tarafından en çok kullanılan etiketler ve popüler konular.",
};

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  let popularTags: Tag[] = [];
  let loadError: unknown = null;

  try {
    const client = await getServerClient();
    const page = await client.tags.popular({ limit: 100 });
    popularTags = page.items;
  } catch (error) {
    // No fabricated tags (ROADMAP.md P0-02, decision 7): render an error
    // state with retry instead.
    loadError = error;
  }

  return (
    <div>
      {/* Başlık Alanı */}
      <div className="px-4 sm:px-6 py-5 border-b border-border/60 space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-foreground">Etiketler</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Topluluk tarafından en çok paylaşılan konular ve popüler etiketler
        </p>
      </div>

      {/* Etiketler Dizini Bileşeni */}
      <div className="px-4 sm:px-6 py-6">
        {loadError ? (
          <ErrorStateRetry {...describeError(loadError)} />
        ) : (
          <TagsDirectory initialTags={popularTags} />
        )}
      </div>
    </div>
  );
}
