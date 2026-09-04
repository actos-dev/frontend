import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/errors";
import { requireModApi } from "@/lib/mod/auth";
import { deleteContentModerated } from "@/lib/mod/client-actions";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/mod/contents/[id]
 * Moderatively deletes a post or comment.
 * Requirement 5: Reason is strictly mandatory.
 */
export async function DELETE(req: NextRequest, props: RouteParams) {
  const auth = await requireModApi();
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const { id } = await props.params;
    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason) {
      return NextResponse.json(
        { ok: false, error: "Silme gerekçesi zorunludur." },
        { status: 400 },
      );
    }

    await deleteContentModerated(auth.client, id, reason);

    return NextResponse.json({
      ok: true,
      message: "İçerik moderatör tarafından başarıyla silindi.",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
