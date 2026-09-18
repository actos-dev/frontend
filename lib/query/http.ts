import type { ApiProblem } from "@/lib/query/types";
import { parseRetryAfterSeconds, rateLimitMessage } from "@/lib/rate-limit";

export async function readApiJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { ok?: boolean })
    | null;

  if (!response.ok || body?.ok === false || body === null) {
    const code = typeof body?.code === "string" ? body.code : undefined;
    const retryAfter =
      parseRetryAfterSeconds(response.headers?.get?.("retry-after") ?? null) ??
      (typeof body?.retryAfter === "number" ? body.retryAfter : null);

    // A 429 is the one error whose text depends on live data. Formatting it
    // here means every caller that shows `error.detail` — the optimistic
    // mutation hooks included — gets the same localized "try again in N s"
    // message without repeating the logic per form.
    const rateLimited = response.status === 429 || code === "RATE_LIMITED";
    const detail =
      (rateLimited ? rateLimitMessage(retryAfter) : null) ||
      (typeof body?.detail === "string" && body.detail) ||
      (typeof body?.title === "string" && body.title) ||
      `Request failed (${response.status})`;

    const problem = new Error(detail) as ApiProblem;
    problem.status = response.status;
    problem.code = code;
    problem.detail = detail;
    problem.retryAfter = retryAfter;
    throw problem;
  }

  return body as T;
}

export function isAuthenticationProblem(error: unknown): boolean {
  const problem = error as Partial<ApiProblem>;
  return (
    problem.status === 401 ||
    problem.code === "MISSING_CREDENTIALS" ||
    problem.code === "INVALID_KEY"
  );
}
