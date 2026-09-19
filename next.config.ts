import path from "node:path";
import type { NextConfig } from "next";

/**
 * Origin that serves user media (avatars, attachments), mirroring the
 * `ACTOS_MEDIA_URL` handling in `proxy.ts`. Without a matching `next/image`
 * remote pattern the optimizer answers 400 for every image; without
 * `dangerouslyAllowLocalIP` Next 16 additionally refuses to fetch private
 * addresses. Both only matter when the real-backend e2e suite points at local
 * MinIO; in production the variable is unset and the `*.actos.com.tr`
 * wildcard below applies.
 */
function mediaOrigin(): URL | null {
  const raw = process.env.ACTOS_MEDIA_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    hostname.endsWith(".local")
  );
}

const media = mediaOrigin();

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // The compiler API avoids a Node 26 child-process stdout regression in
  // Next's TypeScript CLI path; the explicit `pnpm typecheck` gate remains.
  experimental: { useTypeScriptCli: false },
  outputFileTracingRoot: path.resolve(import.meta.dirname, ".."),
  // `lib/legal.ts` reads `content/legal/*.txt` at request time; nft cannot
  // see through the dynamic filename, so the legal routes declare the
  // directory for the standalone image.
  outputFileTracingIncludes: {
    "/*": ["./content/legal/**/*"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    dangerouslyAllowLocalIP: media !== null && isLocalHostname(media.hostname),
    remotePatterns: [
      // Local development only: the backend origin, for setups that serve
      // media straight from the API. The MinIO origin is covered by the
      // `ACTOS_MEDIA_URL`-derived pattern below.
      { protocol: "http", hostname: "localhost", port: "3100" },
      { protocol: "http", hostname: "127.0.0.1", port: "3100" },
      // Production media lives on `media.actos.com.tr`; the wildcard keeps
      // any other Actos subdomain working without widening to the open web.
      { protocol: "https", hostname: "*.actos.com.tr" },
      ...(media
        ? [
            {
              protocol: media.protocol === "https:" ? ("https" as const) : ("http" as const),
              hostname: media.hostname,
              ...(media.port ? { port: media.port } : {}),
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
