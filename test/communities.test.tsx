// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Community, Post } from "actos";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/c",
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(undefined), set: vi.fn() }),
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(null) }),
}));

// The screens are dark by default; tests flip the flag on (ROADMAP §3).
vi.mock("@/lib/features", () => ({ FEATURE_COMMUNITIES: true }));

import CommunityPage from "@/app/c/[name]/page";
import { CommunityCover } from "@/components/communities/community-cover";
import { CommunityDirectory } from "@/components/communities/community-directory";
import { PostTargetField, type PostTargetValue } from "@/components/editor/post-target-field";
import { PostCard } from "@/components/feed/post-card";
import { UnavailablePost } from "@/components/post/unavailable-post";
import * as actosLib from "@/lib/actos";
import { getDictionary } from "@/lib/i18n";
import { renderWithQueryClient } from "@/test/query-test-utils";

const en = getDictionary("en");
const t = (key: string, params?: Record<string, string | number>) => {
  const parts = key.split(".");
  // biome-ignore lint/suspicious/noExplicitAny: test-only dictionary walk
  let current: any = en;
  for (const part of parts) current = current?.[part];
  if (typeof current !== "string") return key;
  let text = current;
  if (params)
    for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
};

function makeCommunity(overrides: Partial<Community> = {}): Community {
  return {
    id: "m_rust",
    name: "rust",
    description: "A community about Rust.",
    visibility: "public",
    owner: {
      id: "u_owner",
      username: "ada",
      displayName: "Ada",
      actorType: "human",
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00Z",
    },
    memberCount: 12,
    postCount: 4,
    isMember: false,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: "c_post_1",
    contentType: "post",
    isCrossPost: false,
    title: "Hello",
    body: "Body text",
    bodyHtml: "<p>Body text</p>",
    bodyFormat: "markdown",
    score: 1,
    upvotes: 1,
    downvotes: 0,
    commentCount: 0,
    tags: [],
    authorDeleted: false,
    deleted: false,
    createdAt: "2026-09-01T00:00:00Z",
    editedAt: null,
    author: {
      id: "u_author",
      username: "mira",
      displayName: "Mira",
      actorType: "human",
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00Z",
    },
    ...overrides,
  };
}

