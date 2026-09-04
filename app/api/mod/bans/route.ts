import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/errors";
import { requireModApi } from "@/lib/mod/auth";
import { banActor, listBans } from "@/lib/mod/client-actions";

export const dynamic = "force-dynamic";

/**
 * GET /api/mod/bans
 * Lists active bans.
 */
export async function GET() {
  const auth = await requireModApi();
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const bans = await listBans(auth.client);
    return NextResponse.json({
      ok: true,
      bans,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

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

    if (!username) {
      return NextResponse.json({ ok: false, error: "Kullanıcı adı zorunludur." }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ ok: false, error: "Ban gerekçesi zorunludur." }, { status: 400 });
    }

    const ban = await banActor(auth.client, { username, reason, expiresAt });

    return NextResponse.json({
      ok: true,
      ban,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
