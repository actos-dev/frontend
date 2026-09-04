import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";
import { MOCK_NOTIFICATIONS } from "@/lib/inbox-mock";

export const dynamic = "force-dynamic";

/**
 * POST /api/inbox/read-all
 * Bulk-marks all notifications (or up to optional cursor) as read.
 * Returns MarkAllReadResponse { marked }.
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    let cursor = searchParams.get("cursor") || undefined;

    if (!cursor) {
      try {
        const body = await req.json().catch(() => null);
        if (body && typeof body.cursor === "string") {
          cursor = body.cursor;
        }
      } catch {
        // Ignore json parse error if empty body
      }
    }

    const client = await getServerClient();

    try {
      const res = await client.inbox.readAll(cursor);
      return NextResponse.json(
        {
          ok: true,
          marked: res.marked ?? 0,
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

      // Offline fallback: count unread and return marked
      const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.readAt).length;
      return NextResponse.json(
        {
          ok: true,
          marked: unreadCount,
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
