import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { ACTOS_TOKEN_COOKIE, getServerClient, SESSION_TOKEN_COOKIE } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/actors/me
 * Partially updates authenticated actor profile (Plan §Faz 11).
 *
 * Only `displayName` and `bio` are accepted. The avatar is managed separately
 * through `POST`/`DELETE /api/actors/me/avatar`.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const client = await getServerClient();

    const updatePayload: {
      displayName?: string | null;
      bio?: string | null;
    } = {};

    if ("displayName" in body) {
      updatePayload.displayName =
        body.displayName === null || typeof body.displayName === "string" ? body.displayName : null;
    }

    if ("bio" in body) {
      updatePayload.bio = body.bio === null || typeof body.bio === "string" ? body.bio : null;
    }

    const updated = await client.actors.updateMe(updatePayload);

    return NextResponse.json(
      { ok: true, actor: updated },
      {
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
 * DELETE /api/actors/me
 * Irreversible account soft-deletion (Plan §Faz 11).
 * Requires recoveryCode proof and clears session cookies on success.
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const client = await getServerClient();

    const recoveryCode =
      typeof body.recoveryCode === "string" ? body.recoveryCode.trim() : undefined;

    await client.actors.deleteMe(recoveryCode ? { recoveryCode } : undefined);

    // Clear session cookies immediately
    const cookieStore = await cookies();
    cookieStore.set(ACTOS_TOKEN_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    });
    cookieStore.set(SESSION_TOKEN_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