describe("Phase 7 communities — components and screens", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("PostCard community slot, cross-post and tombstone", () => {
    it("shows c/name for a community post and nothing for an independent one", () => {
      const { rerender } = renderWithQueryClient(
        <PostCard post={makePost({ community: { id: "m_rust", name: "rust" } })} />,
      );
      const link = screen.getByTestId("post-community-link");
      expect(link.textContent).toBe("c/rust");
      expect(link.getAttribute("href")).toBe("/c/rust");

      rerender(<PostCard post={makePost()} />);
      expect(screen.queryByTestId("post-community-link")).toBeNull();
    });

    it("embeds the resolved source card for a cross-post", () => {
      renderWithQueryClient(
        <PostCard
          post={makePost({
            isCrossPost: true,
            title: null,
            body: "",
            crossPost: {
              id: "c_source",
              title: "Original title",
              community: { id: "m_rust", name: "rust" },
              author: {
                id: "u_source",
                username: "dila",
                displayName: "Dila",
                actorType: "ai_agent",
                avatarUrl: null,
                createdAt: "2026-01-01T00:00:00Z",
              },
            },
          })}
        />,
      );

      expect(screen.getByTestId("cross-post-card")).toBeDefined();
      expect(screen.getByText("Original title").closest("a")?.getAttribute("href")).toBe(
        "/posts/c_source/original-title",
      );
    });

    it("renders the shared tombstone when a cross-post source is unreachable", () => {
      renderWithQueryClient(
        <PostCard post={makePost({ isCrossPost: true, title: null, body: "", crossPost: null })} />,
      );
      expect(screen.getByTestId("cross-post-tombstone")).toBeDefined();
      expect(screen.getByText(t("crossPost.unavailable_title"))).toBeDefined();
      expect(screen.queryByTestId("cross-post-card")).toBeNull();
    });

    it("UnavailablePost is the single tombstone shape with optional copy and action", () => {
      render(
        <UnavailablePost
          testId="saved-tombstone"
          contentId="c_gone"
          title="Saved content unavailable"
          action={<button type="button">Remove</button>}
        />,
      );
      const tombstone = screen.getByTestId("saved-tombstone");
      expect(tombstone.getAttribute("data-content-id")).toBe("c_gone");
      expect(screen.getByText("Saved content unavailable")).toBeDefined();
      expect(screen.getByRole("button", { name: "Remove" })).toBeDefined();
    });
  });

  describe("CommunityCover", () => {
    it("shows name and description, a working apply form, and no counts or feed", () => {
      render(<CommunityCover community={makeCommunity({ visibility: "private" })} t={t} />);
      expect(screen.getByTestId("community-cover")).toBeDefined();
      expect(screen.getByText("c/rust")).toBeDefined();
      expect(screen.getByText("A community about Rust.")).toBeDefined();
      expect(screen.getByTestId("apply-to-join-form")).toBeDefined();
      expect(screen.getByTestId("apply-reason-input")).toBeDefined();
      expect(screen.queryByText(/12 members/)).toBeNull();
      expect(screen.queryByTestId("community-stream")).toBeNull();
    });
  });

  describe("CommunityDirectory", () => {
    it("lists real communities with locale-formatted counts", () => {
      renderWithQueryClient(
        <CommunityDirectory
          initialCommunities={[makeCommunity({ memberCount: 1234 })]}
          initialNextCursor={null}
        />,
      );
      expect(screen.getByTestId("community-directory")).toBeDefined();
      expect(screen.getByText("1,234 members")).toBeDefined();
      expect(screen.getByRole("link", { name: "c/rust" }).getAttribute("href")).toBe("/c/rust");
    });
  });

  describe("/c/[name] cover-vs-full branch", () => {
    it("renders only the cover for a private non-member", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        communities: {
          get: vi.fn().mockResolvedValue(
            makeCommunity({
              visibility: "private",
              isMember: false,
              memberCount: 0,
              postCount: 0,
            }),
          ),
        },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);
      vi.spyOn(actosLib, "hasSessionCookie").mockResolvedValue(false);

      const page = await CommunityPage({
        params: Promise.resolve({ name: "rust" }),
        searchParams: Promise.resolve({}),
      });
      renderWithQueryClient(page);

      expect(screen.getByTestId("community-cover")).toBeDefined();
      expect(screen.queryByTestId("community-stream")).toBeNull();
      expect(screen.queryByTestId("community-header")).toBeNull();
    });

    it("renders the header and feed for a public community", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        communities: {
          get: vi.fn().mockResolvedValue(makeCommunity()),
          posts: vi.fn().mockResolvedValue({ items: [makePost()], nextCursor: null }),
        },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);
      vi.spyOn(actosLib, "hasSessionCookie").mockResolvedValue(false);

      const page = await CommunityPage({
        params: Promise.resolve({ name: "rust" }),
        searchParams: Promise.resolve({ sort: "top" }),
      });
      renderWithQueryClient(page);

      expect(screen.getByTestId("community-header")).toBeDefined();
      expect(screen.getByTestId("community-stream")).toBeDefined();
      expect(screen.queryByTestId("community-cover")).toBeNull();
    });

    it("turns an API 404 into notFound()", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        communities: {
          get: vi.fn().mockRejectedValue({ status: 404, code: "NOT_FOUND" }),
        },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      await expect(
        CommunityPage({
          params: Promise.resolve({ name: "closed" }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
    });
  });

  describe("composer Post to validation", () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let resolved: PostTargetValue[];

    beforeEach(() => {
      resolved = [];
      fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
    });

    const renderField = () =>
      render(
        <PostTargetField
          onResolved={(value) => {
            resolved.push(value);
          }}
        />,
      );

    const jsonResponse = (body: unknown, status = 200) =>
      ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      }) as unknown as Response;

    it("starts as an independent post", () => {
      renderField();
      expect(screen.getByTestId("post-target-status").textContent).toBe(t("editor.independent"));
      expect(resolved.at(-1)).toMatchObject({ name: null, canPublish: true });
    });

    it("resolves a joined community and allows publishing", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          ok: true,
          community: { name: "rust", visibility: "public", isMember: true },
        }),
      );
      renderField();

      fireEvent.change(screen.getByTestId("post-target-input"), { target: { value: "rust" } });

      await waitFor(
        () =>
          expect(screen.getByTestId("post-target-status").textContent).toBe(
            t("editor.community_member", { name: "rust" }),
          ),
        { timeout: 2000 },
      );
      expect(resolved.at(-1)).toMatchObject({ name: "rust", status: "member", canPublish: true });
    });

    it("blocks publishing when the viewer is not a member", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          ok: true,
          community: { name: "rust", visibility: "public", isMember: false },
        }),
      );
      renderField();

      fireEvent.change(screen.getByTestId("post-target-input"), { target: { value: "rust" } });

      await waitFor(
        () =>
          expect(screen.getByTestId("post-target-status").textContent).toBe(
            t("editor.community_not_member", { name: "rust" }),
          ),
        { timeout: 2000 },
      );
      expect(resolved.at(-1)).toMatchObject({ status: "not_member", canPublish: false });
    });

    it("reports a community that does not exist", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ code: "NOT_FOUND" }, 404));
      renderField();

      fireEvent.change(screen.getByTestId("post-target-input"), { target: { value: "ghost" } });

      await waitFor(
        () =>
          expect(screen.getByTestId("post-target-status").textContent).toBe(
            t("editor.community_not_found", { name: "ghost" }),
          ),
        { timeout: 2000 },
      );
      expect(resolved.at(-1)).toMatchObject({ status: "not_found", canPublish: false });
    });
  });
});
