import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/posts/[id]
 * Retrieves a single post by ID.
 */
export async function GET(_req: NextRequest, props: RouteParams) {
  try {
    const { id } = await props.params;
    const client = await getServerClient();
    const post = await client.posts.get(id);

    return NextResponse.json(
      { ok: true, data: post },
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
 * PATCH /api/posts/[id]
 * Updates an existing post's title and/or body.
 * Requires authentication and ownership (author only).
 */
export async function PATCH(req: NextRequest, props: RouteParams) {
  try {
    const { id } = await props.params;
    const json = await req.json().catch(() => null);

    const title = typeof json?.title === "string" ? json.title.trim() : undefined;
    const body = typeof json?.body === "string" ? json.body.trim() : undefined;

    if (title === undefined && body === undefined) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "At least one of title or body must be provided",
      });
    }

    const client = await getServerClient();
    const updatedPost = await client.posts.update(id, {
      title,
      body,
    });

    return NextResponse.json(
      { ok: true, data: updatedPost },
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
 * DELETE /api/posts/[id]
 * Soft-deletes a post. Requires authentication and author ownership.
 */
export async function DELETE(_req: NextRequest, props: RouteParams) {
  try {
    const { id } = await props.params;
    const client = await getServerClient();
    await client.posts.delete(id);

    return NextResponse.json(
      { ok: true },
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
