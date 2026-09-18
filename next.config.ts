import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // The compiler API avoids a Node 26 child-process stdout regression in
  // Next's TypeScript CLI path; the explicit `pnpm typecheck` gate remains.
  experimental: { useTypeScriptCli: false },
  outputFileTracingRoot: path.resolve(import.meta.dirname, ".."),
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "3100" },
      { protocol: "http", hostname: "127.0.0.1", port: "3100" },
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "127.0.0.1", port: "9000" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "localhost" },
      { protocol: "https", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "actos.com.tr" },
      { protocol: "https", hostname: "*.actos.com.tr" },
      { protocol: "http", hostname: "*.actos.com.tr" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "https", hostname: "s3.*.amazonaws.com" },
    ],
  },
};

export default nextConfig;
