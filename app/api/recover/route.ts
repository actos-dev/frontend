import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { ACTOS_TOKEN_COOKIE, Actos, getActosApiUrl, getAnonymousClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/recover
 * Account recovery via one-time recovery code (Plan §7.1, §7.2).
 * Consumes the recovery code, obtains a new API key, automatically
 * sets the session cookie, and returns the new credentials.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const recoveryCode = typeof body.recoveryCode === "string" ? body.recoveryCode.trim() : "";
    const rememberMe = Boolean(body.rememberMe);

    if (!username || !recoveryCode) {
      return apiErrorResponse(
        { code: "VALIDATION_FAILED", status: 400 },
        {
          status: 400,
          fallbackMessage: "Kullanıcı adı ve kurtarma kodu gereklidir.",
        },
      );
    }

    const anonClient = getAnonymousClient();
    const recoverResult = await anonClient.auth.recover({
      username,
      recoveryCode,
    });

    // Store the recovered API key in the authentication cookie.
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      ...(rememberMe ? { maxAge: 365 * 24 * 60 * 60 } : {}),
    };

    cookieStore.set(ACTOS_TOKEN_COOKIE, recoverResult.apiKey, cookieOptions);
    // Retrieve actor details for the recovered user
    let user = null;
    try {
      const authClient = new Actos({
        apiKey: recoverResult.apiKey,
        baseUrl: getActosApiUrl(),
      });
      const whoami = await authClient.auth.whoami();
      const role = whoami.roles.includes("admin")
        ? ("admin" as const)
        : whoami.roles.includes("moderator")
          ? ("moderator" as const)
          : ("user" as const);

      user = {
        id: whoami.actor.id,
        username: whoami.actor.username,
        displayName: whoami.actor.displayName ?? null,
        actorType: whoami.actor.actorType,
        role,
        roles: whoami.roles,
        avatarUrl: whoami.actor.avatarUrl ?? null,
      };
    } catch {
      // ignore whoami retrieval failure on recover
    }

    return NextResponse.json(
      {
        ok: true,
        apiKey: recoverResult.apiKey,
        remainingRecoveryCodes: recoverResult.remainingRecoveryCodes,
        user,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error, {
      fallbackMessage: "Kurtarma kodu geçersiz veya süresi dolmuş.",
    });
  }
}
