import { defineConfig, devices } from "@playwright/test";

// See test/e2e-real/README.md for how to run a local backend for this suite.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3400";
const ACTOS_API_URL = process.env.ACTOS_API_URL || "http://127.0.0.1:3100";
// The production build validates all three URLs in lib/env.ts; these defaults
// point at the local stack so the suite works with only the backend running.
const ACTOS_SITE_URL = process.env.ACTOS_SITE_URL || BASE_URL;
const NEXT_PUBLIC_ACTOS_API_URL = process.env.NEXT_PUBLIC_ACTOS_API_URL || ACTOS_API_URL;
// MinIO origin in front of the local backend. proxy.ts folds this into the
// CSP img-src/media-src; without it every avatar/image logs a CSP violation.
const ACTOS_MEDIA_URL = process.env.ACTOS_MEDIA_URL || "http://127.0.0.1:3103";

export default defineConfig({
  testDir: "test/e2e-real",
  timeout: 30_000,
  expect: {
    timeout: 7_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    // Locale policy (test/e2e-real/README.md §3a): the app's default is
    // English (ROADMAP D-09), and this suite asserts the default experience.
    // Pin en-US so `Accept-Language` is deterministic on any developer host.
    locale: "en-US",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    // Runs the production build against the real API — this suite exists to
    // catch what the mocked Vitest/Playwright suites cannot (see ROADMAP T-01).
    command: "pnpm build && pnpm start -p 3400",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      ACTOS_API_URL,
      ACTOS_SITE_URL,
      NEXT_PUBLIC_ACTOS_API_URL,
      ACTOS_MEDIA_URL,
    },
  },
});
