import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/comments?postId=...&sort=top|new&parent=...
 * Retrieves comments thread for a post or specific subtree.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");
    const sort = searchParams.get("sort") || "top";
    const parent = searchParams.get("parent") || undefined;

    if (!postId) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "postId query parameter is required",
      });
    }

    const client = await getServerClient();
    // YAPILACAKLAR.md §3: bodyHtml: true sends ?body_html=true (not ?fields=)
    const comments = await client.comments.list(postId, {
      sort: sort as "new" | "top",
      parent,
      bodyHtml: true,
    });

    return NextResponse.json(
      { ok: true, data: comments },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/comments
 * Creates a new top-level comment or reply.
 * Requires authentication.
 */
export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const postId = json?.postId;
    const body = json?.body;
    const parentId = json?.parentId ?? null;

    if (!postId || typeof postId !== "string") {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "postId is required and must be a string",
      });
    }

    if (!body || typeof body !== "string" || !body.trim()) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "body is required and cannot be blank",
      });
    }

    const client = await getServerClient();
    const comment = await client.comments.create(postId, {
      body: body.trim(),
      parentId: parentId || null,
    });

    return NextResponse.json(
      { ok: true, data: comment },
      {
        status: 201,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
