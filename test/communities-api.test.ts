import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as joinRoute from "@/app/api/communities/[name]/join/route";
import * as membersRoute from "@/app/api/communities/[name]/members/route";
import * as postsRoute from "@/app/api/communities/[name]/posts/route";
import * as communityDetailRoute from "@/app/api/communities/[name]/route";
import * as directoryRoute from "@/app/api/communities/route";
import * as actosLib from "@/lib/actos";

/**
 * The communities BFF surface. Browser code never calls the API directly, so
 * these handlers are the only path the composer, directory, feed, join button
 * and about page have to the real 0.3.0 contract.
 */
describe("Communities BFF route handlers", () => {
  let communities: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    posts: ReturnType<typeof vi.fn>;
    members: ReturnType<typeof vi.fn>;
    join: ReturnType<typeof vi.fn>;
    leave: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    communities = {
      list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      get: vi.fn().mockResolvedValue({ id: "m_1", name: "rust", visibility: "public" }),
      posts: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      members: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
      communities,
    } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const params = (name: string) => ({ params: Promise.resolve({ name }) });

  describe("GET /api/communities", () => {
    it("passes cursor and limit through and returns the page", async () => {
      communities.list.mockResolvedValueOnce({
        items: [{ id: "m_1", name: "rust" }],
        nextCursor: "next",
      });
      const res = await directoryRoute.GET(
        new NextRequest("http://localhost/api/communities?limit=10&cursor=abc"),
      );
      expect(res.status).toBe(200);
      expect(communities.list).toHaveBeenCalledWith({ limit: 10, cursor: "abc" });
      const body = await res.json();
      expect(body).toEqual({
        ok: true,
        communities: [{ id: "m_1", name: "rust" }],
        nextCursor: "next",
      });
    });

    it("rejects an invalid limit with 400", async () => {
      const res = await directoryRoute.GET(
        new NextRequest("http://localhost/api/communities?limit=0"),
      );
      expect(res.status).toBe(400);
      expect(communities.list).not.toHaveBeenCalled();
    });

    it("maps a backend failure instead of fabricating a page", async () => {
      communities.list.mockRejectedValueOnce({ status: 503, code: "NETWORK_ERROR" });
      const res = await directoryRoute.GET(new NextRequest("http://localhost/api/communities"));
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.code).toBe("NETWORK_ERROR");
      expect(body.communities).toBeUndefined();
    });
  });

  describe("GET /api/communities/[name]", () => {
    it("resolves one community", async () => {
      const res = await communityDetailRoute.GET(
        new NextRequest("http://localhost/api/communities/rust"),
        params("rust"),
      );
      expect(res.status).toBe(200);
      expect(communities.get).toHaveBeenCalledWith("rust");
      const body = await res.json();
      expect(body.community.name).toBe("rust");
    });

    it("returns the mapped 404 for a missing community", async () => {
      communities.get.mockRejectedValueOnce({ status: 404, code: "NOT_FOUND" });
      const res = await communityDetailRoute.GET(
        new NextRequest("http://localhost/api/communities/nope"),
        params("nope"),
      );
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/communities/[name]/posts", () => {
    it("defaults the sort to new and never sends a fields projection", async () => {
      const res = await postsRoute.GET(
        new NextRequest("http://localhost/api/communities/rust/posts"),
        params("rust"),
      );
      expect(res.status).toBe(200);
      expect(communities.posts).toHaveBeenCalledWith("rust", {
        sort: "new",
        cursor: undefined,
        limit: 25,
      });
      expect(communities.posts.mock.calls[0][1]).not.toHaveProperty("fields");
    });

    it("accepts a valid sort and rejects an invalid one", async () => {
      const ok = await postsRoute.GET(
        new NextRequest("http://localhost/api/communities/rust/posts?sort=top"),
        params("rust"),
      );
      expect(ok.status).toBe(200);
      expect(communities.posts).toHaveBeenCalledWith(
        "rust",
        expect.objectContaining({ sort: "top" }),
      );

      const bad = await postsRoute.GET(
        new NextRequest("http://localhost/api/communities/rust/posts?sort=rising"),
        params("rust"),
      );
      expect(bad.status).toBe(400);
    });
  });

  describe("GET /api/communities/[name]/members", () => {
    it("returns the member page", async () => {
      communities.members.mockResolvedValueOnce({
        items: [{ actor: { id: "u_1", username: "ada" }, joinedAt: "2026-01-01T00:00:00Z" }],
        nextCursor: null,
      });
      const res = await membersRoute.GET(
        new NextRequest("http://localhost/api/communities/rust/members"),
        params("rust"),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.members).toHaveLength(1);
    });
  });

  describe("join / leave", () => {
    it("POST joins and answers 204", async () => {
      const res = await joinRoute.POST(
        new NextRequest("http://localhost/api/communities/rust/join", { method: "POST" }),
        params("rust"),
      );
      expect(res.status).toBe(204);
      expect(communities.join).toHaveBeenCalledWith("rust");
    });

    it("DELETE leaves and answers 204", async () => {
      const res = await joinRoute.DELETE(
        new NextRequest("http://localhost/api/communities/rust/join", { method: "DELETE" }),
        params("rust"),
      );
      expect(res.status).toBe(204);
      expect(communities.leave).toHaveBeenCalledWith("rust");
    });

    it("maps a failed join", async () => {
      communities.join.mockRejectedValueOnce({ status: 403, code: "FORBIDDEN" });
      const res = await joinRoute.POST(
        new NextRequest("http://localhost/api/communities/rust/join", { method: "POST" }),
        params("rust"),
      );
      expect(res.status).toBe(403);
    });
  });
});
