import { ArrowLeft, Clock, FileX2, Home, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GoneProps {
  className?: string;
  title?: string;
  message?: string;
  author?: {
    username: string;
    displayName?: string;
  };
  deletedAt?: string;
  reason?: "author" | "moderation" | "unknown";
}

/**
 * 410 İçerik Silindi Bileşeni (Plan §2 İlke 7 & §8)
 * "Silinmiş ≠ hiç olmamış. 410 ve 404 farklı ekranlar gösterir."
 */
export function Gone({
  className,
  title = "Bu içerik silindi",
  message = "Bu gönderi veya içerik daha önce Actos'ta mevcuttu, ancak yazarın kendi isteğiyle veya moderasyon kararıyla kaldırıldı.",
  author,
  deletedAt,
  reason = "unknown",
}: GoneProps) {
  const reasonText = {
    author: "Yazar tarafından silindi",
    moderation: "Topluluk kuralları uyarınca moderasyon tarafından kaldırıldı",
    unknown: "İçerik silinmiş olarak işaretlendi",
  }[reason];

  return (
    <div
      role="status"
      aria-labelledby="gone-title"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 sm:my-10 max-w-lg mx-auto",
        className,
      )}
    >
      {/* 410 Rozeti */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold mb-6">
        <FileX2 className="w-3.5 h-3.5" />
        <span>410 · Silinmiş İçerik</span>
      </div>

      {/* İkon */}
      <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-muted-foreground shadow-xs mb-5">
        <FileX2 className="w-8 h-8 opacity-80" />
      </div>

      {/* Başlık ve Açıklama */}
      <h1
        id="gone-title"
        className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif mb-3"
      >
        {title}
      </h1>

      <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-6">{message}</p>

      {/* İlke 7 Bilgi Kutusu */}
      <div className="w-full p-4 rounded-xl bg-surface-2/60 border border-border/80 text-left text-xs space-y-2 mb-8">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>İlke 7: Silinmiş ≠ Hiç Olmamış</span>
        </div>
        <p className="text-muted-foreground text-[11px] leading-normal">
          Actos, kaldırılan içerikleri 404 (bulunamadı) gibi gizlemez. Gönderinin daha önce var
          olduğu, ancak şu an yayında olmadığı açıkça belirtilir.
        </p>
        {(author || deletedAt || reason !== "unknown") && (
          <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {author && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>@{author.username}</span>
              </span>
            )}
            {deletedAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{deletedAt}</span>
              </span>
            )}
            <Badge variant="outline" size="sm" className="text-[10px] text-muted-foreground">
              {reasonText}
            </Badge>
          </div>
        )}
      </div>

      {/* Eylem Butonları */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="default" size="default" className="gap-2 rounded-xl">
          <Link href="/">
            <Home className="w-4 h-4" />
            <span>Akışa Dön</span>
          </Link>
        </Button>
        {author && (
          <Button asChild variant="outline" size="default" className="gap-2 rounded-xl">
            <Link href={`/u/${author.username}`}>
              <ArrowLeft className="w-4 h-4" />
              <span>Yazarın Profiline Git</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
