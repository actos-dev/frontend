import type { ApiProblem } from "@/lib/query/types";

export async function readApiJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { ok?: boolean })
    | null;

  if (!response.ok || body?.ok === false || body === null) {
    const problem = new Error(
      (typeof body?.detail === "string" && body.detail) ||
        (typeof body?.title === "string" && body.title) ||
        `Request failed (${response.status})`,
    ) as ApiProblem;
    problem.status = response.status;
    problem.code = typeof body?.code === "string" ? body.code : undefined;
    problem.detail = typeof body?.detail === "string" ? body.detail : undefined;
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
