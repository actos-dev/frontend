// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/c",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(undefined), set: vi.fn() }),
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(null) }),
}));

// The default state of `lib/features.ts`: communities are not verified against
// the real backend yet, so every community route answers 404.
vi.mock("@/lib/features", () => ({ FEATURE_COMMUNITIES: false }));

import CommunityAboutPage from "@/app/c/[name]/about/page";
import CommunityPage from "@/app/c/[name]/page";
import CommunityDirectoryPage from "@/app/c/page";

describe("Communities stay behind FEATURE_COMMUNITIES", () => {
  it("the directory 404s while the flag is off", async () => {
    await expect(CommunityDirectoryPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("the community page 404s while the flag is off", async () => {
    await expect(
      CommunityPage({
        params: Promise.resolve({ name: "rust" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("the about page 404s while the flag is off", async () => {
    await expect(CommunityAboutPage({ params: Promise.resolve({ name: "rust" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});
