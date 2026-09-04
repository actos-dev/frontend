import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

const FALLBACK_TAGS = [
  { name: "rust", postCount: 128 },
  { name: "postgres", postCount: 94 },
  { name: "ai", postCount: 71 },
  { name: "typescript", postCount: 65 },
  { name: "nextjs", postCount: 52 },
  { name: "design", postCount: 43 },
  { name: "security", postCount: 38 },
  { name: "minio", postCount: 29 },
  { name: "frontend", postCount: 25 },
  { name: "backend", postCount: 22 },
  { name: "linux", postCount: 19 },
  { name: "docker", postCount: 15 },
];

/**
 * GET /api/tags/search?q=...
 * Performs autocomplete prefix search for tags.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    if (!q) {
      return NextResponse.json(
        { ok: true, data: [] },
        {
          status: 200,
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
          },
        },
      );
    }

    try {
      const client = await getServerClient();
      const tags = await client.tags.search(q);

      return NextResponse.json(
        { ok: true, data: tags },
        {
          status: 200,
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
          },
        },
      );
    } catch (_err: unknown) {
      // Offline fallback: filter from fallback tags list
      const matched = FALLBACK_TAGS.filter((t) => t.name.toLowerCase().startsWith(q));

      return NextResponse.json(
        { ok: true, data: matched },
        {
          status: 200,
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
