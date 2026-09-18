import type { Actos, WhoamiResponse } from "actos";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/actos";
import {
  capabilitiesFromPermissions,
  hasModCapability,
  type ModCapability,
} from "@/lib/mod/capabilities";

export interface ModAuthContext {
  client: Actos;
  whoami: WhoamiResponse;
  isAdmin: boolean;
  isModerator: boolean;
  capabilities: ModCapability[];
}

/**
 * Turns the scoped permission grants in `whoami` into the moderation
 * capabilities the console renders. Admin is any holder of a global
 * `role.grant`; a moderator is anyone with at least one global moderation
 * grant.
 */
function moderationContext(whoami: WhoamiResponse) {
  const capabilities = capabilitiesFromPermissions(whoami?.permissions ?? []);
  return {
    capabilities,
    isAdmin: hasModCapability(capabilities, "roles:manage"),
    isModerator: capabilities.length > 0,
  };
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

  const { isAdmin, isModerator, capabilities } = moderationContext(whoami);

  if (requireAdminOnly) {
    if (!isAdmin) {
      notFound();
    }
  } else {
    if (!isModerator) {
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

  const { isAdmin, isModerator, capabilities } = moderationContext(whoami);

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
    if (!isModerator) {
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
