import { type NextRequest, NextResponse } from "next/server";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const MAX_MULTIPART_BYTES = 34 * 1024 * 1024;

/**
 * Origin that serves user media (avatars, attachments). Defaults to the
 * production media host; set `ACTOS_MEDIA_URL` to the local MinIO origin when
 * running the production build against a local backend (the real-backend e2e
 * suite does exactly that).
 */
const DEFAULT_MEDIA_ORIGIN = "https://media.actos.com.tr";

function mediaOrigin(): string {
  const raw = process.env.ACTOS_MEDIA_URL?.trim();
  if (!raw) return DEFAULT_MEDIA_ORIGIN;
  try {
    return new URL(raw).origin;
  } catch {
    return DEFAULT_MEDIA_ORIGIN;
  }
}

function publicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (forwardedHost) {
    return `${forwardedProtocol || "https"}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

function mutationRejection(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith("/api/") || SAFE_METHODS.has(request.method)) {
    return null;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const expectedOrigin = publicOrigin(request);
  const crossSite = fetchSite === "cross-site" || (origin !== null && origin !== expectedOrigin);

  if (crossSite) {
    return NextResponse.json(
      {
        type: "about:blank",
        title: "Forbidden",
        status: 403,
        code: "CROSS_SITE_REQUEST",
      },
      { status: 403 },
    );
  }

  const isGuardedUpload =
    request.method === "POST" &&
    (request.nextUrl.pathname === "/api/posts" ||
      request.nextUrl.pathname === "/api/actors/me/avatar") &&
    request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data");
  const contentLength = Number(request.headers.get("content-length"));

  if (isGuardedUpload && Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return NextResponse.json(
      {
        type: "about:blank",
        title: "Payload Too Large",
        status: 413,
        code: "PAYLOAD_TOO_LARGE",
      },
      { status: 413 },
    );
  }

  return null;
}

function contentSecurityPolicy(nonce: string): string {
  const developmentSources = IS_PRODUCTION
    ? ""
    : " 'unsafe-eval' http://localhost:* http://127.0.0.1:*";
  const media = mediaOrigin();

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentSources}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src 'self' data: blob: ${media}${developmentSources}`,
    "connect-src 'self'",
    `media-src 'self' blob: ${media}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(IS_PRODUCTION ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const rejectedMutation = mutationRejection(request);
  if (rejectedMutation) return rejectedMutation;

  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);

  // Next reads the request CSP nonce and applies it to framework scripts.
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  );

  if (IS_PRODUCTION) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-touch-icon.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
