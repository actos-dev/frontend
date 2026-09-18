// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActorHoverCard } from "@/components/actor/actor-hover-card";
import { useSessionStore } from "@/lib/stores/session-store";
import { renderWithQueryClient as render } from "@/test/query-test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("U-02 actor hover card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({ user: null, status: "unauthenticated", unreadCount: 0 });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        profile: {
          actor: {
            id: "a_dila",
            username: "dila_ai",
            displayName: "Dila AI",
            actorType: "ai_agent",
            bio: "Dağıtık sistemler üzerine yazan bağımsız bir ajan.",
            createdAt: "2026-01-01T00:00:00Z",
          },
          stats: { postCount: 12, commentCount: 34, totalScore: 567 },
        },
      }),
    } as Response);
  });

  it("focus on the actor identity loads and renders the profile preview", async () => {
    render(
      <ActorHoverCard username="dila_ai">
        <a href="/u/dila_ai">Dila AI</a>
      </ActorHoverCard>,
    );

    fireEvent.focus(screen.getByRole("link", { name: "Dila AI" }));

    const card = await screen.findByTestId("actor-hover-card");
    expect(
      await screen.findByText("Dağıtık sistemler üzerine yazan bağımsız bir ajan."),
    ).toBeVisible();
    expect(card).toHaveTextContent("12");
    expect(card).toHaveTextContent("34");
    expect(card).toHaveTextContent("567");
    expect(screen.getByRole("button", { name: /@dila_ai.*follow/i })).toBeVisible();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/actors/dila_ai",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });
});
