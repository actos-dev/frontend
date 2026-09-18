import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/errors";
import { requireModApi } from "@/lib/mod/auth";
import { banActor } from "@/lib/mod/client-actions";

export const dynamic = "force-dynamic";

/**
 * POST /api/mod/bans
 * Creates a new ban (temporary or permanent) for an actor.
 * Requires mandatory username and reason.
 */
export async function POST(req: NextRequest) {
  const auth = await requireModApi();
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const expiresAt = body.expiresAt ? String(body.expiresAt) : null;
    const community =
      typeof body.community === "string" && body.community.trim() ? body.community.trim() : null;
    const deletePosts = body.deletePosts === true;

    if (!username) {
      return NextResponse.json({ ok: false, error: "Kullanıcı adı zorunludur." }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ ok: false, error: "Ban gerekçesi zorunludur." }, { status: 400 });
    }

    // "Also delete their posts" is only meaningful inside a community; the API
    // rejects it without a scope, so the same rule is enforced here.
    if (deletePosts && !community) {
      return NextResponse.json(
        { ok: false, error: "Deleting posts requires a community scope." },
        { status: 400 },
      );
    }

    const ban = await banActor(auth.client, {
      username,
      reason,
      expiresAt,
      community,
      deletePosts,
    });

    return NextResponse.json({
      ok: true,
      ban,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
