import { type NextRequest, NextResponse } from "next/server";
import { getServerClient, hasSessionCookie } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";
import { fetchVoteMap } from "@/lib/votes";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/votes?content_ids=a,b,c
 * Returns the signed-in viewer's vote value (-1 | 0 | 1) for each requested
 * content id, via `client.votes.list`.
 *
 * Used by client-side pagination only (load-more, search) — server-rendered
 * list pages fetch the same data straight through the SDK instead (see
 * `lib/votes.ts`). Never merge this into `/api/feed`: that response is
 * cached `public, s-maxage=10`, so one viewer's votes would leak to every
 * other viewer who hits the shared cache entry (ROADMAP.md P0-06).
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await hasSessionCookie())) {
      return apiErrorResponse(
        { status: 401, code: "MISSING_CREDENTIALS" },
        { status: 401, fallbackMessage: "Sign in required." },
      );
    }

    const raw = req.nextUrl.searchParams.get("content_ids") || "";
    const ids = raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const client = await getServerClient();
    const votes = await fetchVoteMap(client, ids);

    return NextResponse.json(
      { ok: true, votes },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
