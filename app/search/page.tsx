import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "@/components/search/search-view";
import { Skeleton, SkeletonPostCard } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Arama | Actos",
  description: "Gönderiler, yorumlar ve aktörler arasında arama yapın.",
};

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

export default function SearchPage() {
  return (
    <div>
      {/* Arama Sayfa Başlığı */}
      <div className="px-4 sm:px-6 py-5 border-b border-border/60 space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-foreground">Arama</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Gönderiler, yorumlar ve aktörler arasında arayın
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
