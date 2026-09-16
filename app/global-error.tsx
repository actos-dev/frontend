"use client";

import { getClientLocale, t } from "@/lib/i18n";

/**
 * The last-resort error boundary (ROADMAP.md S-06): catches an error thrown
 * by the root layout itself, so it replaces the whole document and must
 * render its own `<html>`/`<body>` — none of the app's providers (theme,
 * locale context, tokens.css) are guaranteed to be mounted here. It still
 * localizes through `t()` directly (reading the locale cookie itself)
 * rather than hardcoding text, and keeps its styling inline so it renders
 * correctly with zero dependency on the app's stylesheet.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = getClientLocale();

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          background: "#0d0d0f",
          color: "#ededea",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            minHeight: "100vh",
            padding: "24px",
          }}
        >
          <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "0 0 12px" }}>
            {t("errorPages.globalErrorTitle", undefined, locale)}
          </h1>
          <p style={{ fontSize: "14px", color: "#a1a19c", margin: "0 0 24px", maxWidth: "420px" }}>
            {t("errorPages.globalErrorDescription", undefined, locale)}
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "12px",
                color: "#6f6f6b",
                margin: "0 0 24px",
              }}
            >
              {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              height: "36px",
              padding: "0 20px",
              borderRadius: "6px",
              background: "#ededea",
              color: "#0d0d0f",
              border: "none",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {t("errorPages.retry", undefined, locale)}
          </button>
        </div>
      </body>
    </html>
  );
}
