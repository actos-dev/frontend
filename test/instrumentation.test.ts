import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestError } from "@/instrumentation";

describe("request error instrumentation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes structured JSON without logging request headers", () => {
    const write = vi.spyOn(console, "error").mockImplementation(() => undefined);

    onRequestError(
      new Error("backend unavailable"),
      {
        method: "GET",
        path: "/posts/c_1",
        headers: { cookie: "actos_token=must-not-leak" },
      },
      {
        routePath: "/posts/[id]",
        routeType: "render",
        routerKind: "App Router",
        revalidateReason: undefined,
      },
    );

    const record = JSON.parse(String(write.mock.calls[0]?.[0]));
    expect(record).toMatchObject({
      level: "error",
      event: "request_error",
      request: { method: "GET", path: "/posts/c_1" },
      context: { route: "/posts/[id]", routeType: "render" },
      error: { name: "Error", message: "backend unavailable" },
    });
    expect(JSON.stringify(record)).not.toContain("must-not-leak");
  });
});
