import type { CommentNode } from "actos";
import { type NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";
import { renderCommentBody, renderCommentTree } from "@/lib/render/comment-tree";

export const dynamic = "force-dynamic";

const MAX_COMMENT_ATTACHMENTS = 4;

/**
 * GET /api/comments?postId=...&sort=top|new&parent=...
 * Retrieves comments thread for a post or specific subtree.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");
    const sort = searchParams.get("sort") || "top";
    if (sort !== "top" && sort !== "new") {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "sort must be 'top' or 'new'",
      });
    }
    const parent = searchParams.get("parent") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "25", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 25;

    if (!postId) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "postId query parameter is required",
      });
    }

    const client = await getServerClient();
    // F-02: the API is no longer asked for `body_html`; lib/render is the
    // only renderer now, so bodies are rendered here, on the server.
    const response = await client.transport.request<{
      comments: CommentNode[];
      nextCursor?: string | null;
    }>({
      method: "GET",
      path: `/posts/${encodeURIComponent(postId)}/comments`,
      query: { sort, parent, cursor, limit },
    });
    const comments = await renderCommentTree(response.data.comments);

    return NextResponse.json(
      { ok: true, data: comments, nextCursor: response.data.nextCursor ?? null },
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
 * Creates a new top-level comment or reply. The web proxy accepts JSON or
 * multipart form fields (`postId`, `body`, optional `parentId`, repeated
 * `files`) and passes files to the SDK, which sends the backend contract:
 * a JSON `payload` part plus up to four `files` parts.
 * Requires authentication.
 */
export async function POST(req: NextRequest) {
  try {
    const isMultipart = req.headers.get("content-type")?.includes("multipart/form-data");
    let postId: unknown;
    let body: unknown;
    let parentId: unknown = null;
    let files: File[] = [];

    if (isMultipart) {
      const formData = await req.formData().catch(() => null);
      if (!formData) {
        return apiErrorResponse({
          status: 400,
          code: "VALIDATION_FAILED",
          detail: "Multipart form data could not be parsed",
        });
      }

      postId = formData.get("postId");
      body = formData.get("body");
      parentId = formData.get("parentId") || null;
      const fileParts = formData.getAll("files");
      if (fileParts.some((part) => !(part instanceof Blob))) {
        return apiErrorResponse({
          status: 400,
          code: "VALIDATION_FAILED",
          detail: "Each files part must be an image file",
        });
      }
      files = fileParts as File[];
    } else {
      const json = await req.json().catch(() => null);
      postId = json?.postId;
      body = json?.body;
      parentId = json?.parentId ?? null;
    }

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

    if (parentId !== null && typeof parentId !== "string") {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: "parentId must be a string when provided",
      });
    }

    if (files.length > MAX_COMMENT_ATTACHMENTS) {
      return apiErrorResponse({
        status: 400,
        code: "VALIDATION_FAILED",
        detail: `A comment may include at most ${MAX_COMMENT_ATTACHMENTS} images`,
      });
    }

    const client = await getServerClient();
    const created = await client.comments.create(postId, {
      body: body.trim(),
      parentId: parentId || null,
      ...(files.length > 0 ? { files } : {}),
    });
    const comment = await renderCommentBody(created);

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
