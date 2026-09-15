import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/tags
 * Returns popular tags ordered by post count.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);

    const client = await getServerClient();
    const page = await client.tags.popular({ cursor, limit });

    return NextResponse.json(
      {
        ok: true,
        tags: page.items,
        nextCursor: page.nextCursor,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
