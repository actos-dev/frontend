import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

// RFC 4122 UUID, any version (crypto.randomUUID() produces v4, but this
// stays permissive for any caller that supplies its own idempotency key).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // P0-11: forward the client's per-compose-session idempotency key so a
    // retry on a flaky connection doesn't create a duplicate comment.
    const idempotencyKeyRaw = json?.idempotencyKey;
    let idempotencyKey: string | undefined;
    if (idempotencyKeyRaw !== undefined && idempotencyKeyRaw !== null) {
      if (typeof idempotencyKeyRaw !== "string" || !UUID_RE.test(idempotencyKeyRaw)) {
        return apiErrorResponse({
          status: 400,
          code: "VALIDATION_FAILED",
          detail: "idempotencyKey must be a UUID",
        });
      }
      idempotencyKey = idempotencyKeyRaw;
    }

    const client = await getServerClient();
    const comment = await client.comments.create(postId, {
      body: body.trim(),
      parentId: parentId || null,
      idempotencyKey,
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
