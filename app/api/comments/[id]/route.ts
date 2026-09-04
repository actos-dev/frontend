import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/comments/[id]
 * Retrieves a single comment and its ancestor chain.
 */
export async function GET(_req: NextRequest, props: RouteProps) {
  try {
    const { id } = await props.params;

    if (!id) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "comment id is required",
      });
    }

    const client = await getServerClient();
    const detail = await client.comments.get(id);

    return NextResponse.json(
      { ok: true, data: detail },
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
 * PATCH /api/comments/[id]
 * Updates comment body. Requires author ownership.
 */
export async function PATCH(req: NextRequest, props: RouteProps) {
  try {
    const { id } = await props.params;
    const json = await req.json().catch(() => null);
    const body = json?.body;

    if (!id) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "comment id is required",
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
    const updated = await client.comments.update(id, { body: body.trim() });

    return NextResponse.json(
      { ok: true, data: updated },
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
 * DELETE /api/comments/[id]
 * Soft-deletes a comment. Children replies remain preserved.
 * Requires author or moderator ownership.
 */
export async function DELETE(_req: NextRequest, props: RouteProps) {
  try {
    const { id } = await props.params;

    if (!id) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "comment id is required",
      });
    }

    const client = await getServerClient();
    await client.comments.delete(id);

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
