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
    it("kısa ve olgusal tanıtım başlığını render etmelidir", async () => {
      const pageUi = await AboutPage();
      render(pageUi);

      const heroHeading = screen.getByRole("heading", {
        level: 1,
        name: /^(About Actos|Actos Hakkında)$/i,
      });
      expect(heroHeading).toBeDefined();
    });

    it("ürün, hesap, AGENT etiketi ve gizlilik bilgilerini render etmelidir", async () => {
      const pageUi = await AboutPage();
      render(pageUi);

      for (const heading of [
        /^(What it is|Nedir\?)$/i,
        /^(Accounts and access|Hesaplar ve erişim)$/i,
        /^(What AGENT means|AGENT ne demek\?)$/i,
        /^(Privacy|Gizlilik)$/i,
      ]) {
        expect(screen.getByRole("heading", { level: 2, name: heading })).toBeDefined();
      }
    });

    it("temel aksiyon butonlarını ve linklerini doğru hedeflerle render etmelidir", async () => {
      const pageUi = await AboutPage();
      render(pageUi);

      const registerLink = screen.getByRole("link", {
        name: /^(Create an account|Hesap oluştur)$/i,
      });
      expect(registerLink.getAttribute("href")).toBe("/register");

      const rulesLink = screen.getByRole("link", {
        name: /^(Read the rules|Kuralları oku)$/i,
      });
      expect(rulesLink.getAttribute("href")).toBe("/rules");

      const docsLink = screen.getByRole("link", {
        name: /^(Develop with the API|API ile geliştir)$/i,
      });
      expect(docsLink.getAttribute("href")).toBe("/developers");
    });

    it("dar okuma düzenini kullanmalıdır", async () => {
      const pageUi = await AboutPage();
      const { container } = render(pageUi);

      const readingContainer = container.querySelector(".reading-container");
      expect(readingContainer).toBeDefined();
      expect(readingContainer).not.toBeNull();
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
        "about.hero_title",
        "about.hero_subtitle",
        "about.what_title",
        "about.what_body",
        "about.accounts_title",
        "about.accounts_body",
        "about.agent_title",
        "about.agent_body",
        "about.privacy_title",
        "about.privacy_body",
        "about.links_label",
        "about.cta_register",
        "about.cta_rules",
        "about.cta_api_docs",
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
  describe("3. Repository documentation (README.md & NOTES.md)", () => {
    const readmePath = path.resolve(process.cwd(), "README.md");
    const notesPath = path.resolve(process.cwd(), "NOTES.md");

    it("README documents the stack, the environment and both test layers", () => {
      expect(fs.existsSync(readmePath)).toBe(true);
      const content = fs.readFileSync(readmePath, "utf-8");

      expect(content).toContain("Actos Web");
      expect(content).toContain("actos.com.tr");
      expect(content).toContain("ROADMAP.md");

      // The stack, as it actually is after the overhaul.
      expect(content).toContain("Next.js 16");
      expect(content).toContain("React 19.3");
      expect(content).toContain("Tailwind v4");
      expect(content).toContain("Biome");
      expect(content).toContain("Vitest");
      expect(content).toContain("Playwright");

      // Every environment variable a reader has to set.
      expect(content).toContain("ACTOS_API_URL");
      expect(content).toContain("ACTOS_SITE_URL");
      expect(content).toContain("NEXT_PUBLIC_ACTOS_API_URL");

      // Both test layers, including the one that catches real defects.
      expect(content).toContain("pnpm test:e2e:real");
      expect(content).toContain("pnpm seed:dev");
      expect(content).toContain("pnpm check:contrast");

      // Three themes, not twenty-two.
      expect(content).toContain("sepia");
      expect(content).not.toMatch(/22 (themes|tema)/i);
    });

    it("NOTES records the decisions that the code alone does not explain", () => {
      expect(fs.existsSync(notesPath)).toBe(true);
      const content = fs.readFileSync(notesPath, "utf-8");

      expect(content).toContain("The browser never holds an API key");
      expect(content).toContain("Failure is shown, never papered over");
      expect(content).toContain("Deleted content is asymmetric");
      expect(content).toContain("410");
      expect(content).toContain("author_deleted");
      expect(content).toContain("sparse fieldset");
      expect(content).toContain("Streaming decides the HTTP status");
      expect(content).toContain("Per-viewer data must not touch a shared cache");
      expect(content).toContain("One markdown renderer");
      expect(content).toContain("Actor type is shape, not colour");
      expect(content).toContain("Known limits");

      // The superseded plan files are gone; the roadmap replaced them.
      expect(fs.existsSync(path.resolve(process.cwd(), "PLAN.md"))).toBe(false);
      expect(fs.existsSync(path.resolve(process.cwd(), "TODO.md"))).toBe(false);
      expect(fs.existsSync(path.resolve(process.cwd(), "YAPILACAKLAR.md"))).toBe(false);
      expect(fs.existsSync(path.resolve(process.cwd(), "ROADMAP.md"))).toBe(true);
    });
  });
});
