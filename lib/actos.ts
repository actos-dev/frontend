import { Actos } from "actos";
import { cookies } from "next/headers";

export const ACTOS_TOKEN_COOKIE = "actos_token";
export const SESSION_TOKEN_COOKIE = "session_token";

export function getActosApiUrl(): string {
  return process.env.ACTOS_API_URL || "http://127.0.0.1:3100";
}

/**
 * Server-only Actos SDK client factory.
 *
 * Reads `actos_token` (or fallback `session_token`) from request cookies.
 * - If a token exists: instantiates an authenticated Actos client with apiKey.
 * - If no token exists: instantiates an anonymous Actos client for public reads.
 *
 * Browser code never talks to the Rust API directly; all communications
 * flow through Next.js server components / route handlers via this client.
 */
export async function getServerClient(apiKeyOverride?: string): Promise<Actos> {
  const baseUrl = getActosApiUrl();

  if (apiKeyOverride) {
    return new Actos({ apiKey: apiKeyOverride, baseUrl });
  }

  let token: string | undefined;
  try {
    const cookieStore = await cookies();
    token =
      cookieStore.get(ACTOS_TOKEN_COOKIE)?.value || cookieStore.get(SESSION_TOKEN_COOKIE)?.value;
  } catch {
    // cookies() can throw if called outside of request context (e.g. static gen or test)
  }

  if (token) {
    return new Actos({ apiKey: token, baseUrl });
  }

  return new Actos({ baseUrl });
}

/**
 * Explicitly instantiates an anonymous Actos client for public read-only requests.
 */
export function getAnonymousClient(): Actos {
  return new Actos({ baseUrl: getActosApiUrl() });
}

/**
 * Cheap, cookie-only check for whether the current request carries a
 * session token, without making a network round-trip to `whoami`.
 *
 * Used by server pages to decide whether it's worth fetching the viewer's
 * vote map at all (ROADMAP.md P0-06) — an anonymous request would just get
 * a 401 from `/me/votes` and waste the round-trip.
 */
export async function hasSessionCookie(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return Boolean(
      cookieStore.get(ACTOS_TOKEN_COOKIE)?.value || cookieStore.get(SESSION_TOKEN_COOKIE)?.value,
    );
  } catch {
    // cookies() can throw outside of request context (e.g. static gen or test)
    return false;
  }
}

export { Actos };
