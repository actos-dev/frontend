// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";
import Loading from "@/app/loading";
import NotFound from "@/app/not-found";
import { AppShell } from "@/components/layout/app-shell";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { RightRail } from "@/components/layout/right-rail";
import { Sidebar } from "@/components/layout/sidebar";
import { Gone } from "@/components/ui/gone";
import { useSessionStore } from "@/lib/stores/session-store";
import { MOCK_USERS } from "@/test/fixtures/users";

// Next.js navigasyon mock'ı
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Faz 3 — Uygulama Kabuğu ve Düzen Bileşenleri", () => {
  beforeEach(() => {
    // Her test öncesi oturumu sıfırla
    useSessionStore.setState({ user: null, unreadCount: 0 });
  });

  /* ==========================================================================
     1. Sol Navigasyon (Sidebar) ve Koşullu Satırlar (§4.1, §4.3)
     ========================================================================== */
  describe("1. Sol Navigasyon (Sidebar)", () => {
    it("marka adını (Actos) ve ana sayfa linkini render etmelidir", () => {
      render(<Sidebar />);
      const brandLinks = screen.getAllByRole("link", { name: /Actos/i });
      expect(brandLinks.length).toBeGreaterThan(0);
      expect(brandLinks[0].getAttribute("href")).toBe("/");
    });

    it("temel halka açık menü linklerini render etmelidir", () => {
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: /(Akış|Feed)/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /(Arama|Search)/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /(Etiketler|Tags)/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /(Kaydedilenler|Saved)/i })).toBeDefined();

      // Temalar, Bileşenler ve Hakkında ana sol menüden sadeleştirildi
      expect(screen.queryByRole("link", { name: /(Temalar|Themes)/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /(Bileşenler|Design)/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /^(Hakkında|About)$/i })).toBeNull();
    });

    it("belirgin 'Yeni Post' butonunu render etmelidir", () => {
      render(<Sidebar />);
      const newPostBtn = screen.getByRole("link", { name: /(Yeni Post|New Post)/i });
      expect(newPostBtn).toBeDefined();
      expect(newPostBtn.getAttribute("href")).toBe("/new");
    });

    it("anonim kullanıcıda Bildirimler ve Moderasyon linklerini GÖSTERMEMELİ, Giriş/Kayıt butonlarını göstermelidir", () => {
      render(<Sidebar user={null} />);
      expect(screen.queryByRole("link", { name: /(Bildirimler|Notifications)/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /(Moderasyon|Moderation)/i })).toBeNull();

      expect(screen.getByRole("link", { name: /(Giriş|Log In)/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /(Kayıt|Register)/i })).toBeDefined();
    });

    it("giriş yapmış standart kullanıcıda Bildirimler'i göstermeli, Moderasyon'u gizlemeli ve kullanıcı kartını basmalıdır", () => {
      const user = MOCK_USERS.humanUser; // role: user
      render(<Sidebar user={user} unreadCount={3} />);

      // Bildirimler ve okunmamış rozeti
      const inboxLink = screen.getByRole("link", { name: /(Bildirimler|Notifications)/i });
      expect(inboxLink).toBeDefined();
      expect(screen.getByText("3")).toBeDefined();

      // Moderasyon görünmemeli
      expect(screen.queryByRole("link", { name: /(Moderasyon|Moderation)/i })).toBeNull();

      // Kullanıcı bilgileri
      expect(screen.getByText("@efe")).toBeDefined();
      expect(screen.getByText("Efe")).toBeDefined();
      expect(screen.getByTitle(/(Çıkış yap|Log Out)/i)).toBeDefined();
    });

    it("moderator veya admin rolüne sahip kullanıcıda Moderasyon linkini render etmelidir", () => {
      const modUser = MOCK_USERS.moderatorUser; // role: moderator
      const { rerender } = render(<Sidebar user={modUser} />);
      expect(screen.getByRole("link", { name: /(Moderasyon|Moderation)/i })).toBeDefined();
      expect(screen.getByText("Mod")).toBeDefined();

      const adminUser = MOCK_USERS.adminAgent; // role: admin
      rerender(<Sidebar user={adminUser} />);
      expect(screen.getByRole("link", { name: /(Moderasyon|Moderation)/i })).toBeDefined();
      expect(screen.getByText("Admin")).toBeDefined();
    });

    it("tema seçici bileşenini içermelidir", () => {
      render(<Sidebar />);
      expect(screen.getByRole("group", { name: "Tema seçici" })).toBeDefined();
    });
  });

  /* ==========================================================================
     2. Sağ Ray (RightRail) (§4.1)
     ========================================================================== */
  describe("2. Sağ Ray (RightRail)", () => {
    const sampleTags = [
      { name: "rust", count: 128 },
      { name: "postgres", count: 94 },
    ];

    it("gerçek etiket verisi verildiğinde popüler etiketler kartını ve sayaçlarını listelemelidir (P0-05)", () => {
      render(<RightRail tags={sampleTags} />);
      expect(screen.getByRole("heading", { name: /Popular tags/i })).toBeDefined();
      expect(screen.getByText("rust")).toBeDefined();
      expect(screen.getByText("128")).toBeDefined();
      expect(screen.getByText("postgres")).toBeDefined();
      expect(screen.getByText("94")).toBeDefined();
      expect(screen.getByRole("link", { name: /Tüm etiketleri keşfet/i })).toBeDefined();
    });

    it("tags null olduğunda veya hiç verilmediğinde popüler etiketler bölümünü hiç render etmemelidir (P0-05)", () => {
      const { rerender } = render(<RightRail tags={null} />);
      expect(screen.queryByRole("heading", { name: /Popular tags/i })).toBeNull();
      expect(screen.queryByText("rust")).toBeNull();

      // Prop hiç verilmediğinde de (varsayılan undefined) aynı şekilde davranmalı;
      // artık hardcoded DEFAULT_POPULAR_TAGS'e asla düşmemeli.
      rerender(<RightRail />);
      expect(screen.queryByRole("heading", { name: /Popular tags/i })).toBeNull();

      rerender(<RightRail tags={[]} />);
      expect(screen.queryByRole("heading", { name: /Popular tags/i })).toBeNull();
    });

    it("Actos nedir tanıtım kutusunu ve linklerini render etmelidir", () => {
      render(<RightRail />);
      expect(screen.getByRole("heading", { name: /Actos Nedir/i })).toBeDefined();
      expect(screen.getByText(/API-first/i)).toBeDefined();
      expect(screen.getByRole("link", { name: /Felsefemiz & Hakkında/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /API Dokümantasyonu/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /GitHub Kaynak Kodu/i })).toBeDefined();
    });

    it("Plan §4.1 kuralı: Rate limit veya kota göstergesi İÇERMEMELİDİR", () => {
      const { container } = render(<RightRail />);
      const text = container.textContent?.toLowerCase() || "";
      expect(text).not.toContain("rate limit");
      expect(text).not.toContain("kota göstergesi");
      expect(text).not.toContain("depolama kotası");
    });
  });

  /* ==========================================================================
     3. AppShell (Üç Kolon Düzen Altyapısı) (§4.1, §4.2)
     ========================================================================== */
  describe("3. Üç Kolon Düzeni (AppShell)", () => {
    it("çocuk içerikleri (children) orta içerik alanında render etmelidir", () => {
      render(
        <AppShell>
          <div data-testid="feed-content">Akış İçeriği</div>
        </AppShell>,
      );
      expect(screen.getByTestId("feed-content")).toBeDefined();
      const main = screen.getByRole("main");
      expect(main).toBeDefined();
      // Orta kolonda kart çerçevesi yok (max-w-[720px])
      expect(main.className).toContain("max-w-[720px]");
    });

    it("hideRightRail prop'u verildiğinde sağ rayı gizlemelidir", () => {
      render(
        <AppShell hideRightRail>
          <div>İçerik</div>
        </AppShell>,
      );
      expect(screen.queryByLabelText("Sağ Bilgi Paneli")).toBeNull();
    });
  });

  /* ==========================================================================
     4. Mobil Deneyim (MobileNav & MobileDrawer & MobileHeader)
     ========================================================================== */
  describe("4. Mobil Deneyim", () => {
    it("MobileNav alt sekme çubuğunda 5 ana eylemi sunmalıdır", () => {
      render(<MobileNav />);
      const nav = screen.getByRole("navigation", { name: "Mobil Alt Sekme Çubuğu" });
      expect(nav).toBeDefined();
      expect(screen.getByRole("link", { name: /(Akış|Feed)/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /(Arama|Search)/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /(Yeni Post|New Post)/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /(Bildirimler|Notifications)/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /(Giriş|Log In)/i })).toBeDefined();
    });

    it("MobileHeader başlık ve menü butonunu sunmalıdır", () => {
      const handleOpen = vi.fn();
      render(<MobileHeader onOpenMenu={handleOpen} />);
      const menuBtn = screen.getByRole("button", { name: "Menüyü aç" });
      fireEvent.click(menuBtn);
      expect(handleOpen).toHaveBeenCalledTimes(1);
    });

    it("MobileDrawer açıldığında tam menü içeriğini sunmalıdır", () => {
      render(<MobileDrawer open={true} onOpenChange={() => {}} />);
      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByRole("button", { name: "Menüyü Kapat" })).toBeDefined();
    });
  });

  /* ==========================================================================
     5. Özel Durum Sayfaları (NotFound, Error, Loading, Gone)
     ========================================================================== */
  describe("5. Özel Durum Sayfaları", () => {
    it("NotFound (404) sayfasını ve geri dönüş butonunu render etmelidir", () => {
      render(<NotFound />);
      expect(screen.getByText(/404 · Sayfa Bulunamadı/i)).toBeDefined();
      expect(screen.getByText(/Aradığınız yol kayıp/i)).toBeDefined();
      expect(screen.getByRole("link", { name: /Akışa Dön/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /Arama Yap/i })).toBeDefined();
    });

    it("Error (500) sayfasını, hata referansını ve Tekrar Dene butonunu render etmelidir", () => {
      const mockReset = vi.fn();
      const mockError = new Error("Veritabanı bağlantı zaman aşımı");
      (mockError as unknown as { digest: string }).digest = "REQ_987654";

      render(<ErrorPage error={mockError} reset={mockReset} />);
      expect(screen.getByText(/Bir şeyler ters gitti/i)).toBeDefined();
      expect(screen.getByText("REQ_987654")).toBeDefined();

      const retryBtn = screen.getByRole("button", { name: /Tekrar Dene/i });
      fireEvent.click(retryBtn);
      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it("Loading iskelet bileşeni status rolü ile render edilmelidir", () => {
      render(<Loading />);
      const loadingElements = screen.getAllByRole("status");
      expect(loadingElements.length).toBeGreaterThan(0);
      expect(loadingElements[0].getAttribute("aria-busy")).toBe("true");
    });

    it("Gone (410) bileşeni İlke 7'ye uygun olarak silinmiş içeriği 404'ten farklı belirtmelidir", () => {
      render(
        <Gone
          title="Rust Rehberi Silindi"
          message="Bu gönderi yazar tarafından arşivlendi."
          author={{ username: "efe" }}
          reason="author"
        />,
      );

      // 410 rozeti ve İlke 7
      expect(screen.getByText(/410 · Silinmiş İçerik/i)).toBeDefined();
      expect(screen.getByText(/İlke 7: Silinmiş ≠ Hiç Olmamış/i)).toBeDefined();
      expect(screen.getByText("Rust Rehberi Silindi")).toBeDefined();
      expect(screen.getByText("Yazar tarafından silindi")).toBeDefined();
      expect(screen.getByText("@efe")).toBeDefined();
      expect(screen.getByRole("link", { name: /Akışa Dön/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /Yazarın Profiline Git/i })).toBeDefined();
    });
  });
});
