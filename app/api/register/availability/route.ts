import { ActosAPIError } from "actos";
import { type NextRequest, NextResponse } from "next/server";
import { getAnonymousClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/register/availability?username=...
 * Proxies the public actor lookup without exposing the Actos API URL to the browser.
 */
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim().toLowerCase() || "";
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return NextResponse.json(
      { ok: false, detail: "Username must be 3–30 lowercase letters, numbers, or underscores." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await getAnonymousClient().actors.get(username);
    return NextResponse.json(
      { ok: true, available: false },
      { headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" } },
    );
  } catch (error) {
    if (error instanceof ActosAPIError && error.status === 404) {
      return NextResponse.json(
        { ok: true, available: true },
        { headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate" } },
      );
    }

    return apiErrorResponse(error);
  }
}
