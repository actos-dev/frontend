import type * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-2", className)}
      {...props}
    />
  );
}

/**
 * Feed post yükleme iskeleti ön ayarı
 */
function SkeletonPostCard({ className }: { className?: string }) {
  return (
    <div
      className={cn("p-4 rounded-xl border border-border bg-card space-y-3", className)}
      role="status"
      aria-busy="true"
      aria-label="İçerik yükleniyor"
    >
      {/* Üst satır: Avatar, Yazar, Tarih */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>

      {/* Başlık ve Gövde Satırları */}
      <div className="space-y-2 pt-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
      </div>

      {/* Alt Aksiyon Çubuğu */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-14 rounded-md" />
        </div>
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
    </div>
  );
}

export { Skeleton, SkeletonPostCard };
