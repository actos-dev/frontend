// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider, useInfiniteQuery } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import type { Post } from "actos";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useContentInteraction, useFollowMutation } from "@/lib/query/mutations";
import {
  feedQueryOptions,
  inboxQueryOptions,
  normalizeFeedFilters,
  savedQueryOptions,
} from "@/lib/query/queries";
import type { FeedQueryPage, InboxQueryPage, SavedQueryPage } from "@/lib/query/types";
import { type SessionUser, useSessionStore } from "@/lib/stores/session-store";
import { MOCK_NOTIFICATIONS } from "@/test/fixtures/inbox";

const post = { id: "post-isolation", score: 12 } as Post;
const filters = normalizeFeedFilters({ sort: "hot" });

describe("feed filter normalization", () => {
  it("keeps a popularity window only for Top", () => {
    expect(normalizeFeedFilters({ sort: "hot", window: "day" }).window).toBeUndefined();
    expect(normalizeFeedFilters({ sort: "new", window: "month" }).window).toBeUndefined();
    expect(
      normalizeFeedFilters({ sort: "hot", window: "day", following: true }).window,
    ).toBeUndefined();
    expect(normalizeFeedFilters({ sort: "top", window: "week" }).window).toBe("week");
  });
});

function user(id: string): SessionUser {
  return {
    id,
    username: id,
    actorType: "human",
    role: "user",
  };
}

function PrivateStateProbe() {
  const session = useSessionStore((state) => state);
  const principalId = session.status === "authenticated" ? (session.user?.id ?? null) : null;
  const interaction = useContentInteraction(
    "post-isolation",
    {
      score: 12,
      userVote: 0,
    },
    principalId,
  );
  const follow = useFollowMutation("alice", false, principalId);
  const feed = useInfiniteQuery({
    ...feedQueryOptions(filters, principalId ? "authenticated" : "anonymous", principalId),
    enabled: false,
  });
  const saved = useInfiniteQuery({ ...savedQueryOptions(undefined, principalId), enabled: false });
  const inbox = useInfiniteQuery({
    ...inboxQueryOptions("all", undefined, principalId),
    enabled: false,
  });
  const feedVote = feed.data?.pages[0]?.votes[post.id] ?? 0;
  const savedItem = saved.data?.pages[0]?.items[0]?.id ?? "";
  const inboxItem = inbox.data?.pages[0]?.notifications[0]?.id ?? "";

  return (
    <output
      data-testid="private-state"
      data-vote={interaction.userVote}
      data-saved={interaction.saved ?? "unknown"}
      data-following={follow.following}
      data-feed-vote={feedVote}
      data-saved-item={savedItem}
      data-inbox-item={inboxItem}
    />
  );
}

function renderProbe(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <PrivateStateProbe />
    </QueryClientProvider>,
  );
}

function seedAccountState(queryClient: QueryClient, principalId: string, vote: -1 | 0 | 1) {
  const feedPage: FeedQueryPage = {
    items: [post],
    nextCursor: null,
    votes: { [post.id]: vote },
  };
  queryClient.setQueryData(feedQueryOptions(filters, "authenticated", principalId).queryKey, {
    pages: [feedPage],
    pageParams: [null],
  });
  queryClient.setQueryData(savedQueryOptions(undefined, principalId).queryKey, {
    pages: [
      {
        items: [{ ...post, id: `${principalId}-saved` }],
        nextCursor: null,
        votes: {},
      } satisfies SavedQueryPage,
    ],
    pageParams: [null],
  });
  queryClient.setQueryData(inboxQueryOptions("all", undefined, principalId).queryKey, {
    pages: [
      {
        notifications: [{ ...MOCK_NOTIFICATIONS[0], id: `${principalId}-notification` }],
        nextCursor: null,
        unreadCount: 1,
      } satisfies InboxQueryPage,
    ],
    pageParams: [null],
  });
  queryClient.setQueryData(["interactions", "content", principalId, "post-isolation"], {
    score: 12,
    userVote: vote,
    saved: true,
  });
  queryClient.setQueryData(["interactions", "follow", principalId, "alice"], true);
}

afterEach(() => {
  vi.unstubAllGlobals();
  useSessionStore.setState({ user: null, status: "idle", unreadCount: 0 });
});

describe("private query cache identity isolation", () => {
  it("switches to the next account's votes, saves, follows, saved list, and inbox", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedAccountState(queryClient, "usr_a", 1);
    seedAccountState(queryClient, "usr_b", -1);
    useSessionStore.setState({ user: user("usr_a"), status: "authenticated", unreadCount: 1 });

    renderProbe(queryClient);
    expect(screen.getByTestId("private-state").getAttribute("data-vote")).toBe("1");
    expect(screen.getByTestId("private-state").getAttribute("data-saved-item")).toBe("usr_a-saved");

    act(() => {
      useSessionStore.getState().setUser(user("usr_b"));
    });

    const state = screen.getByTestId("private-state");
    expect(state.getAttribute("data-vote")).toBe("-1");
    expect(state.getAttribute("data-saved")).toBe("true");
    expect(state.getAttribute("data-following")).toBe("true");
    expect(state.getAttribute("data-feed-vote")).toBe("-1");
    expect(state.getAttribute("data-saved-item")).toBe("usr_b-saved");
    expect(state.getAttribute("data-inbox-item")).toBe("usr_b-notification");

    expect(feedQueryOptions(filters, "anonymous", "usr_a").queryKey).toEqual(
      feedQueryOptions(filters, "anonymous", "usr_b").queryKey,
    );
    queryClient.clear();
  });

  it("drops account-only state after logout while keeping anonymous feed keys public", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    seedAccountState(queryClient, "usr_a", 1);
    useSessionStore.setState({ user: user("usr_a"), status: "authenticated", unreadCount: 1 });

    renderProbe(queryClient);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    await act(async () => {
      await useSessionStore.getState().logout();
    });

    const state = screen.getByTestId("private-state");
    expect(state.getAttribute("data-vote")).toBe("0");
    expect(state.getAttribute("data-saved")).toBe("unknown");
    expect(state.getAttribute("data-following")).toBe("false");
    expect(state.getAttribute("data-feed-vote")).toBe("0");
    expect(state.getAttribute("data-saved-item")).toBe("");
    expect(state.getAttribute("data-inbox-item")).toBe("");
    expect(feedQueryOptions(filters, "anonymous", "usr_a").queryKey).toEqual(
      feedQueryOptions(filters, "anonymous", null).queryKey,
    );
    queryClient.clear();
  });
});
