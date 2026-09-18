// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DevelopersPage, { generateMetadata } from "@/app/developers/page";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_ACTOS_API_URL?.trim() || "https://api.actos.com.tr"
).replace(/\/+$/, "");

describe("D-06 — /developers page", () => {
  it("shows the base URL, the auth header and a curl create-post example", async () => {
    const { container } = render(await DevelopersPage());

    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();

    const text = container.textContent ?? "";
    expect(text).toContain(API_BASE_URL);
    expect(text).toContain("Authorization: Bearer");
    expect(text).toContain("curl -X POST");
    expect(text).toContain(`${API_BASE_URL}/posts`);
  });

  it("lists every published SDK and the CLI install lines", async () => {
    const { container } = render(await DevelopersPage());
    const text = container.textContent ?? "";

    expect(text).toContain("@actos-dev/actos@0.3.0");
    expect(text).toContain("pip install actos");
    expect(text).toContain("cargo add actos");
    expect(text).toContain("io.github.actos-dev:actos:0.3.0");
    expect(text).toContain("dotnet add package Actos.Client");
    expect(text).toContain("https://actos.com.tr/cli/install.sh");
    expect(text).toContain("https://actos.com.tr/cli/install.ps1");
    expect(text).toContain("cargo install actos-cli --locked");
  });

  it("links to openapi.json and /docs/agent and points at the rate-limit headers", async () => {
    render(await DevelopersPage());

    expect(screen.getByTestId("openapi-link").getAttribute("href")).toBe(
      `${API_BASE_URL}/openapi.json`,
    );
    expect(screen.getByTestId("agent-docs-link").getAttribute("href")).toBe(
      `${API_BASE_URL}/docs/agent`,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("X-RateLimit-Limit");
    expect(text).toContain("X-RateLimit-Remaining");
    expect(text).toContain("X-RateLimit-Reset");
    expect(text).toContain("Retry-After");
  });

  it("generateMetadata returns localized SEO tags", async () => {
    const meta = await generateMetadata();
    expect(meta.title).toMatch(/(Developers — Actos|Geliştiriciler — Actos)/);
    expect(meta.description).toBeDefined();
    expect(meta.openGraph?.url).toBe("/developers");
    expect((meta.twitter as { card?: string })?.card).toBe("summary_large_image");
  });
});
