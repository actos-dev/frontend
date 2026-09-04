import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";
import { MOCK_NOTIFICATIONS } from "@/lib/inbox-mock";

export const dynamic = "force-dynamic";

/**
 * GET /api/inbox/count
 * Returns only the unread notification count for lightweight polling.
 * Response is strictly private and non-cacheable.
 */
export async function GET() {
  try {
    const client = await getServerClient();

    try {
      const count = await client.inbox.unreadCount();
      return NextResponse.json(
        {
          ok: true,
          unread_count: count,
          unreadCount: count,
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
      const fallbackCount = MOCK_NOTIFICATIONS.filter((n) => !n.readAt).length;

      return NextResponse.json(
        {
          ok: true,
          unread_count: fallbackCount,
          unreadCount: fallbackCount,
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
