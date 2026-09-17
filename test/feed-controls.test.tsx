// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FollowingPage from "@/app/following/page";
import { FeedNav } from "@/components/feed/feed-nav";

let mockSearchParams = new URLSearchParams();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
  useSearchParams: () => mockSearchParams,
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

function getQuery(href: string) {
  return new URL(href, "http://localhost").searchParams;
}

describe("Phase 3 feed controls", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams(
      "sort=top&window=week&actor_type=human&density=compact&cursor=old&campaign=launch",
    );
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the four feed tabs, top time range, audience, and density controls", () => {
    render(
      <FeedNav
        currentSort="top"
        currentWindow="week"
        currentActorType="human"
        currentDensity="compact"
      />,
    );

    expect(
      ["Hot", "New", "Top", "Following"].map(
        (name) => screen.getByRole("link", { name }).textContent,
      ),
    ).toEqual(["Hot", "New", "Top", "Following"]);
    expect(screen.getByRole("link", { name: "Top" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Following" }).hasAttribute("aria-current")).toBe(
      false,
    );
    expect(screen.getByRole("button", { name: "Choose time range" }).textContent).toContain(
      "1 week",
    );
    expect(screen.getByRole("button", { name: "Humans" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Compact" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.queryByText(/self-declared|kendi beyanıdır/i)).toBeNull();
  });

  it("keeps current audience and density when selecting Following and drops the old cursor", () => {
    render(
      <FeedNav
        currentSort="top"
        currentWindow="week"
        currentActorType="human"
        currentDensity="compact"
      />,
    );

    const href = screen.getByRole("link", { name: "Following" }).getAttribute("href");
    expect(href).toBeTruthy();
    const query = getQuery(href ?? "/");
    expect(query.get("tab")).toBe("following");
    expect(query.get("actor_type")).toBe("human");
    expect(query.get("density")).toBe("compact");
    expect(query.get("campaign")).toBe("launch");
    expect(query.has("sort")).toBe(false);
    expect(query.has("window")).toBe(false);
    expect(query.has("cursor")).toBe(false);
  });

  it("updates audience and density in the URL while preserving unrelated query values", () => {
    render(<FeedNav currentSort="top" currentWindow="week" />);

    fireEvent.click(screen.getByRole("button", { name: "Agents" }));
    expect(mockPush).toHaveBeenCalledTimes(1);
    const actorQuery = getQuery(mockPush.mock.calls[0][0]);
    expect(actorQuery.get("actor_type")).toBe("ai_agent");
    expect(actorQuery.get("campaign")).toBe("launch");
    expect(actorQuery.has("cursor")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Compact" }));
    expect(mockPush).toHaveBeenCalledTimes(2);
    const densityQuery = getQuery(mockPush.mock.calls[1][0]);
    expect(densityQuery.get("density")).toBe("compact");
    expect(densityQuery.get("campaign")).toBe("launch");
    expect(densityQuery.has("cursor")).toBe(false);
  });

  it("preserves existing query values when /following redirects into the Following tab", async () => {
    let redirectError: Error | undefined;
    try {
      await FollowingPage({
        searchParams: Promise.resolve({
          tab: "new",
          density: "compact",
          cursor: "after+post",
          tag: ["design", "rust"],
        }),
      });
    } catch (error) {
      redirectError = error as Error;
    }

    expect(redirectError?.message).toMatch(/^REDIRECT:\/\?/);
    const target = redirectError?.message.replace("REDIRECT:", "") ?? "/";
    const query = getQuery(target);
    expect(target.startsWith("/?")).toBe(true);
    expect(query.get("tab")).toBe("following");
    expect(query.get("density")).toBe("compact");
    expect(query.get("cursor")).toBe("after+post");
    expect(query.getAll("tag")).toEqual(["design", "rust"]);
  });
});
