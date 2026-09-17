import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { ACTOS_TOKEN_COOKIE, Actos, getActosApiUrl, getServerClient } from "@/lib/actos";
import { apiErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * Maps whoami response into a frontend SessionUser object.
 */
function mapWhoamiToSessionUser(whoami: {
  actor: {
    id: string;
    username: string;
    displayName?: string | null;
    actorType: string;
    avatarUrl?: string | null;
  };
  roles: string[];
}) {
  const role = whoami.roles.includes("admin")
    ? ("admin" as const)
    : whoami.roles.includes("moderator")
      ? ("moderator" as const)
      : ("user" as const);

  return {
    id: whoami.actor.id,
    username: whoami.actor.username,
    displayName: whoami.actor.displayName ?? null,
    actorType: whoami.actor.actorType as "human" | "ai_agent",
    role,
    roles: whoami.roles,
    avatarUrl: whoami.actor.avatarUrl ?? null,
  };
}

/**
 * POST /api/session
 * Key-based authentication (Plan §7.1).
 * Validates the API key against the Actos API via whoami,
 * sets the secure httpOnly cookie, and returns the verified user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const rememberMe = Boolean(body.rememberMe);

    if (!apiKey) {
      return apiErrorResponse(
        { code: "INVALID_KEY", status: 401 },
        { status: 401, fallbackMessage: "API anahtarı gereklidir." },
      );
    }

    // Verify key via Actos client
    const testClient = new Actos({
      apiKey,
      baseUrl: getActosApiUrl(),
    });

    const whoami = await testClient.auth.whoami();
    const user = mapWhoamiToSessionUser(whoami);

    // Persist token in secure httpOnly cookie
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      ...(rememberMe ? { maxAge: 365 * 24 * 60 * 60 } : {}),
    };

    cookieStore.set(ACTOS_TOKEN_COOKIE, apiKey, cookieOptions);

    return NextResponse.json(
      { ok: true, user },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    return apiErrorResponse(error, {
      status: 401,
      fallbackMessage: "Geçersiz veya yetkisiz API anahtarı.",
    });
  }
}

/**
 * GET /api/session
 * Verifies current session by calling whoami using the cookie token.
 *
 * A signed-out visitor (no cookie, or a cookie the backend rejects) is not
 * an error: it returns 200 with `{ ok: true, user: null }` so the browser
 * never logs a console error on every anonymous page load (P0-07). An
 * invalid or revoked token still clears the authentication cookie.
 */
export async function GET() {
  const noStoreHeaders = {
    "Cache-Control": "private, no-cache, no-store, must-revalidate",
  };

  const cookieStore = await cookies();
  const token = cookieStore.get(ACTOS_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ ok: true, user: null }, { headers: noStoreHeaders });
  }

  try {
    const client = await getServerClient();
    const whoami = await client.auth.whoami();
    const user = mapWhoamiToSessionUser(whoami);

    return NextResponse.json({ ok: true, user }, { headers: noStoreHeaders });
  } catch {
    // If the token is rejected by the backend, clear invalid cookies immediately (§8)
    cookieStore.set(ACTOS_TOKEN_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    });
    return NextResponse.json({ ok: true, user: null }, { headers: noStoreHeaders });
  }
}

/**
 * DELETE /api/session
 * Logs out the user by wiping the authentication cookie.
 */
export async function DELETE() {
  const cookieStore = await cookies();

  cookieStore.set(ACTOS_TOKEN_COOKIE, "", {
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
}
