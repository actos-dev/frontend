import { describe, expect, it, vi } from "vitest";
import {
  getCommunity,
  listCommunities,
  listCommunityMembers,
  listCommunityPosts,
} from "@/lib/communities/fetchers";
import { formatCommunityDate, formatCount } from "@/lib/communities/format";
import {
  COMMUNITY_PAGE_SIZE,
  isCommunityCover,
  isCommunityPostSort,
  isCommunityVisibility,
  parseCommunityLimit,
} from "@/lib/communities/params";

/**
 * Phase 7 data layer: the params guards, the SDK normalizers and the
 * cover-vs-full decision. These are the pieces every community screen and
 * route handler shares, so a mistake here would surface everywhere.
 */
describe("Communities data layer", () => {
  describe("params", () => {
    it("accepts only the three real post sorts", () => {
      expect(isCommunityPostSort("new")).toBe(true);
      expect(isCommunityPostSort("top")).toBe(true);
      expect(isCommunityPostSort("hot")).toBe(true);
      expect(isCommunityPostSort("rising")).toBe(false);
      expect(isCommunityPostSort(null)).toBe(false);
    });

    it("accepts only public/private visibility", () => {
      expect(isCommunityVisibility("public")).toBe(true);
      expect(isCommunityVisibility("private")).toBe(true);
      expect(isCommunityVisibility("secret")).toBe(false);
    });

    it("defaults and clamps the limit", () => {
      expect(parseCommunityLimit(null)).toBe(COMMUNITY_PAGE_SIZE);
      expect(parseCommunityLimit("")).toBe(COMMUNITY_PAGE_SIZE);
      expect(parseCommunityLimit("10")).toBe(10);
      expect(parseCommunityLimit("5000")).toBe(100);
      expect(parseCommunityLimit("0")).toBeNull();
      expect(parseCommunityLimit("-3")).toBeNull();
      expect(parseCommunityLimit("abc")).toBeNull();
    });

    it("treats a private non-member response as a cover and nothing else", () => {
      expect(isCommunityCover({ visibility: "private", isMember: false })).toBe(true);
      expect(isCommunityCover({ visibility: "private", isMember: true })).toBe(false);
      expect(isCommunityCover({ visibility: "public", isMember: false })).toBe(false);
    });
  });

  describe("fetchers normalize the SDK Page", () => {
    it("listCommunities maps items and a null cursor", async () => {
      const list = vi.fn().mockResolvedValue({ items: [{ id: "m_1" }], nextCursor: null });
      const page = await listCommunities({ communities: { list } } as never, { limit: 25 });
      expect(list).toHaveBeenCalledWith({ limit: 25 });
      expect(page).toEqual({ communities: [{ id: "m_1" }], nextCursor: null });
    });

    it("listCommunityPosts casts items and keeps the cursor", async () => {
      const posts = vi.fn().mockResolvedValue({ items: [{ id: "c_1" }], nextCursor: "next" });
      const page = await listCommunityPosts({ communities: { posts } } as never, "rust", {
        sort: "top",
        limit: 25,
      });
      expect(posts).toHaveBeenCalledWith("rust", { sort: "top", limit: 25 });
      expect(page).toEqual({ items: [{ id: "c_1" }], nextCursor: "next" });
    });

    it("listCommunityMembers maps members and a null cursor", async () => {
      const members = vi
        .fn()
        .mockResolvedValue({ items: [{ actor: { id: "u_1" } }], nextCursor: null });
      const page = await listCommunityMembers({ communities: { members } } as never, "rust", {
        limit: 25,
      });
      expect(page.members).toHaveLength(1);
      expect(page.nextCursor).toBeNull();
    });

    it("getCommunity returns the SDK summary unchanged", async () => {
      const community = { id: "m_1", name: "rust" };
      const get = vi.fn().mockResolvedValue(community);
      await expect(getCommunity({ communities: { get } } as never, "rust")).resolves.toBe(
        community,
      );
    });
  });

  describe("format", () => {
    it("formats counts with the active locale", () => {
      expect(formatCount(1234, "en")).toBe("1,234");
      expect(formatCount(1234, "tr")).toBe("1.234");
      expect(formatCount(Number.NaN, "en")).toBe("0");
    });

    it("formats dates with the active locale and tolerates bad input", () => {
      expect(formatCommunityDate("2026-09-18T00:00:00Z", "en")).toContain("2026");
      expect(formatCommunityDate("2026-09-18T00:00:00Z", "tr")).toContain("2026");
      expect(formatCommunityDate("not-a-date", "en")).toBe("");
    });
  });
});
