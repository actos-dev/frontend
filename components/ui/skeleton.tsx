import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Loading placeholder (ROADMAP F-06 item 10): a flat `--bg-muted` block
 * with a subtle opacity pulse — no shimmer sweep. `motion-reduce:` stops
 * the pulse outright under `prefers-reduced-motion`, independent of the
 * global transition-duration override in app/globals.css.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-bg-muted motion-reduce:animate-none", className)}
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
      className={cn("px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50 space-y-3", className)}
      role="status"
      aria-busy="true"
      aria-label="İçerik yükleniyor"
    >
      {/* Üst satır: Avatar, Yazar, Tarih */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
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
