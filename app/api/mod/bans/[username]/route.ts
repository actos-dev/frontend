import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/errors";
import { requireModApi } from "@/lib/mod/auth";
import { unbanActor } from "@/lib/mod/client-actions";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ username: string }>;
}

/**
 * DELETE /api/mod/bans/[username]
 * Lifts/removes a ban from an actor.
 */
export async function DELETE(_req: NextRequest, props: RouteParams) {
  const auth = await requireModApi();
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const { username } = await props.params;
    const decodedUsername = decodeURIComponent(username).trim();

    if (!decodedUsername) {
      return NextResponse.json({ ok: false, error: "Kullanıcı adı zorunludur." }, { status: 400 });
    }

    await unbanActor(auth.client, decodedUsername);

    return NextResponse.json({
      ok: true,
      message: `${decodedUsername} kullanıcısının banı kaldırıldı.`,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
