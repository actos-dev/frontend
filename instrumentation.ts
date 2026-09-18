import type { Instrumentation } from "next";
import { validateRuntimeEnv } from "./lib/env";

/** Runs once as the Next.js server starts, before it handles requests. */
export function register(): void {
  validateRuntimeEnv();
}

function errorDetails(error: unknown): { name: string; message: string; digest?: string } {
  if (!(error instanceof Error)) {
    return { name: "UnknownError", message: String(error) };
  }

  const digest = (error as Error & { digest?: unknown }).digest;
  return {
    name: error.name,
    message: error.message,
    ...(typeof digest === "string" ? { digest } : {}),
  };
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  // Deliberately omit request headers: they can contain the session API key.
  console.error(
    JSON.stringify({
      level: "error",
      event: "request_error",
      timestamp: new Date().toISOString(),
      request: {
        method: request.method,
        path: request.path,
      },
      context: {
        route: context.routePath,
        routeType: context.routeType,
        router: context.routerKind,
      },
      error: errorDetails(error),
    }),
  );
};
