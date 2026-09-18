import type { Tag } from "actos";
import type { Metadata } from "next";
import { TagsDirectory } from "@/components/tags/tags-directory";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { getServerClient } from "@/lib/actos";
import { describeError } from "@/lib/errors";
import { getServerLocale, getTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  return {
    title: `${t("tags.directory_title")} | Actos`,
    description: t("tags.directory_description"),
  };
}

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const { t } = getTranslations(await getServerLocale());
  const popularTags: Tag[] = [];
  let loadError: unknown = null;

  try {
    const client = await getServerClient();
    let cursor: string | undefined;
    // The API has no total count. Walk its cursor so A–Z is a directory, not
    // merely a re-sort of the first popular page. The ceiling prevents a
    // malformed cursor cycle from making the request unbounded.
    for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
      const page = await client.tags.popular({ limit: 100, cursor });
      popularTags.push(...page.items);
      if (!page.nextCursor || page.nextCursor === cursor) break;
      cursor = page.nextCursor;
    }
  } catch (error) {
    // No fabricated tags (ROADMAP.md P0-02, decision 7): render an error
    // state with retry instead.
    loadError = error;
  }

  return (
    <div>
      {/* Başlık Alanı */}
      <div className="px-4 sm:px-6 py-5 border-b border-border/60 space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-foreground">
          {t("tags.directory_title")}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("tags.directory_intro")}</p>
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
