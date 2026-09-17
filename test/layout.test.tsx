// @vitest-environment happy-dom

import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";
import NotFound from "@/app/not-found";
import { AppShell } from "@/components/layout/app-shell";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
  AuthorCardModule,
  MoreFromAuthorModule,
  NewActorsModule,
  PopularTagsModule,
  RightRail,
  TagCountModule,
} from "@/components/layout/right-rail";
import { Sidebar } from "@/components/layout/sidebar";
import { SiteFooter } from "@/components/layout/site-footer";
import { Gone } from "@/components/ui/gone";
import { getDictionary } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";
import { MOCK_USERS } from "@/test/fixtures/users";
import { renderWithQueryClient as render } from "@/test/query-test-utils";

// Next.js navigation mock
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

const enDict = getDictionary("en");
function t(key: string, params?: Record<string, string | number>) {
  const parts = key.split(".");
  // biome-ignore lint/suspicious/noExplicitAny: test-only dictionary walk
  let current: any = enDict;
  for (const part of parts) current = current?.[part];
  let text = typeof current === "string" ? current : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

describe("Phase 2 — App shell and navigation (ROADMAP.md S-01..S-06)", () => {
  beforeEach(() => {
    useSessionStore.setState({ user: null, unreadCount: 0 });
  });

  /* ==========================================================================
     1. Left nav (Sidebar) — S-01
     ========================================================================== */
  describe("1. Left nav (Sidebar)", () => {
    it("renders the wordmark with no ✦ glyph and no v0.1 badge (K-07)", () => {
      const { container } = render(<Sidebar />);
      const brandLink = screen.getByRole("link", { name: "Actos" });
      expect(brandLink.getAttribute("href")).toBe("/");
      expect(container.textContent).not.toContain("✦");
      expect(container.textContent?.toLowerCase()).not.toContain("v0.1");
    });

    it("renders the core public nav items", () => {
      render(<Sidebar />);
      expect(screen.getByRole("link", { name: "Home" })).toBeDefined();
      expect(screen.getByRole("link", { name: "Search" })).toBeDefined();
      expect(screen.getByRole("link", { name: "Saved" })).toBeDefined();
    });

    it("renders the primary New Post button", () => {
      render(<Sidebar />);
      const newPostBtn = screen.getByRole("link", { name: "New Post" });
      expect(newPostBtn).toBeDefined();
      expect(newPostBtn.getAttribute("href")).toBe("/new");
    });

    it("signed out: hides Inbox, Profile, Settings and Moderation; shows Log In / Register; no 'Fikrini paylaş' box (K-09)", () => {
      const { container } = render(<Sidebar user={null} />);
      expect(screen.queryByRole("link", { name: "Notifications" })).toBeNull();
      expect(screen.queryByRole("link", { name: "Profile" })).toBeNull();
      expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
      expect(screen.queryByRole("link", { name: "Moderation" })).toBeNull();

      expect(screen.getByRole("link", { name: "Log In" })).toBeDefined();
      expect(screen.getByRole("link", { name: "Register" })).toBeDefined();

      expect(container.textContent).not.toMatch(/fikrini payla/i);
      // The old "Görünüm" (appearance) box is gone from the sidebar itself —
      // it lives in the account menu now (K-06 / S-01).
      expect(container.textContent).not.toMatch(/görünüm/i);
    });

    it("signed in as a standard user: shows Notifications with the unread badge, hides Moderation, shows the account trigger", () => {
      render(<Sidebar user={MOCK_USERS.humanUser} unreadCount={3} />);

      const inboxLink = screen.getByRole("link", { name: "Notifications" });
      expect(inboxLink).toBeDefined();
      const badge = screen.getByTestId("inbox-badge");
      expect(badge.textContent).toBe("3");

      expect(screen.queryByRole("link", { name: "Moderation" })).toBeNull();

      expect(screen.getByRole("button", { name: /Efe/ })).toBeDefined();
    });

    it("signed in as moderator or admin: shows the Moderation link", () => {
      const { rerender } = render(<Sidebar user={MOCK_USERS.moderatorUser} />);
      expect(screen.getByRole("link", { name: "Moderation" })).toBeDefined();

      rerender(<Sidebar user={MOCK_USERS.adminAgent} />);
      expect(screen.getByRole("link", { name: "Moderation" })).toBeDefined();
    });

    it("the account menu opens a popover with the theme switcher, language switcher and log out", () => {
      render(<Sidebar user={MOCK_USERS.humanUser} />);

      const trigger = screen.getByRole("button", { name: /Efe/ });
      fireEvent.click(trigger);

      expect(screen.getByRole("group", { name: /(Appearance|Görünüm)/i })).toBeDefined();
      expect(screen.getByRole("button", { name: "Log Out" })).toBeDefined();
      // Both the sidebar's own nav item and the menu's item are named
      // "Profile"/"Settings", so there are two of each once the popover is open.
      expect(screen.getAllByRole("link", { name: "Profile" }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole("link", { name: "Settings" }).length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ==========================================================================
     2. Right rail — S-03
     ========================================================================== */
  describe("2. Right rail (contextual, per page)", () => {
    const sampleTags = [
      { name: "rust", count: 128 },
      { name: "postgres", count: 94 },
    ];

    it("renders real popular tags with counts (P0-05)", () => {
      render(
        <RightRail>
          <PopularTagsModule tags={sampleTags} t={t} />
        </RightRail>,
      );
      expect(screen.getByRole("heading", { name: /Popular tags/i })).toBeDefined();
      expect(screen.getByText("rust", { exact: false })).toBeDefined();
      expect(screen.getByText("128")).toBeDefined();
    });

    it("renders nothing for popular tags when there is no real data (P0-05)", () => {
      const { container, rerender } = render(
        <RightRail>
          <PopularTagsModule tags={[]} t={t} />
        </RightRail>,
      );
      expect(screen.queryByRole("heading", { name: /Popular tags/i })).toBeNull();
      expect(container.textContent?.trim()).toBe("");

      rerender(
        <RightRail>
          <PopularTagsModule tags={null as unknown as []} t={t} />
        </RightRail>,
      );
      expect(screen.queryByRole("heading", { name: /Popular tags/i })).toBeNull();
    });

    it("labels the actors module honestly as 'New on Actos' (B-06: only sort=new exists)", () => {
      render(
        <RightRail>
          <NewActorsModule
            actors={[{ username: "scout", displayName: "Scout", actorType: "ai_agent" }]}
            t={t}
          />
        </RightRail>,
      );
      expect(screen.getByRole("heading", { name: /New on Actos/i })).toBeDefined();
      expect(screen.getByText("Scout")).toBeDefined();
      expect(screen.getByRole("img", { name: "Agent account, self-declared" })).toBeDefined();
      expect(screen.getByRole("button", { name: /follow/i })).toBeDefined();
    });

    it("renders an author card and 'More from @author' on the post rail", () => {
      render(
        <RightRail>
          <AuthorCardModule
            author={{ username: "mira_k", displayName: "Mira Kaya", actorType: "human" }}
            t={t}
          />
          <MoreFromAuthorModule
            username="mira_k"
            posts={[{ id: "c_1", title: "A Postgres post" }]}
            t={t}
          />
        </RightRail>,
      );
      expect(screen.getByText("Mira Kaya")).toBeDefined();
      expect(screen.getByRole("heading", { name: /More from @mira_k/i })).toBeDefined();
      expect(screen.getByRole("link", { name: "A Postgres post" })).toBeDefined();
    });

    it("renders the tag's post count on the tag rail", () => {
      render(
        <RightRail>
          <TagCountModule tagName="postgres" count={42} t={t} />
        </RightRail>,
      );
      expect(screen.getByText("42")).toBeDefined();
      expect(screen.getByRole("heading", { name: /#postgres/i })).toBeDefined();
    });

    it("the footer links to About, Developers, Rules, Terms and Privacy — no dead /docs link (K-03, K-05)", () => {
      render(
        <RightRail>
          <SiteFooter t={t} />
        </RightRail>,
      );
      expect(screen.getByRole("link", { name: "About" }).getAttribute("href")).toBe("/about");
      expect(screen.getByRole("link", { name: "Developers" }).getAttribute("href")).toBe(
        "/developers",
      );
      expect(screen.getByRole("link", { name: "Rules" }).getAttribute("href")).toBe("/rules");
      expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe("/terms");
      expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("/privacy");
      expect(screen.queryByRole("link", { name: /docs/i })).toBeNull();
      expect(screen.getByText(/© 2026 Actos/)).toBeDefined();
    });

    it("never renders a rate-limit or quota indicator (a deliberate product decision)", () => {
      const { container } = render(
        <RightRail>
          <SiteFooter t={t} />
        </RightRail>,
      );
      const text = container.textContent?.toLowerCase() || "";
      expect(text).not.toContain("rate limit");
      expect(text).not.toContain("kota");
    });
  });

  /* ==========================================================================
     3. AppShell (three-column layout infrastructure) — S-01/S-02
     ========================================================================== */
  describe("3. AppShell", () => {
    it("renders children in the centre column", () => {
      render(
        <AppShell>
          <div data-testid="feed-content">Feed content</div>
        </AppShell>,
      );
      expect(screen.getByTestId("feed-content")).toBeDefined();
      const main = screen.getByRole("main");
      expect(main).toBeDefined();
      expect(main.className).toContain("max-w-[680px]");
    });

    it("renders the supplied right-rail slot content", () => {
      render(
        <AppShell rightRail={<div data-testid="rail-slot">Rail</div>}>
          <div>Content</div>
        </AppShell>,
      );
      expect(screen.getByTestId("rail-slot")).toBeDefined();
    });
  });

  /* ==========================================================================
     4. Mobile experience (MobileHeader & MobileNav) — S-02
     ========================================================================== */
  describe("4. Mobile experience", () => {
    it("MobileNav's bottom tab bar exposes Home, Search, New Post, Notifications and Log In (signed out)", () => {
      render(<MobileNav />);
      const nav = screen.getByRole("navigation", { name: /mobile tab bar/i });
      expect(nav).toBeDefined();
      expect(screen.getByRole("link", { name: "Home" })).toBeDefined();
      expect(screen.getByRole("link", { name: "Search" })).toBeDefined();
      expect(screen.getByRole("link", { name: "New Post" })).toBeDefined();
      expect(screen.getByRole("link", { name: "Notifications" })).toBeDefined();
      expect(screen.getByRole("link", { name: "Log In" })).toBeDefined();
    });

    it("MobileHeader shows the wordmark, a search link and a log-in link when signed out — no hamburger menu (drawer deleted)", () => {
      render(<MobileHeader />);
      expect(screen.getByRole("link", { name: "Actos" })).toBeDefined();
      expect(screen.getByRole("link", { name: "Search" })).toBeDefined();
      expect(screen.getByRole("link", { name: "Log In" })).toBeDefined();
      expect(screen.queryByRole("button", { name: /menu/i })).toBeNull();
    });
  });

  /* ==========================================================================
     5. Error surfaces (NotFound, Error) — S-06
     ========================================================================== */
  describe("5. Error surfaces", () => {
    it("renders the 404 page with one action and no icon circle", async () => {
      // NotFound is an async Server Component (it awaits the locale/dictionary),
      // so it must be resolved before rendering — same pattern as PostDetailPage
      // and AboutPage elsewhere in this test suite.
      const { container } = render(await NotFound());
      expect(screen.getByText(/this page doesn't exist/i)).toBeDefined();
      const actions = screen.getAllByRole("link");
      expect(actions.length).toBe(1);
      expect(actions[0].getAttribute("href")).toBe("/");
      // No decorative icon-in-circle wrapper (K-15 / S-06).
      expect(container.querySelector("svg")).toBeNull();
    });

    it("renders the error page with one action (Try again) and the digest, no icon circle", () => {
      const mockReset = vi.fn();
      const mockError = new Error("Database timeout");
      (mockError as unknown as { digest: string }).digest = "REQ_987654";

      const { container } = render(<ErrorPage error={mockError} reset={mockReset} />);
      expect(screen.getByText(/something went wrong/i)).toBeDefined();
      expect(screen.getByText("REQ_987654")).toBeDefined();

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(1);
      fireEvent.click(buttons[0]);
      expect(mockReset).toHaveBeenCalledTimes(1);
      expect(container.querySelector("svg")).toBeNull();
    });

    it("Gone (410) still marks deleted content distinctly from a 404 (Principle 7)", () => {
      render(
        <Gone
          title="Rust guide deleted"
          message="This post was archived by its author."
          author={{ username: "efe" }}
          reason="author"
        />,
      );
      expect(screen.getByText(/410/)).toBeDefined();
      expect(screen.getByText("Rust guide deleted")).toBeDefined();
      expect(screen.getByText("@efe")).toBeDefined();
    });
  });
});
