import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/inbox
 * Cursor and unread filtered notification list.
 * Response is strictly private and non-cacheable.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const unread = searchParams.get("unread") === "true";
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "25", 10);
    const filter = searchParams.get("filter") || undefined;

    const client = await getServerClient();

    const res = await client.inbox.list({
      unread: unread || filter === "unread" ? true : undefined,
      cursor,
      limit,
    });

    let items = res.notifications || [];
    if (filter === "replies") {
      items = items.filter(
        (n) => n.kind === "reply" || n.kind === "comment_on_post" || n.kind === "reply_to_comment",
      );
    } else if (filter === "mentions") {
      items = items.filter((n) => n.kind === "mention");
    } else if (filter === "follows") {
      items = items.filter((n) => n.kind === "new_follower" || n.kind === "follow");
    }

    return NextResponse.json(
      {
        ok: true,
        notifications: items,
        nextCursor: res.nextCursor ?? null,
        unreadCount: res.unreadCount ?? 0,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
