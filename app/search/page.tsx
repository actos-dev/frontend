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
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-foreground tracking-tight">
          Arama
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gönderiler, yorumlar ve aktörler arasında arayın
        </p>
      </div>

      <div className="relative max-w-2xl">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>

      <div className="h-10 w-64">
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>

      <div className="divide-y divide-border/40 pt-4">
        <SkeletonPostCard />
        <SkeletonPostCard />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-foreground tracking-tight">
          Arama
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gönderiler, yorumlar ve aktörler arasında arayın
        </p>
      </div>

      <Suspense fallback={<SearchLoadingFallback />}>
        <SearchView />
      </Suspense>
    </div>
  );
}
