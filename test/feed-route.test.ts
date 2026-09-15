import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as followingRoute from "@/app/api/feed/following/route";
import * as feedRoute from "@/app/api/feed/route";
import * as actosLib from "@/lib/actos";

describe("Feed route handlers — sparse fieldset fix (P0-01) and param validation (P0-04)", () => {
  let mockFeedList: ReturnType<typeof vi.fn>;
  let mockFeedFollowing: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFeedList = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
    mockFeedFollowing = vi.fn().mockResolvedValue({ items: [], nextCursor: null });

    vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
      feed: {
        list: mockFeedList,
        following: mockFeedFollowing,
      },
    } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/feed", () => {
    it("never passes a 'fields' argument to the SDK", async () => {
      const req = new NextRequest("http://localhost:3000/api/feed?sort=hot");
      const res = await feedRoute.GET(req);

      expect(res.status).toBe(200);
      expect(mockFeedList).toHaveBeenCalledTimes(1);
      expect(mockFeedList.mock.calls[0][0]).not.toHaveProperty("fields");
    });

    it("rejects window=year with 400 VALIDATION_FAILED", async () => {
      const req = new NextRequest("http://localhost:3000/api/feed?sort=top&window=year");
      const res = await feedRoute.GET(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("VALIDATION_FAILED");
      expect(mockFeedList).not.toHaveBeenCalled();
    });

    it("rejects an invalid sort value with 400 VALIDATION_FAILED", async () => {
      const req = new NextRequest("http://localhost:3000/api/feed?sort=trending");
      const res = await feedRoute.GET(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("VALIDATION_FAILED");
    });

    it("rejects an invalid actor_type value with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/feed?actor_type=robot");
      const res = await feedRoute.GET(req);

      expect(res.status).toBe(400);
    });

    it("accepts a valid window alongside sort=top", async () => {
      const req = new NextRequest("http://localhost:3000/api/feed?sort=top&window=week");
      const res = await feedRoute.GET(req);

      expect(res.status).toBe(200);
      expect(mockFeedList).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "top", window: "week" }),
      );
    });

    it("never passes 'fields' on the ?following=true branch and validates it the same way", async () => {
      const okReq = new NextRequest("http://localhost:3000/api/feed?following=true");
      const okRes = await feedRoute.GET(okReq);
      expect(okRes.status).toBe(200);
      expect(mockFeedFollowing).toHaveBeenCalledTimes(1);
      expect(mockFeedFollowing.mock.calls[0][0]).not.toHaveProperty("fields");

      const badReq = new NextRequest("http://localhost:3000/api/feed?following=true&window=year");
      const badRes = await feedRoute.GET(badReq);
      expect(badRes.status).toBe(400);
    });
  });

  describe("GET /api/feed/following", () => {
    it("never passes a 'fields' argument to the SDK", async () => {
      const req = new NextRequest("http://localhost:3000/api/feed/following");
      const res = await followingRoute.GET(req);

      expect(res.status).toBe(200);
      expect(mockFeedFollowing).toHaveBeenCalledTimes(1);
      expect(mockFeedFollowing.mock.calls[0][0]).not.toHaveProperty("fields");
    });

    it("rejects an invalid sort value with 400 VALIDATION_FAILED", async () => {
      const req = new NextRequest("http://localhost:3000/api/feed/following?sort=trending");
      const res = await followingRoute.GET(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("VALIDATION_FAILED");
      expect(mockFeedFollowing).not.toHaveBeenCalled();
    });

    it("rejects window=year with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/feed/following?window=year");
      const res = await followingRoute.GET(req);

      expect(res.status).toBe(400);
    });
  });
});
