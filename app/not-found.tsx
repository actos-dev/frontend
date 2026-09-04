import { Compass, FileQuestion, Home, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div
      role="status"
      aria-labelledby="not-found-heading"
      className="flex flex-col items-center justify-center text-center p-8 sm:p-12 my-8 sm:my-16 max-w-lg mx-auto min-h-[50vh]"
    >
      {/* 404 Rozeti */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-semibold text-muted-foreground mb-6">
        <Compass className="w-3.5 h-3.5 text-primary" />
        <span>404 · Sayfa Bulunamadı</span>
      </div>

      {/* İkon */}
      <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-muted-foreground shadow-xs mb-5">
        <FileQuestion className="w-8 h-8 text-muted-foreground/80" />
      </div>

      {/* Başlık ve Metin */}
      <h1
        id="not-found-heading"
        className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif mb-3"
      >
        Aradığınız yol kayıp
      </h1>

      <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-8">
        İstediğiniz sayfa taşınmış, adı değiştirilmiş veya hiç var olmamış olabilir. Akışa dönüp
        keşfetmeye devam edebilirsiniz.
      </p>

      {/* Aksiyon Butonları */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="default" size="default" className="gap-2 rounded-xl">
          <Link href="/">
            <Home className="w-4 h-4" />
            <span>Akışa Dön</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="default" className="gap-2 rounded-xl">
          <Link href="/search">
            <Search className="w-4 h-4" />
            <span>Arama Yap</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
