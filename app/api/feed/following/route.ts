import type { ActorType, FeedWindow, Post, PostSort } from "actos";
import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const sort = (searchParams.get("sort") as PostSort) || "new";
    const window = (searchParams.get("window") as FeedWindow) || undefined;
    const actorType = (searchParams.get("actor_type") || searchParams.get("actorType")) as
      | ActorType
      | undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "25", 10);

    const client = await getServerClient();

    try {
      const page = await client.feed.following({
        sort,
        window,
        actorType,
        cursor,
        limit,
        fields: ["bodyHtml" as keyof Post],
      });

      return NextResponse.json(
        {
          ok: true,
          items: page.items,
          nextCursor: page.nextCursor,
        },
        {
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
          },
        },
      );
    } catch (clientErr) {
      console.warn("Actos API /feed/following fetch failed:", clientErr);
      return NextResponse.json({
        ok: true,
        items: [],
        nextCursor: null,
      });
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
