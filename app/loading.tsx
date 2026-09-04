import { Skeleton, SkeletonPostCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="İçerik yükleniyor"
      className="divide-y divide-border/60"
    >
      {/* Akış Başlığı / Sekme İskeleti */}
      <div className="flex items-center justify-between p-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Akış Gönderi İskeletleri */}
      <div className="p-4 space-y-4">
        <SkeletonPostCard />
        <SkeletonPostCard />
        <SkeletonPostCard />
      </div>
    </div>
  );
}
