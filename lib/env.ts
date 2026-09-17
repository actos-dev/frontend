const URL_ENV_VARS = ["ACTOS_API_URL", "ACTOS_SITE_URL", "NEXT_PUBLIC_ACTOS_API_URL"] as const;

type UrlEnvVar = (typeof URL_ENV_VARS)[number];
type RuntimeEnv = Record<string, string | undefined>;

function parseHttpUrl(name: UrlEnvVar, value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name} must use the http:// or https:// protocol.`);
  }
  if (url.username || url.password) {
    throw new Error(`${name} must not contain URL credentials.`);
  }
  if (/[?#]/.test(value) || url.search || url.hash) {
    throw new Error(`${name} must not contain a query string or fragment.`);
  }

  return url;
}

/**
 * Validate the URLs used by the Next.js application.
 *
 * Local development keeps its documented defaults, but any value that is
 * supplied is checked. Production requires all three values explicitly so a
 * container cannot silently fall back to localhost or the public site URL.
 */
export function validateRuntimeEnv(
  env: RuntimeEnv = process.env,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  const isProduction = nodeEnv === "production";
  const errors: string[] = [];

  for (const name of URL_ENV_VARS) {
    const rawValue = env[name];
    const value = rawValue?.trim();

    if (!value) {
      if (isProduction) errors.push(`${name} is required in production.`);
      continue;
    }

    try {
      const url = parseHttpUrl(name, value);
      if (name === "ACTOS_SITE_URL" && url.pathname !== "/") {
        throw new Error("ACTOS_SITE_URL must be an origin without a path.");
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${name} is invalid.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid application environment:\n- ${errors.join("\n- ")}`);
  }
}
