import type { NotificationSummary } from "actos";
import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";
import { MOCK_NOTIFICATIONS } from "@/lib/inbox-mock";

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
    const filter = searchParams.get("filter") || undefined; // "replies" | "mentions" | "unread" | "all"

    const client = await getServerClient();

    try {
      const res = await client.inbox.list({
        unread: unread || filter === "unread" ? true : undefined,
        cursor,
        limit,
      });

      let items = res.notifications || [];
      if (filter === "replies") {
        items = items.filter(
          (n) =>
            n.kind === "reply" || n.kind === "comment_on_post" || n.kind === "reply_to_comment",
        );
      } else if (filter === "mentions") {
        items = items.filter((n) => n.kind === "mention");
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
    } catch (clientErr) {
      if (
        clientErr &&
        typeof clientErr === "object" &&
        ("status" in clientErr || "code" in clientErr)
      ) {
        const err = clientErr as { status?: number; code?: string };
        if (
          err.status === 401 ||
          err.code === "MISSING_CREDENTIALS" ||
          err.code === "INVALID_KEY"
        ) {
          return apiErrorResponse(clientErr, { status: 401 });
        }
      }

      // Offline / local development fallback
      let items = [...MOCK_NOTIFICATIONS] as unknown as NotificationSummary[];
      if (unread || filter === "unread") {
        items = items.filter((n) => !n.readAt);
      }
      if (filter === "replies") {
        items = items.filter(
          (n) =>
            n.kind === "reply" || n.kind === "comment_on_post" || n.kind === "reply_to_comment",
        );
      } else if (filter === "mentions") {
        items = items.filter((n) => n.kind === "mention");
      }

      const totalUnread = MOCK_NOTIFICATIONS.filter((n) => !n.readAt).length;

      return NextResponse.json(
        {
          ok: true,
          notifications: cursor ? [] : items,
          nextCursor: null,
          unreadCount: totalUnread,
        },
        {
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
          },
        },
      );
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
