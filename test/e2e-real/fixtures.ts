import { readFileSync } from "node:fs";
import path from "node:path";
import { type BrowserContext, test as base, expect } from "@playwright/test";

/**
 * A console error, uncaught page error, or HTTP response with status >= 400
 * observed during a test.
 */
interface CapturedIssue {
  kind: "console" | "pageerror" | "response";
  message: string;
  status?: number;
  url?: string;
}

/**
 * Explicit allow-list for issues we already know about and don't want this
 * suite to fail on. Keep this list short and each entry commented with why
 * it's here and when it can be removed — an empty list is the goal.
 */
const ALLOW_LIST: Array<(issue: CapturedIssue) => boolean> = [
  // TODO(K-05): remove when the dead /docs link is deleted.
  // The right rail and the about page still link to /docs, which 404s
  // (ROADMAP K-05). Next.js's hover/viewport link prefetch fires a
  // background GET for it that surfaces here as a >=400 response.
  (issue) =>
    issue.kind === "response" &&
    issue.status === 404 &&
    !!issue.url &&
    new URL(issue.url).pathname === "/docs",

  // TODO(P0-08): remove when a real favicon is added to public/.
  // public/ has no favicon, so every page 404s on the browser's implicit
  // `/favicon.ico` probe (ROADMAP P0-08). There's no <link rel="icon"> in
  // the document, so this request isn't page-initiated — Chromium never
  // surfaces it as a page-scoped `response` event, only as this generic
  // console message, which is why the match is on message text rather than
  // a URL. A real broken resource (a bad avatar/attachment URL, a missing
  // script) still fires its own page-level `response` event independent of
  // this rule, so this stays narrow in practice.
  (issue) =>
    issue.kind === "console" &&
    issue.message ===
      "Failed to load resource: the server responded with a status of 404 (Not Found)",
];

function isAllowed(issue: CapturedIssue): boolean {
  return ALLOW_LIST.some((rule) => rule(issue));
}

function formatIssue(issue: CapturedIssue): string {
  return `[${issue.kind}] ${issue.message}`;
}

/**
 * Handed to tests that need to allow one extra, test-specific issue on top
 * of the suite-wide ALLOW_LIST above — e.g. the "nonexistent post returns
 * the 404 page" test, which deliberately navigates to a URL that 404s.
 */
export interface PageErrorTracker {
  allow(rule: (issue: CapturedIssue) => boolean): void;
}

export const test = base.extend<{ pageErrors: PageErrorTracker }>({
  // Auto fixture: every test in this suite gets error tracking without
  // having to opt in explicitly. Tests that expect a >=400 response as part
  // of the scenario under test can still request `pageErrors` to allow it.
  pageErrors: [
    async ({ page }, use) => {
      const issues: CapturedIssue[] = [];
      const extraRules: Array<(issue: CapturedIssue) => boolean> = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          issues.push({ kind: "console", message: msg.text() });
        }
      });

      page.on("pageerror", (err) => {
        issues.push({ kind: "pageerror", message: err.message });
      });

      page.on("response", (response) => {
        const status = response.status();
        if (status >= 400) {
          issues.push({
            kind: "response",
            message: `${status} ${response.request().method()} ${response.url()}`,
            status,
            url: response.url(),
          });
        }
      });

      await use({
        allow(rule) {
          extraRules.push(rule);
        },
      });

      const unexpected = issues.filter(
        (issue) => !isAllowed(issue) && !extraRules.some((rule) => rule(issue)),
      );
      expect(
        unexpected,
        `Unexpected console errors, page errors, or >=400 responses:\n${unexpected
          .map(formatIssue)
          .join("\n")}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

type SeedKeys = Record<string, string>;

let cachedKeys: SeedKeys | null = null;

function loadSeedKeys(): SeedKeys {
  if (cachedKeys) return cachedKeys;

  const keysPath =
    process.env.ACTOS_SEED_KEYS_FILE || path.join(process.cwd(), ".e2e-real", "keys.json");

  let raw: string;
  try {
    raw = readFileSync(keysPath, "utf-8");
  } catch {
    throw new Error(
      `Could not read seed keys file at ${keysPath}. Run \`pnpm seed:dev\` first ` +
        "(see test/e2e-real/README.md).",
    );
  }

  cachedKeys = JSON.parse(raw) as SeedKeys;
  return cachedKeys;
}

/**
 * Signs the browser context in as `username` by setting the `actos_token`
 * cookie the app reads on the server (see lib/actos.ts), using the API key
 * captured by `pnpm seed:dev` in `.e2e-real/keys.json`.
 */
export async function signIn(context: BrowserContext, username: string): Promise<void> {
  const keys = loadSeedKeys();
  const apiKey = keys[username];
  if (!apiKey) {
    throw new Error(
      `No API key for "${username}" in the seed keys file. Run \`pnpm seed:dev\` first.`,
    );
  }

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3400";

  await context.addCookies([
    {
      name: "actos_token",
      value: apiKey,
      url: baseURL,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
}
