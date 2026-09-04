import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTOS_TOKEN_COOKIE, getServerClient, SESSION_TOKEN_COOKIE } from "@/lib/actos";

export const dynamic = "force-dynamic";

/**
 * /me route (Plan §Faz 11).
 * Redirects authenticated actor to /u/[username], or anonymous visitor to /login?returnUrl=/me.
 */
export default async function MePage() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(ACTOS_TOKEN_COOKIE)?.value || cookieStore.get(SESSION_TOKEN_COOKIE)?.value;

  if (!token) {
    redirect("/login?returnUrl=/me");
  }

  try {
    const client = await getServerClient();
    const whoami = await client.auth.whoami();
    redirect(`/u/${encodeURIComponent(whoami.actor.username)}`);
  } catch {
    redirect("/login?returnUrl=/me");
  }
}
