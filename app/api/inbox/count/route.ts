import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/inbox/count
 * Returns only the unread notification count for lightweight polling.
 * Response is strictly private and non-cacheable.
 */
export async function GET() {
  try {
    const client = await getServerClient();
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
  } catch (error) {
    return apiErrorResponse(error);
  }
}
