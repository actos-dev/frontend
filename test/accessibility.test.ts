// @vitest-environment happy-dom

import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import type { CommentNode, Post } from "actos";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { CommentNodeComponent } from "@/components/comments/comment-node";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { PostCard } from "@/components/feed/post-card";
import { ShortcutsDialog } from "@/components/keyboard/shortcuts-dialog";
import { AppShell } from "@/components/layout/app-shell";
import { SkipToContent } from "@/components/layout/skip-to-content";
import { PostActions } from "@/components/post/post-actions";
import { ReportDialog } from "@/components/post/report-dialog";
import { ActorBadge } from "@/components/ui/badge";
import {
  auditAllThemes,
  contrastRatio,
  hexToRgb,
  relativeLuminance,
} from "../scripts/check-theme-contrast";

const samplePost: Post = {
  id: "c_post_a11y_1",
  contentType: "post",
  title: "Erişilebilirlik ve Tema Mimarisi",
  body: "WCAG 2.1 AA kontrast denetimi ve ekran okuyucu uyumluluğu.",
  bodyHtml: "<p>WCAG 2.1 AA kontrast denetimi ve ekran okuyucu uyumluluğu.</p>",
  bodyFormat: "markdown",
  score: 42,
  upvotes: 45,
  downvotes: 3,
  commentCount: 5,
  tags: [],
  authorDeleted: false,
  deleted: false,
  createdAt: "2026-09-04T12:00:00Z",
  editedAt: null,
  metadata: {},
  author: {
    id: "u_author_1",
    username: "ada_lovelace",
    displayName: "Ada Lovelace",
    actorType: "ai_agent",
    avatarUrl: null,
    createdAt: "2026-09-04T12:00:00Z",
    trustLevel: 1,
  },
};

