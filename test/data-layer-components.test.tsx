// @vitest-environment happy-dom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LoadMore } from "@/components/pagination/load-more";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import * as i18n from "@/lib/i18n";
import * as pagination from "@/lib/pagination";

describe("Faz 4 — Veri Katmanı ve UI Bileşenleri", () => {
  describe("1. EmptyState Bileşeni", () => {
    it("başlık, açıklama ve eylem butonunu doğru render etmelidir", () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="Henüz post yok"
          description="İlk postu sen atarak topluluğu canlandır."
          action={{
            label: "Post Oluştur",
            onClick: handleAction,
          }}
        />,
      );

      expect(screen.getByText("Henüz post yok")).toBeDefined();
      expect(screen.getByText("İlk postu sen atarak topluluğu canlandır.")).toBeDefined();

      const actionBtn = screen.getByRole("button", { name: "Post Oluştur" });
      expect(actionBtn).toBeDefined();

      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it("linkli eylemi Next Link ile doğru render etmelidir", () => {
      render(
        <EmptyState
          title="Kayıtlı post yok"
          action={{
            label: "Akışa Dön",
            href: "/",
          }}
        />,
      );

      const link = screen.getByRole("link", { name: "Akışa Dön" });
      expect(link.getAttribute("href")).toBe("/");
    });
  });

  describe("2. ErrorState Bileşeni", () => {
    it("hata kodu rozeti, açıklama ve istek ID'sini render etmelidir", () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState
          code="VALIDATION_FAILED"
          title="İşlem Başarısız"
          message="Lütfen formu kontrol edin."
          requestId="req_abc999"
          onRetry={handleRetry}
          retryLabel="Tekrar Dene"
        />,
      );

      expect(screen.getByText("VALIDATION_FAILED")).toBeDefined();
      expect(screen.getByText("İşlem Başarısız")).toBeDefined();
      expect(screen.getByText("Lütfen formu kontrol edin.")).toBeDefined();
      expect(screen.getByText("req_abc999")).toBeDefined();

      const retryBtn = screen.getByRole("button", { name: "Tekrar Dene" });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it("özel mesaj verilmediğinde hata kodunu otomatik çevirmelidir", () => {
      render(<ErrorState code="NOT_FOUND" locale="tr" />);
      expect(screen.getByText("NOT_FOUND")).toBeDefined();
      expect(screen.getByText("Aradığınız içerik veya kaynak bulunamadı.")).toBeDefined();
    });
  });

  describe("3. LoadMore Bileşeni", () => {
    it("nextCursor olduğunda 'Daha fazla' butonunu render etmeli ve tıklanınca fonksiyonu tetiklemelidir", async () => {
      const handleLoadMore = vi.fn();
      const syncSpy = vi.spyOn(pagination, "syncCursorToUrl").mockImplementation(() => {});

      render(
        <LoadMore nextCursor="cur_page_2" onLoadMore={handleLoadMore} label="Daha fazla yükle" />,
      );

      const btn = screen.getByRole("button", { name: "Daha fazla yükle" });
      expect(btn).toBeDefined();
      expect(btn.hasAttribute("disabled")).toBe(false);

      await act(async () => {
        fireEvent.click(btn);
      });
      expect(syncSpy).toHaveBeenCalledWith("cur_page_2", "push");
      expect(handleLoadMore).toHaveBeenCalledWith("cur_page_2");
    });

    it("yüklenme durumunda (isLoading) butonu devre dışı bırakmalı ve yükleniyor metnini göstermelidir", () => {
      render(
        <LoadMore
          nextCursor="cur_page_3"
          isLoading={true}
          loadingLabel="İçerikler getiriliyor..."
        />,
      );

      const btn = screen.getByRole("button", { name: "İçerikler getiriliyor..." });
      expect(btn.hasAttribute("disabled")).toBe(true);
    });

    it("sona ulaşıldığında (nextCursor null) ve endMessage verildiğinde mesajı göstermelidir", () => {
      render(<LoadMore nextCursor={null} hasMore={false} endMessage="Tüm içerikleri gördünüz." />);

      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.getByText("Tüm içerikleri gördünüz.")).toBeDefined();
    });
  });

  describe("4. LocaleSwitcher Bileşeni", () => {
    it("EN ve TR butonlarını render etmelidir", () => {
      render(<LocaleSwitcher />);
      expect(screen.getByRole("button", { name: "EN" })).toBeDefined();
      expect(screen.getByRole("button", { name: "TR" })).toBeDefined();
    });

    it("dil butonuna tıklandığında setLocale fonksiyonunu çağırmalıdır", () => {
      const setLocaleSpy = vi.spyOn(i18n, "setLocale").mockImplementation(() => {});
      // prevent actual window.location.reload in test environment
      const originalReload = window.location.reload;
      Object.defineProperty(window, "location", {
        value: { reload: vi.fn(), href: "http://localhost:3000" },
        writable: true,
      });

      render(<LocaleSwitcher />);
      const trBtn = screen.getByRole("button", { name: "TR" });
      fireEvent.click(trBtn);

      expect(setLocaleSpy).toHaveBeenCalledWith("tr");

      // Restore
      Object.defineProperty(window, "location", {
        value: { reload: originalReload, href: "http://localhost:3000" },
        writable: true,
      });
    });
  });
});
