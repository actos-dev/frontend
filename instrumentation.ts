import { validateRuntimeEnv } from "./lib/env";

/** Runs once as the Next.js server starts, before it handles requests. */
export function register(): void {
  validateRuntimeEnv();
}
