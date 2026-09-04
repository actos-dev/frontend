import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/errors";
import { requireModApi } from "@/lib/mod/auth";
import { listAuditLogs } from "@/lib/mod/client-actions";

export const dynamic = "force-dynamic";

/**
 * GET /api/mod/actions
 * Lists audit trail logs in chronological order.
 */
export async function GET(req: NextRequest) {
  const auth = await requireModApi();
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    const page = await listAuditLogs(auth.client, { cursor, limit });

    return NextResponse.json({
      ok: true,
      actions: page.items,
      nextCursor: page.nextCursor,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
