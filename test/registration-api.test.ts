import { ActosAPIError, Transport } from "actos";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/register/availability/route";

describe("registration username availability", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the public actor lookup and reports existing names as unavailable", async () => {
    const requestSpy = vi.spyOn(Transport.prototype, "request").mockResolvedValue({
      data: { username: "already_taken" },
      status: 200,
      headers: new Headers(),
    } as never);

    const response = await GET(
      new NextRequest("http://localhost/api/register/availability?username=Already_Taken"),
    );

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET", path: "/actors/already_taken" }),
    );
    expect(await response.json()).toMatchObject({ ok: true, available: false });
  });

  it("reports a missing actor as available", async () => {
    vi.spyOn(Transport.prototype, "request").mockRejectedValue(
      new ActosAPIError({ status: 404, code: "NOT_FOUND" }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/register/availability?username=available_name"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, available: true });
  });

  it("rejects invalid names without calling the API", async () => {
    const requestSpy = vi.spyOn(Transport.prototype, "request");
    const response = await GET(
      new NextRequest("http://localhost/api/register/availability?username=Two%20Words"),
    );

    expect(response.status).toBe(400);
    expect(requestSpy).not.toHaveBeenCalled();
  });
});
