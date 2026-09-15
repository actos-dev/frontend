import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "25", 10);

    const client = await getServerClient();

    try {
      const page = await client.saves.list({
        cursor,
        limit,
      });

      return NextResponse.json(
        {
          ok: true,
          items: page.items,
          nextCursor: page.nextCursor ?? null,
          hasMore: Boolean(page.nextCursor),
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
          return apiErrorResponse(clientErr);
        }
      }

      console.warn("Actos API /saves fetch failed:", clientErr);
      return NextResponse.json(
        {
          ok: true,
          items: [],
          nextCursor: null,
          hasMore: false,
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
