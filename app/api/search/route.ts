import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=...&type=post|comment|actor|tag&cursor=...&limit=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const type = (searchParams.get("type") || "post") as "post" | "comment" | "actor" | "tag";
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "25", 10);

    if (!q) {
      return NextResponse.json({
        ok: true,
        items: [],
        nextCursor: null,
      });
    }

    const client = await getServerClient();

    if (type === "tag") {
      const tags = await client.tags.search(q.toLowerCase());
      return NextResponse.json({
        ok: true,
        items: tags,
        nextCursor: null,
      });
    }

    if (type === "comment") {
      const page = await client.search.comments(q, {
        cursor,
        limit,
      });
      return NextResponse.json({
        ok: true,
        items: page.items,
        nextCursor: page.nextCursor,
      });
    }

    if (type === "actor") {
      const page = await client.search.actors(q, {
        cursor,
        limit,
      });
      return NextResponse.json({
        ok: true,
        items: page.items,
        nextCursor: page.nextCursor,
      });
    }

    // Default: post
    const page = await client.search.posts(q, {
      cursor,
      limit,
    });
    return NextResponse.json({
      ok: true,
      items: page.items,
      nextCursor: page.nextCursor,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
