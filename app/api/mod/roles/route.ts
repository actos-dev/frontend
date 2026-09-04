import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/errors";
import { requireModApi } from "@/lib/mod/auth";
import { setRole } from "@/lib/mod/client-actions";

export const dynamic = "force-dynamic";

/**
 * POST /api/mod/roles
 * Assigns or revokes administrative/moderator roles on an actor.
 * STRICTLY restricted to 'admin' users. Ordinary moderators get a 404 response.
 */
export async function POST(req: NextRequest) {
  // requireAdminOnly = true
  const auth = await requireModApi(true);
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const role = body.role === "moderator" || body.role === "admin" ? body.role : null;

    if (!username) {
      return NextResponse.json({ ok: false, error: "Kullanıcı adı zorunludur." }, { status: 400 });
    }

    await setRole(auth.client, { username, role });

    return NextResponse.json({
      ok: true,
      message: role
        ? `${username} kullanıcısına '${role}' rolü başarıyla atandı.`
        : `${username} kullanıcısının rolü kaldırıldı.`,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
