// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CookiesPage, { generateMetadata as cookiesMetadata } from "@/app/cookies/page";
import PrivacyPage, { generateMetadata as privacyMetadata } from "@/app/privacy/page";
import RegisterPage from "@/app/register/page";
import RulesPage, { generateMetadata as rulesMetadata } from "@/app/rules/page";
import TermsPage, { generateMetadata as termsMetadata } from "@/app/terms/page";
import { SiteFooter } from "@/components/layout/site-footer";
import { getDictionary, getTranslations, type Locale } from "@/lib/i18n";
import { getLegalDocument, type LegalDocumentId } from "@/lib/legal";

const localeState = vi.hoisted(() => ({ value: "en" as "en" | "tr" }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "actos_locale" ? { name, value: localeState.value } : undefined,
  }),
  headers: async () => new Map<string, string>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const DOCUMENTS: LegalDocumentId[] = ["terms", "privacy", "cookies", "rules"];

/** A sentence that occurs on one physical line of each source text. */
const DISTINCTIVE: Record<Locale, Record<LegalDocumentId, string>> = {
  en: {
    terms: "You retain ownership of the content you share.",
    privacy: "Raw recovery codes are never stored.",
    cookies: "no cookie consent banner is shown.",
    rules: "AI agent accounts are bound by these rules exactly.",
  },
  tr: {
    terms: "Paylaştığınız içeriğin mülkiyeti sizde kalır.",
    privacy: "Ham kurtarma kodları saklanmaz.",
    cookies: "çerez onay banner'ı gösterilmez.",
    rules: "Yapay zekâ ajanı hesapları bu kurallara aynen uyar.",
  },
};

const pages = [
  { document: "terms", Page: TermsPage, generateMetadata: termsMetadata },
  { document: "privacy", Page: PrivacyPage, generateMetadata: privacyMetadata },
  { document: "cookies", Page: CookiesPage, generateMetadata: cookiesMetadata },
  { document: "rules", Page: RulesPage, generateMetadata: rulesMetadata },
] as const;

function setLocale(locale: Locale) {
  localeState.value = locale;
}

afterEach(() => {
  cleanup();
  setLocale("en");
});

describe("D-07 — legal pages", () => {
  describe("vendor texts", () => {
    it("are present for every document and locale", () => {
      for (const document of DOCUMENTS) {
        for (const locale of ["en", "tr"] as const) {
          const text = getLegalDocument(document, locale);
          expect(text.length).toBeGreaterThan(200);
          expect(text).toContain(DISTINCTIVE[locale][document]);
        }
      }
    });

    it("contain no bracketed placeholders", () => {
      for (const document of DOCUMENTS) {
        for (const locale of ["en", "tr"] as const) {
          expect(getLegalDocument(document, locale)).not.toMatch(/\[[^\]]*\]/);
        }
      }
    });
  });

  describe("pages", () => {
    for (const { document, Page, generateMetadata } of pages) {
      for (const locale of ["en", "tr"] as const) {
        it(`/ ${document} reproduces the ${locale} text verbatim`, async () => {
          setLocale(locale);
          const { container } = render(await Page());

          expect(container.textContent).toContain(DISTINCTIVE[locale][document]);

          const body = container.querySelector("pre");
          expect(body).not.toBeNull();
          expect(body?.textContent).toBe(getLegalDocument(document, locale));
        });
      }

      it(`/ ${document} exposes localized metadata`, async () => {
        for (const locale of ["en", "tr"] as const) {
          setLocale(locale);
          const expected = getDictionary(locale).legal[document].meta_title;
          expect((await generateMetadata()).title).toBe(expected);
        }
      });
    }
  });

  describe("links", () => {
    it("the footer links to all four legal documents", () => {
      const { t } = getTranslations("en");
      render(<SiteFooter t={t} />);

      for (const [href, name] of [
        ["/terms", "Terms"],
        ["/rules", "Rules"],
        ["/privacy", "Privacy"],
        ["/cookies", "Cookies"],
      ] as const) {
        expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(href);
      }
    });

    it("registration links to the Terms and the Community Rules", () => {
      setLocale("en");
      render(<RegisterPage />);

      expect(screen.getByRole("link", { name: "Terms of Service" }).getAttribute("href")).toBe(
        "/terms",
      );
      expect(screen.getByRole("link", { name: "Community Rules" }).getAttribute("href")).toBe(
        "/rules",
      );
    });
  });
});
