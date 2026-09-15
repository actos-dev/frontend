import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

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
  } catch (error) {
    return apiErrorResponse(error);
  }
}
