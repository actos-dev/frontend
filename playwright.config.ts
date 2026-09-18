import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || 3005;
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || `http://localhost:${PORT}`;
const ACTOS_SITE_URL = process.env.ACTOS_SITE_URL || BASE_URL;
const ACTOS_MEDIA_URL = process.env.ACTOS_MEDIA_URL || "https://media.actos.com.tr";
// The app renders list/detail pages as Server Components, so their SDK calls
// cannot be intercepted by `page.route`. A small deterministic stand-in serves
// those calls; browser requests stay mocked in each spec. See
// test/e2e/mock-api-server.mjs.
const MOCK_API_PORT = process.env.MOCK_API_PORT || 3199;
const MOCK_API_URL = `http://127.0.0.1:${MOCK_API_PORT}`;
const NEXT_PUBLIC_ACTOS_API_URL = MOCK_API_URL;

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 30000,
  expect: {
    timeout: 7000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // The app's default locale is English; pin it so the suite is
    // deterministic regardless of the developer host's Accept-Language.
    locale: "en-US",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: [
    {
      command: `node test/e2e/mock-api-server.mjs`,
      url: `${MOCK_API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        MOCK_API_PORT: String(MOCK_API_PORT),
      },
    },
    {
      command: `pnpm build && PORT=${PORT} pnpm start`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180000,
      env: {
        ACTOS_API_URL: MOCK_API_URL,
        ACTOS_SITE_URL,
        NEXT_PUBLIC_ACTOS_API_URL,
        ACTOS_MEDIA_URL,
      },
    },
  ],
});
