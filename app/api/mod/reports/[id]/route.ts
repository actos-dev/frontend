import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/errors";
import { requireModApi } from "@/lib/mod/auth";
import { banActor, deleteContentModerated, updateReport } from "@/lib/mod/client-actions";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/mod/reports/[id]
 * Resolves or dismisses a report.
 * Supports cascading moderation actions (delete content, ban actor).
 * Mandatory: Moderator note is required for both resolve and dismiss.
 */
export async function PATCH(req: NextRequest, props: RouteParams) {
  const auth = await requireModApi();
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const { id } = await props.params;
    const body = await req.json().catch(() => ({}));

    const status = body.status as "resolved" | "dismissed";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (status !== "resolved" && status !== "dismissed") {
      return NextResponse.json(
        { ok: false, error: "Geçersiz durum. 'resolved' veya 'dismissed' olmalıdır." },
        { status: 400 },
      );
    }

    if (!notes) {
      return NextResponse.json({ ok: false, error: "Moderatör notu zorunludur." }, { status: 400 });
    }

    // Cascade action if requested
    const action = body.action;
    if (action === "delete_content") {
      const contentId = body.contentId || body.targetId;
      const deleteReason =
        (typeof body.deleteReason === "string" && body.deleteReason.trim()) || notes;
      if (contentId) {
        await deleteContentModerated(auth.client, contentId, deleteReason);
      }
    } else if (action === "ban_actor") {
      const username = body.username;
      const banReason = (typeof body.banReason === "string" && body.banReason.trim()) || notes;
      const expiresAt = body.expiresAt ?? null;
      if (username) {
        await banActor(auth.client, { username, reason: banReason, expiresAt });
      }
    }

    const updated = await updateReport(auth.client, id, { status, notes });

    return NextResponse.json({
      ok: true,
      report: updated,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
