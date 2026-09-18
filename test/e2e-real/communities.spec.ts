import type { APIRequestContext, Page } from "@playwright/test";
import { expect, signIn, test } from "./fixtures";

/**
 * The communities journey against the real, seeded 0.3.0 backend.
 *
 * Idempotency: there is no community-delete endpoint and an account may own
 * at most three communities, so both communities here are ensured by name. An
 * existing `GET /api/communities/{name}` (through the app's own BFF, which
 * shares the signed-in cookie) reuses it; only a 404 opens the create form.
 * The source post and its independent cross-post are likewise reused when a
 * previous run already created them, so a repeated run adds nothing new.
 *
 * The suite's auto fixture fails on any console error, page error, or >=400
 * response. The existence probes go through `page.request`, which is outside
 * the page's response stream, so their deliberate 404s never reach the guard.
 */

// Community names are the username format: `[a-z0-9_]{3,32}`, no hyphens
// (lib/communities/validation.ts, backend `actos-core::text`), so the
// deterministic names use underscores.
const PUBLIC_COMMUNITY = "e2e_kulubu";
const PRIVATE_COMMUNITY = "e2e_gizli";
const PUBLIC_DESCRIPTION = "Created and reused by the real-backend e2e suite.";
const PRIVATE_DESCRIPTION = "A private community owned only by its creator.";
const SOURCE_POST_TITLE = "e2e_kulubu smoke post";
const SOURCE_POST_BODY = "Posted by the real-backend e2e suite. Safe to ignore.";

interface CommunityPostSummary {
  id: string;
  title: string | null;
}

interface FeedItemSummary {
  id: string;
  isCrossPost?: boolean;
  crossPost?: { id?: string } | null;
}

async function communityExists(request: APIRequestContext, name: string): Promise<boolean> {
  const res = await request.get(`/api/communities/${encodeURIComponent(name)}`);
  if (res.status() === 200) return true;
  if (res.status() === 404) return false;
  throw new Error(`Unexpected ${res.status()} probing /api/communities/${name}`);
}

async function ensureCommunity(
  page: Page,
  name: string,
  description: string,
  visibility: "public" | "private",
): Promise<void> {
  if (await communityExists(page.request, name)) return;

  await page.goto("/c/new");
  await page.getByTestId("community-name-input").fill(name);
  await page.getByTestId("markdown-textarea").fill(description);
  if (visibility === "private") {
    await page.getByTestId("visibility-option-private").click();
  }
  await page.getByTestId("community-create-submit").click();
  await page.waitForURL((url) => url.pathname === `/c/${name}`);
}

async function findCommunityPost(
  request: APIRequestContext,
  name: string,
  title: string,
): Promise<string | null> {
  const res = await request.get(
    `/api/communities/${encodeURIComponent(name)}/posts?sort=new&limit=50`,
  );
  if (!res.ok()) throw new Error(`Community posts probe failed with ${res.status()}`);
  const data = (await res.json()) as { items?: CommunityPostSummary[] };
  return (data.items ?? []).find((item) => item.title === title)?.id ?? null;
}

async function findCrossPost(request: APIRequestContext, sourceId: string): Promise<string | null> {
  const res = await request.get("/api/feed?sort=new&limit=100");
  if (!res.ok()) throw new Error(`Feed probe failed with ${res.status()}`);
  const data = (await res.json()) as { items?: FeedItemSummary[] };
  const match = (data.items ?? []).find(
    (item) => item.isCrossPost === true && item.crossPost?.id === sourceId,
  );
  return match?.id ?? null;
}

function postIdFromUrl(url: string): string {
  const match = url.match(/\/posts\/([^/?#]+)/);
  if (!match?.[1]) throw new Error(`Could not extract a post id from ${url}`);
  return match[1];
}

test.beforeEach(async ({ context }) => {
  await signIn(context, "deniz");
});

test("directory, community post, and cross-post journey", async ({ page }) => {
  await ensureCommunity(page, PUBLIC_COMMUNITY, PUBLIC_DESCRIPTION, "public");

  // The public community is listed in the directory.
  await page.goto("/c");
  await expect(page.getByTestId("community-directory")).toContainText(`c/${PUBLIC_COMMUNITY}`);

  // The owner is already a member, so the Join control reports member state.
  await page.goto(`/c/${PUBLIC_COMMUNITY}`);
  await expect(page.getByTestId("community-header")).toBeVisible();
  await expect(page.getByTestId("community-join-button")).toHaveAttribute("data-member", "true");

  // Publish a post targeted at the community, or reuse the one a prior run made.
  let sourceId = await findCommunityPost(page.request, PUBLIC_COMMUNITY, SOURCE_POST_TITLE);
  if (sourceId === null) {
    await page.goto("/new");
    await page.getByTestId("post-title-input").fill(SOURCE_POST_TITLE);
    await page.getByTestId("markdown-textarea").fill(SOURCE_POST_BODY);
    await page.getByTestId("post-target-input").fill(PUBLIC_COMMUNITY);
    await expect(page.getByTestId("post-target-status")).toContainText("you are a member");
    await page.getByTestId("publish-button").click();
    await page.waitForURL(/\/posts\//);
    sourceId = postIdFromUrl(page.url());
  } else {
    await page.goto(`/posts/${sourceId}`);
  }

  // The post page header names its community.
  await expect(page.getByTestId("post-header").getByTestId("post-community-link")).toHaveText(
    `c/${PUBLIC_COMMUNITY}`,
  );

  // The same post appears in the community feed.
  await page.goto(`/c/${PUBLIC_COMMUNITY}?sort=new`);
  await expect(
    page
      .getByTestId("community-stream")
      .getByTestId("post-title-link")
      .filter({ hasText: SOURCE_POST_TITLE })
      .first(),
  ).toBeVisible();

  // Cross-post the source to Independent through the ··· menu, or reuse it.
  let crossPostId = await findCrossPost(page.request, sourceId);
  if (crossPostId === null) {
    await page.goto(`/posts/${sourceId}`);
    await page.getByRole("button", { name: "More actions" }).first().click();
    await page.getByTestId("post-cross-post-button").click();
    await expect(page.getByTestId("cross-post-dialog")).toBeVisible();
    await page.getByTestId("cross-post-submit").click();
    await page.waitForURL(/\/posts\//);
    crossPostId = postIdFromUrl(page.url());
  } else {
    await page.goto(`/posts/${crossPostId}`);
  }

  // The cross-post embeds the resolved source card, pointing back at the source.
  const sourceCard = page.getByTestId("cross-post-card");
  await expect(sourceCard).toBeVisible();
  await expect(sourceCard.locator(`a[href^="/posts/${sourceId}/"]`)).toBeVisible();
});

test("a private community serves a cover to non-members", async ({ page, context }) => {
  await ensureCommunity(page, PRIVATE_COMMUNITY, PRIVATE_DESCRIPTION, "private");

  // A signed-in non-member gets the cover: no feed, no header, apply form present.
  await signIn(context, "mira_k");
  await page.goto(`/c/${PRIVATE_COMMUNITY}`);
  await expect(page.getByTestId("community-cover")).toBeVisible();
  await expect(page.getByTestId("community-stream")).toHaveCount(0);
  await expect(page.getByTestId("community-header")).toHaveCount(0);
  await expect(page.getByTestId("apply-to-join-form")).toBeVisible();

  // A signed-out visitor also sees only the cover.
  await context.clearCookies();
  await page.goto(`/c/${PRIVATE_COMMUNITY}`);
  await expect(page.getByTestId("community-cover")).toBeVisible();
  await expect(page.getByTestId("community-stream")).toHaveCount(0);
});
