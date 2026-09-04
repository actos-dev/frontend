"use client";

import { AlertTriangle, Home, RotateCw, Terminal } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hatayı konsola logla
    console.error("Actos Uygulama Hatası:", error);
  }, [error]);

  return (
    <div
      role="alert"
      aria-labelledby="error-heading"
      className="flex flex-col items-center justify-center text-center p-8 sm:p-12 my-8 sm:my-16 max-w-lg mx-auto min-h-[50vh]"
    >
      {/* 500 Rozeti */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold mb-6">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Sistem Hatası</span>
      </div>

      {/* İkon */}
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shadow-xs mb-5">
        <AlertTriangle className="w-8 h-8" />
      </div>

      {/* Başlık ve Açıklama (Plan §8: Sunucu detayları gizlenir, anlaşılır mesaj verilir) */}
      <h1
        id="error-heading"
        className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif mb-3"
      >
        Bir şeyler ters gitti
      </h1>

      <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-6">
        Sayfa yüklenirken beklenmedik bir durum oluştu. Sorunu çözmek için tekrar deneyebilir veya
        ana akışa dönebilirsiniz.
      </p>

      {/* Hata Referans Kodu (Plan §8: request_id / digest desteğe iletmek için basılır) */}
      {error.digest && (
        <div className="w-full p-3 rounded-xl bg-surface-2 border border-border flex items-center justify-between text-xs font-mono text-muted-foreground mb-8">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            <span>Hata Referansı:</span>
          </div>
          <span className="font-semibold text-foreground select-all">{error.digest}</span>
        </div>
      )}

      {/* Aksiyon Butonları */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          onClick={() => reset()}
          variant="default"
          size="default"
          className="gap-2 rounded-xl"
        >
          <RotateCw className="w-4 h-4" />
          <span>Tekrar Dene</span>
        </Button>
        <Button asChild variant="outline" size="default" className="gap-2 rounded-xl">
          <Link href="/">
            <Home className="w-4 h-4" />
            <span>Akışa Dön</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
