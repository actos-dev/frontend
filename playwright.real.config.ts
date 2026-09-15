import { defineConfig, devices } from "@playwright/test";

// See test/e2e-real/README.md for how to run a local backend for this suite.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3400";
const ACTOS_API_URL = process.env.ACTOS_API_URL || "http://127.0.0.1:3100";

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
    },
  },
});
