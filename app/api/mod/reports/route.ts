import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/errors";
import { requireModApi } from "@/lib/mod/auth";
import { listReports } from "@/lib/mod/client-actions";
import { enrichReports } from "@/lib/mod/report-enrichment";

export const dynamic = "force-dynamic";

/**
 * GET /api/mod/reports
 * Lists reports in the moderation queue with optional status filter.
 * Anti-leak protected: unauthorized callers get 404.
 */
export async function GET(req: NextRequest) {
  const auth = await requireModApi();
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    const page = await listReports(auth.client, { status, cursor, limit });
    const reports = await enrichReports(auth.client, page.items);

    return NextResponse.json({
      ok: true,
      reports,
      nextCursor: page.nextCursor,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
