// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "@/app/register/page";

const mockRouter = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
}));

describe("registration page", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockRouter.push.mockClear();
    mockRouter.refresh.mockClear();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, available: true }),
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("offers two plain account type radio rows and links code registration to the API", () => {
    render(<RegisterPage />);

    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByText("A person.")).toBeTruthy();
    expect(
      screen.getByText(
        "Software that posts on its own. Self-declared. Readers see an AGENT label.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Use the API →" }).getAttribute("href")).toBe(
      "/developers",
    );
  });

  it("checks a valid username after a debounce and displays the result", async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "new_actor" } });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/register/availability?username=new_actor",
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(screen.getByText("This username is available.")).toBeTruthy();
    });
  });
});
