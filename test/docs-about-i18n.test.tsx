// @vitest-environment happy-dom

import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AboutPage, { generateMetadata } from "@/app/about/page";
import { RightRail } from "@/components/layout/right-rail";
import { Sidebar } from "@/components/layout/sidebar";
import { SiteFooter } from "@/components/layout/site-footer";
import { getDictionary } from "@/lib/i18n";

const enDict = getDictionary("en");
const t = (key: string) => {
  const parts = key.split(".");
  // biome-ignore lint/suspicious/noExplicitAny: test-only dictionary walk
  let current: any = enDict;
  for (const part of parts) current = current?.[part];
  return typeof current === "string" ? current : key;
};

// Next.js mock
vi.mock("next/navigation", () => ({
  usePathname: () => "/about",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Faz 20 — Dokümantasyon, /about Sayfası ve i18n Eşitlemesi", () => {
  /* ==========================================================================
     1. /about Sayfası Bileşen ve Metadata Doğrulaması (Çift Dilli)
     ========================================================================== */
  describe("1. /about Sayfası (Server Component)", () => {
    it("sayfa başlığı, felsefi manifestoyu ve kahraman alanını render etmelidir", async () => {
      const pageUi = await AboutPage();
      render(pageUi);

      // Hero başlığı (Varsayılan EN veya TR)
      const heroHeading = screen.getByRole("heading", {
        level: 1,
        name: /(The Common Square for Humans and AI Agents|İnsanlar ve Yapay Zeka Ajanları İçin Ortak Meydan)/i,
      });
      expect(heroHeading).toBeDefined();

      // Rozet
      expect(screen.getByText(/(Philosophy & Manifesto|Felsefe & Manifestomuz)/i)).toBeDefined();
    });

    it("4 temel felsefi ilke başlığını ve açıklamalarını eksiksiz render etmelidir", async () => {
      const pageUi = await AboutPage();
      render(pageUi);

      // İlke 1: Eşit Vatandaşlık (Equal Citizens)
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: /(Equal Citizenship \(Equal Citizens\)|Eşit Vatandaşlık \(Equal Citizens\))/i,
        }),
      ).toBeDefined();

      // İlke 2: Metin Kutsaldır (Text is Sacred)
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: /(Text is Sacred \(Text is Sacred\)|Metin Kutsaldır \(Text is Sacred\))/i,
        }),
      ).toBeDefined();

      // İlke 3: API Asıl Sözleşmedir (Radical Transparency)
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: /(The API is the True Contract \(Radical Transparency\)|API Asıl Sözleşmedir \(Radikal Şeffaflık\))/i,
        }),
      ).toBeDefined();

      // İlke 4: Güven ve Şeffaflık
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: /(Trust & Transparency|Güven ve Şeffaflık)/i,
        }),
      ).toBeDefined();

      // Asimetri durum kodları
      expect(screen.getAllByText(/410 GONE/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/200 OK/i).length).toBeGreaterThan(0);
    });

    it("temel aksiyon butonlarını ve linklerini doğru hedeflerle render etmelidir", async () => {
      const pageUi = await AboutPage();
      render(pageUi);

      // Kayıt & Keşfet Butonları
      const registerLink = screen.getByRole("link", {
        name: /(Join Community|Aramıza Katıl)/i,
      });
      expect(registerLink.getAttribute("href")).toBe("/register");

      const exploreLink = screen.getByRole("link", {
        name: /(Explore Feed|Akışı Keşfet)/i,
      });
      expect(exploreLink.getAttribute("href")).toBe("/");

      const tagsLink = screen.getByRole("link", {
        name: /(Popular Tags|Popüler Etiketler)/i,
      });
      expect(tagsLink.getAttribute("href")).toBe("/tags");

      // Dış bağlantılar
      const githubLink = screen.getByRole("link", {
        name: /(GitHub Source Code|GitHub Kaynak Kodu)/i,
      });
      expect(githubLink.getAttribute("href")).toBe("https://github.com/actos-dev");

      const docsLink = screen.getByRole("link", {
        name: /(API Documentation|API Dokümantasyonu)/i,
      });
      // ROADMAP K-05: the dead /docs link now points at the real /developers
      // stub page instead of a route that never existed.
      expect(docsLink.getAttribute("href")).toBe("/developers");
    });

    it("editoryal okuma sınıflarını (reading-container ve prose) içermelidir", async () => {
      const pageUi = await AboutPage();
      const { container } = render(pageUi);

      const readingContainer = container.querySelector(".reading-container");
      expect(readingContainer).toBeDefined();
      expect(readingContainer).not.toBeNull();

      const readingProse = container.querySelector(".prose");
      expect(readingProse).toBeDefined();
      expect(readingProse).not.toBeNull();
    });

    it("generateMetadata() geçerli SEO etiketleri ve OpenGraph üretmelidir", async () => {
      const meta = await generateMetadata();
      expect(meta.title).toMatch(/(About — Actos|Hakkında — Actos)/);
      expect(meta.description).toBeDefined();
      expect(meta.openGraph?.title).toMatch(/(About — Actos|Hakkında — Actos)/);
      expect(meta.openGraph?.url).toBe("/about");
      expect((meta.twitter as { card?: string })?.card).toBe("summary_large_image");
    });

    it("footer'da (her sayfada) /about linki yer almalı, sol menü sadeleşmiş olmalıdır", () => {
      render(<Sidebar />);
      expect(screen.queryByRole("link", { name: /^(Hakkında|About)$/i })).toBeNull();

      // ROADMAP K-03: the "Actos Nedir?" pitch box is gone from the right
      // rail entirely — /about is now reachable only via the footer that
      // appears on every page.
      render(
        <RightRail>
          <SiteFooter t={t} />
        </RightRail>,
      );
      const aboutLink = screen.getByRole("link", { name: /^About$/i });
      expect(aboutLink).toBeDefined();
      expect(aboutLink.getAttribute("href")).toBe("/about");
    });
  });

  /* ==========================================================================
     2. i18n Sözlük Eşitlemesi (tr.json & en.json)
     ========================================================================== */
  describe("2. i18n Sözlük Simetrisi", () => {
    function extractLeafKeys(obj: Record<string, unknown>, prefix = ""): string[] {
      let keys: string[] = [];
      for (const k of Object.keys(obj)) {
        const full = prefix ? `${prefix}.${k}` : k;
        const val = obj[k];
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          keys = keys.concat(extractLeafKeys(val as Record<string, unknown>, full));
        } else {
          keys.push(full);
        }
      }
      return keys;
    }

    const trPath = path.resolve(process.cwd(), "messages/tr.json");
    const enPath = path.resolve(process.cwd(), "messages/en.json");

    const trData = JSON.parse(fs.readFileSync(trPath, "utf-8"));
    const enData = JSON.parse(fs.readFileSync(enPath, "utf-8"));

    const trKeys = extractLeafKeys(trData);
    const enKeys = extractLeafKeys(enData);

    it("tr.json ve en.json dosyaları mevcut ve geçerli JSON olmalıdır", () => {
      expect(fs.existsSync(trPath)).toBe(true);
      expect(fs.existsSync(enPath)).toBe(true);
      expect(typeof trData).toBe("object");
      expect(typeof enData).toBe("object");
    });

    it("her iki sözlük de kapsamlı anahtar kümesine sahip olmalıdır (>350 anahtar)", () => {
      expect(trKeys.length).toBeGreaterThan(350);
      expect(enKeys.length).toBeGreaterThan(350);
    });

    it("tr.json ve en.json arasında hiçbir eksik anahtar olmamalı, %100 simetrik olmalıdır", () => {
      const trKeySet = new Set(trKeys);
      const enKeySet = new Set(enKeys);

      const missingInEn = trKeys.filter((k) => !enKeySet.has(k));
      const missingInTr = enKeys.filter((k) => !trKeySet.has(k));

      expect(missingInEn).toEqual([]);
      expect(missingInTr).toEqual([]);
      expect(trKeys.length).toBe(enKeys.length);
    });

    it("about bölümü her iki dilde de tüm gerekli anahtarları içermelidir", () => {
      const requiredAboutKeys = [
        "about.badge",
        "about.hero_title",
        "about.hero_subtitle",
        "about.cta_register",
        "about.cta_explore",
        "about.cta_tags",
        "about.cta_api_docs",
        "about.cta_github",
        "about.principles_title",
        "about.principle1_title",
        "about.principle1_desc",
        "about.principle2_title",
        "about.principle2_desc",
        "about.principle3_title",
        "about.principle3_desc",
        "about.principle4_title",
        "about.principle4_desc",
        "about.architecture_title",
        "about.architecture_desc",
        "about.stats_title",
        "about.stats_bundle",
        "about.stats_themes",
        "about.stats_audit",
        "about.stats_tests",
        "about.meta_title",
        "about.meta_description",
      ];

      for (const reqKey of requiredAboutKeys) {
        expect(trKeys).toContain(reqKey);
        expect(enKeys).toContain(reqKey);
      }
    });
  });

  /* ==========================================================================
     3. Dokümantasyon Dosyaları (README.md & NOTES.md)
     ========================================================================== */
  describe("3. Dokümantasyon Dosyaları (README.md & NOTES.md)", () => {
    const readmePath = path.resolve(process.cwd(), "README.md");
    const notesPath = path.resolve(process.cwd(), "NOTES.md");

    it("README.md mevcut olmalı ve temel başlıkları içermelidir", () => {
      expect(fs.existsSync(readmePath)).toBe(true);
      const content = fs.readFileSync(readmePath, "utf-8");

      // Vizyon & platform
      expect(content).toContain("Actos Web");
      expect(content).toContain("eşit vatandaşlık");
      expect(content).toContain("actos.com.tr");

      // Mimari & Teknolojiler
      expect(content).toContain("Next.js 15");
      expect(content).toContain("React 19");
      expect(content).toContain("Tailwind CSS v4");
      expect(content).toContain("Biome");
      expect(content).toContain("Vitest");
      expect(content).toContain("Playwright");
      expect(content).toContain("standalone");

      // Temel Tasarım İlkeleri
      expect(content).toContain("22 Erişilebilir Tema");
      expect(content).toContain("Sepia");
      expect(content).toContain("FOUC-Free SSR");
      expect(content).toContain("68ch");
      expect(content).toContain("Metin Kutsaldır");
      expect(content).toContain("Bu Sayfayı API'den Al");
      expect(content).toContain("Model Rozetleri");
      expect(content).toContain("Silinmiş İçerik Asimetrisi");

      // Docker & Testler
      expect(content).toContain("docker build -t actos-web .");
      expect(content).toContain("pnpm audit:bundle");
      expect(content).toContain("pnpm check:contrast");
      expect(content).toContain("AGPL-3.0-only");
    });

    it("NOTES.md mevcut olmalı ve backend standardında derinlemesine mimari bölümleri içermelidir", () => {
      expect(fs.existsSync(notesPath)).toBe(true);
      const content = fs.readFileSync(notesPath, "utf-8");

      // 3 ana bölüm
      expect(content).toContain("Bölüm 1 — Temel İlkeler ve Mimari Kararlar");
      expect(content).toContain("Bölüm 2 — Ölçümler ve Denetim Sonuçları");
      expect(content).toContain("Bölüm 3 — Bilinen Sınırlar ve Gelecek Yol Haritası");

      // Bölüm 1 İlkeleri
      expect(content).toContain("1. Eşit Vatandaşlık (Equal Citizens)");
      expect(content).toContain("2. Metin Kutsaldır (Text is Sacred)");
      expect(content).toContain("3. Parolasız Kriptografik Kimlik");
      expect(content).toContain("4. Silinmiş İçerik Asimetrisi");
      expect(content).toContain("410 GONE");
      expect(content).toContain("author_deleted: true");
      expect(content).toContain("5. Radikal Şeffaflık");
      expect(content).toContain("6. RFC 9457 Makine-Okunur Hata Dönüşümü");
      expect(content).toContain("7. FOUC'suz 22 Tema Motoru");
      expect(content).toContain("8. 3 Kolonlu Duyarlı Düzen ve Kasıtlı Sayfalama");
      expect(content).toContain("9. Standalone Docker ve Sağlık Ucu");
      expect(content).toContain("10. İptal Edilen Özellikler");

      // Bölüm 2 Ölçümleri
      expect(content).toContain("103 kB");
      expect(content).toContain("0 Gizli Anahtar Sızıntısı");
      expect(content).toContain("22 temanın 22'si de");
      expect(content).toContain("WCAG AA");
      expect(content).toContain("300 ms debounce");

      // Bölüm 3 Bilinen Sınırları
      expect(content).toContain("6 Seviye Girinti Sınırı");
      expect(content).toContain("Masaüstü İstemcisi (Tauri)");
    });
  });
});
