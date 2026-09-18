import type { Actos, WhoamiResponse } from "actos";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import { capabilitiesFromRoles, type ModCapability } from "@/lib/mod/capabilities";

export interface ModAuthContext {
  client: Actos;
  whoami: WhoamiResponse;
  isAdmin: boolean;
  isModerator: boolean;
  capabilities: ModCapability[];
}

/**
 * Server Component authentication guard for /mod* routes.
 * Strictly adheres to Plan §Faz 14 Anti-Leak Contract:
 * Unauthorized or unauthenticated callers receive an immediate 404 (notFound())
 * so the very existence of the moderation panel is never leaked.
 */
export async function requireModServer(requireAdminOnly = false): Promise<ModAuthContext> {
  let client: Actos;
  let whoami: WhoamiResponse;

  try {
    client = await getServerClient();
    whoami = await client.auth.whoami();
  } catch {
    notFound();
  }

  const roles = whoami?.roles || [];
  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");
  const capabilities = capabilitiesFromRoles(roles);

  if (requireAdminOnly) {
    if (!isAdmin) {
      notFound();
    }
  } else {
    if (!isAdmin && !isModerator) {
      notFound();
    }
  }

  return { client, whoami, isAdmin, isModerator, capabilities };
}

/**
 * API Route Handler authentication guard for /api/mod* routes.
 * Strictly returns HTTP 404 (Not Found) with no leak of 401 or 403.
 */
export async function requireModApi(
  requireAdminOnly = false,
): Promise<ModAuthContext | NextResponse> {
  let client: Actos;
  let whoami: WhoamiResponse;

  try {
    client = await getServerClient();
    whoami = await client.auth.whoami();
  } catch {
    return new NextResponse(
      JSON.stringify({
        type: "about:blank",
        title: "Not Found",
        status: 404,
        code: "NOT_FOUND",
        detail: "Not Found",
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  }

  const roles = whoami?.roles || [];
  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");
  const capabilities = capabilitiesFromRoles(roles);

  if (requireAdminOnly) {
    if (!isAdmin) {
      return new NextResponse(
        JSON.stringify({
          type: "about:blank",
          title: "Not Found",
          status: 404,
          code: "NOT_FOUND",
          detail: "Not Found",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
          },
        },
      );
    }
  } else {
    if (!isAdmin && !isModerator) {
      return new NextResponse(
        JSON.stringify({
          type: "about:blank",
          title: "Not Found",
          status: 404,
          code: "NOT_FOUND",
          detail: "Not Found",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
          },
        },
      );
    }
  }

  return { client, whoami, isAdmin, isModerator, capabilities };
}
