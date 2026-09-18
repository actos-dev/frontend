import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "@/components/search/search-view";
import { Skeleton, SkeletonPostCard } from "@/components/ui/skeleton";
import { getServerLocale, getTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  return {
    title: `${t("searchPage.title")} | Actos`,
    description: t("searchPage.description"),
  };
}

export const dynamic = "force-dynamic";

function SearchLoadingFallback() {
  return (
    <div className="space-y-6">
      <div className="relative max-w-2xl">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>

      <div className="h-10 w-64">
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>

      <div className="divide-y divide-border/40 pt-4 -mx-4 sm:-mx-6">
        <SkeletonPostCard />
        <SkeletonPostCard />
      </div>
    </div>
  );
}

export default async function SearchPage() {
  const { t } = getTranslations(await getServerLocale());

  return (
    <div>
      {/* Arama Sayfa Başlığı */}
      <div className="px-4 sm:px-6 py-5 border-b border-border/60 space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-foreground">
          {t("searchPage.title")}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("searchPage.heading_description")}
        </p>
      </div>

      {/* Arama Görünümü */}
      <div className="px-4 sm:px-6 py-6">
        <Suspense fallback={<SearchLoadingFallback />}>
          <SearchView />
        </Suspense>
      </div>
    </div>
  );
}