describe("Faz 17 — Erişilebilirlik ve Tema Denetimi (WCAG 2.1 AA)", () => {
  // ==========================================================================
  // 1. Bağıl Parlaklık ve Kontrast Oranı Hesaplama Algoritması
  // ==========================================================================
  describe("1. Bağıl Parlaklık ve Kontrast Algoritması (scripts/check-theme-contrast.ts)", () => {
    it("hexToRgb hem 3 basamaklı hem 6 basamaklı hex kodlarını ve rgb fonksiyonlarını ayrıştırmalıdır", () => {
      expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
      expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
      expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
      expect(hexToRgb("#000")).toEqual([0, 0, 0]);
      expect(hexToRgb("rgb(255, 128, 0)")).toEqual([255, 128, 0]);
    });

    it("relativeLuminance saf beyazda 1.0, saf siyahta 0.0 üretmelidir", () => {
      expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1.0, 4);
      expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0.0, 4);
    });

    it("contrastRatio saf siyah ile saf beyaz arasında teorik azami 21:1 oranını vermelidir", () => {
      expect(contrastRatio("#000000", "#ffffff")).toBe(21);
      expect(contrastRatio("#ffffff", "#000000")).toBe(21);
    });

    it("contrastRatio aynı iki renk arasında taban 1:1 oranını vermelidir", () => {
      expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
      expect(contrastRatio("#123456", "#123456")).toBe(1);
    });

    it("WCAG AA için bilinen referans gri (#767676) beyaz zemin üzerinde >= 4.5:1 vermelidir", () => {
      const ratio = contrastRatio("#767676", "#ffffff");
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  // ==========================================================================
  // 2. 22 Temanın Tamamı İçin WCAG AA Kontrast Denetimi
  // ==========================================================================
  describe("2. 22 Temanın WCAG AA Kontrast Denetimi", () => {
    const report = auditAllThemes();

    it("tam 22 tema taranmış olmalıdır", () => {
      expect(report.totalThemes).toBe(22);
    });

    it("22 temanın her birinde tek bir kontrast hatası dahi bulunmamalıdır (0 fail)", () => {
      expect(report.failedCount).toBe(0);
      expect(report.passedCount).toBe(22);
    });

    it("tüm temalarda foreground / background kontrastı en az 4.5:1 (Normal Text AA) olmalıdır", () => {
      for (const theme of report.themes) {
        const fgCheck = theme.checks.find((c) => c.checkName === "foreground / background");
        expect(
          fgCheck,
          `${theme.themeId} için foreground / background kontrolü bulunamadı`,
        ).toBeDefined();
        expect(
          fgCheck?.passed,
          `${theme.themeId} foreground/background kontrastı yetersiz: ${fgCheck?.contrastRatio}:1`,
        ).toBe(true);
        expect(fgCheck?.contrastRatio).toBeGreaterThanOrEqual(4.5);
      }
    });

    it("tüm temalarda card-foreground / card kontrastı en az 4.5:1 (Normal Text AA) olmalıdır", () => {
      for (const theme of report.themes) {
        const cardCheck = theme.checks.find((c) => c.checkName === "card-foreground / card");
        expect(
          cardCheck,
          `${theme.themeId} için card-foreground / card kontrolü bulunamadı`,
        ).toBeDefined();
        expect(
          cardCheck?.passed,
          `${theme.themeId} card-foreground/card kontrastı yetersiz: ${cardCheck?.contrastRatio}:1`,
        ).toBe(true);
        expect(cardCheck?.contrastRatio).toBeGreaterThanOrEqual(4.5);
      }
    });

    it("tüm temalarda primary-foreground / primary kontrastı en az 4.5:1 (Normal Text AA) olmalıdır", () => {
      for (const theme of report.themes) {
        const priCheck = theme.checks.find((c) => c.checkName === "primary-foreground / primary");
        expect(
          priCheck,
          `${theme.themeId} için primary-foreground / primary kontrolü bulunamadı`,
        ).toBeDefined();
        expect(
          priCheck?.passed,
          `${theme.themeId} primary-foreground/primary kontrastı yetersiz: ${priCheck?.contrastRatio}:1`,
        ).toBe(true);
        expect(priCheck?.contrastRatio).toBeGreaterThanOrEqual(4.5);
      }
    });

    it("tüm temalarda vote-up ve vote-down renkleri card üzerinde en az 3.0:1 (UI AA) olmalıdır", () => {
      for (const theme of report.themes) {
        const voteUpCheck = theme.checks.find((c) => c.checkName === "vote-up / card");
        const voteDownCheck = theme.checks.find((c) => c.checkName === "vote-down / card");

        expect(voteUpCheck?.passed).toBe(true);
        expect(voteUpCheck?.contrastRatio).toBeGreaterThanOrEqual(3.0);

        expect(voteDownCheck?.passed).toBe(true);
        expect(voteDownCheck?.contrastRatio).toBeGreaterThanOrEqual(3.0);
      }
    });

    it("tüm temalarda 4 aktör tipi flair token'ı card üzerinde en az 3.0:1 (UI AA) olmalıdır", () => {
      for (const theme of report.themes) {
        const flairTokens = [
          "flair-human / card",
          "flair-agent / card",
          "flair-bot / card",
          "flair-org / card",
        ];

        for (const tokenName of flairTokens) {
          const check = theme.checks.find((c) => c.checkName === tokenName);
          expect(check?.passed, `${theme.themeId} için ${tokenName} yetersiz`).toBe(true);
          expect(check?.contrastRatio).toBeGreaterThanOrEqual(3.0);
        }
      }
    });
  });

  // ==========================================================================
  // 3. Skip-to-Content ve #main-content Klavye Erişilebilirliği
  // ==========================================================================
  describe("3. Ana İçeriğe Atla (Skip-to-Content) ve Odak Yönetimi", () => {
    it("SkipToContent bileşeni #main-content hedefine bağlantı vermeli ve sr-only odak sınıflarını taşımalıdır", () => {
      render(React.createElement(SkipToContent));
      const skipLink = screen.getByTestId("skip-to-content");

      expect(skipLink).toBeDefined();
      expect(skipLink.getAttribute("href")).toBe("#main-content");
      expect(skipLink.textContent).toBe("Ana içeriğe atla");
      expect(skipLink.className).toContain("sr-only");
      expect(skipLink.className).toContain("focus:not-sr-only");
      expect(skipLink.className).toContain("focus-visible:ring-2");
    });

    it("AppShell bileşeni id='main-content' ve tabIndex={-1} özniteliklerini taşımalıdır", () => {
      const { container } = render(
        React.createElement(AppShell, null, React.createElement("div", null, "Test İçerik")),
      );

      const mainContent = container.querySelector("#main-content");
      expect(mainContent).not.toBeNull();
      expect(mainContent?.getAttribute("tabindex")).toBe("-1");
      expect(mainContent?.tagName.toLowerCase()).toBe("main");
    });
  });

  // ==========================================================================
  // 4. Ekran Okuyucu ve ARIA Desteği
  // ==========================================================================
  describe("4. Ekran Okuyucu ve ARIA Desteği", () => {
    it("PostCard üzerindeki yukarı oy, aşağı oy ve kaydet butonları aria-label ve aria-pressed taşımalıdır", () => {
      render(
        React.createElement(PostCard, {
          post: samplePost,
          initialUserVote: 1,
          initialSaved: true,
          saveAriaLabel: "Gönderiyi kaydet",
        }),
      );

      const upvoteBtn = screen.getByRole("button", { name: "Yukarı oy ver" });
      expect(upvoteBtn).toBeDefined();
      expect(upvoteBtn.getAttribute("aria-pressed")).toBe("true");

      const downvoteBtn = screen.getByRole("button", { name: "Aşağı oy ver" });
      expect(downvoteBtn).toBeDefined();
      expect(downvoteBtn.getAttribute("aria-pressed")).toBe("false");

      // Kaydedilmiş durumda aria-pressed="true"
      const saveBtn = screen.getByTestId("post-save-btn");
      expect(saveBtn.getAttribute("aria-pressed")).toBe("true");
      expect(saveBtn.getAttribute("aria-label")).toBe("Kaydedilenlerden çıkar");
    });

    it("PostCard kaydedilmemiş durumdayken Gönderiyi kaydet aria-label veya başlığı sunmalıdır", () => {
      render(
        React.createElement(PostCard, {
          post: samplePost,
          initialSaved: false,
          saveAriaLabel: "Gönderiyi kaydet",
        }),
      );

      const saveBtn = screen.getByTestId("post-save-btn");
      expect(saveBtn.getAttribute("aria-pressed")).toBe("false");
      expect(saveBtn.getAttribute("aria-label")).toBe("Gönderiyi kaydet");
    });

    it("PostActions bileşeni oy butonları ve kaydet butonu üzerinde aria-label ve aria-pressed taşımalıdır", () => {
      render(
        React.createElement(PostActions, {
          post: samplePost,
          initialUserVote: -1,
          initialSaved: false,
          saveAriaLabel: "Gönderiyi kaydet",
        }),
      );

      const upvoteBtn = screen.getByRole("button", { name: "Yukarı oy ver" });
      expect(upvoteBtn.getAttribute("aria-pressed")).toBe("false");

      const downvoteBtn = screen.getByRole("button", { name: "Aşağı oy ver" });
      expect(downvoteBtn.getAttribute("aria-pressed")).toBe("true");

      const saveBtn = screen.getByRole("button", { name: "Gönderiyi kaydet" });
      expect(saveBtn.getAttribute("aria-pressed")).toBe("false");
    });

    it("CommentNodeComponent üzerindeki oy butonları aria-label ve aria-pressed taşımalıdır", () => {
      const sampleComment = {
        id: "c_comment_1",
        postId: "c_post_1",
        body: "Test yorumu",
        score: 5,
        createdAt: "2026-09-04T12:00:00Z",
        author: {
          id: "u_other_1",
          username: "other_user",
          displayName: "Other User",
          actorType: "human" as const,
        },
        replies: [],
      } as unknown as CommentNode;

      render(
        React.createElement(CommentNodeComponent, {
          comment: sampleComment,
          postId: "c_post_1",
          collapsedIds: new Set<string>(),
          onToggleCollapse: () => {},
        }),
      );

      const upBtn = screen.getByRole("button", { name: "Yukarı oy ver" });
      expect(upBtn.getAttribute("aria-pressed")).toBe("false");

      const downBtn = screen.getByRole("button", { name: "Aşağı oy ver" });
      expect(downBtn.getAttribute("aria-pressed")).toBe("false");
    });

    it("ActorBadge glif modunda aktör tipine göre açıklayıcı 'Aktör tipi: ...' aria-label taşımalıdır", () => {
      const { rerender } = render(
        React.createElement(ActorBadge, { actorType: "ai_agent", variant: "glyph" }),
      );
      let glyph = screen.getByRole("img", { name: "Aktör tipi: Yapay Zeka Ajanı" });
      expect(glyph).toBeDefined();

      rerender(React.createElement(ActorBadge, { actorType: "human", variant: "glyph" }));
      glyph = screen.getByRole("img", { name: "Aktör tipi: İnsan" });
      expect(glyph).toBeDefined();

      rerender(React.createElement(ActorBadge, { actorType: "system_bot", variant: "glyph" }));
      glyph = screen.getByRole("img", { name: "Aktör tipi: Bot" });
      expect(glyph).toBeDefined();

      rerender(React.createElement(ActorBadge, { actorType: "organization", variant: "glyph" }));
      glyph = screen.getByRole("img", { name: "Aktör tipi: Kurum" });
      expect(glyph).toBeDefined();
    });

    it("Modallarda DialogTitle ve DialogDescription ARIA desteği eksiksiz bulunmalıdır", () => {
      render(React.createElement(ShortcutsDialog, { open: true, onOpenChange: () => {} }));

      const title = screen.getByText("Klavye Kısayolları");
      expect(title).toBeDefined();

      const desc = screen.getByText(/Actos'ta fareye dokunmadan/i);
      expect(desc).toBeDefined();
    });

    it("ReportDialog bileşeni erişilebilir DialogTitle ve DialogDescription taşımalıdır", () => {
      render(
        React.createElement(ReportDialog, {
          open: true,
          onOpenChange: () => {},
          targetId: "c_post_1",
          targetType: "content",
        }),
      );

      expect(screen.getByText("İçeriği Şikayet Et")).toBeDefined();
      expect(screen.getByText(/Topluluk kurallarını ihlal ettiğini düşündüğünüz/i)).toBeDefined();
    });
  });

  // ==========================================================================
  // 5. prefers-reduced-motion Desteği
  // ==========================================================================
  describe("5. prefers-reduced-motion Desteği (app/globals.css)", () => {
    it("globals.css dosyası @media (prefers-reduced-motion: reduce) bloğu içermelidir", () => {
      const globalsCssPath = path.resolve(process.cwd(), "app/globals.css");
      const cssContent = fs.readFileSync(globalsCssPath, "utf8");

      expect(cssContent).toContain("@media (prefers-reduced-motion: reduce)");
      expect(cssContent).toContain("animation-duration: 0.01ms !important");
      expect(cssContent).toContain("transition-duration: 0.01ms !important");
      expect(cssContent).toContain("scroll-behavior: auto !important");
    });
  });
});
