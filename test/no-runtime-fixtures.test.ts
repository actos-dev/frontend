import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard against ROADMAP.md P0-02 regressing: production code (`app/`,
 * `components/`, `lib/`) must never import test fixtures or fabricate
 * content when a backend call fails. See decision 7 in ROADMAP.md §7:
 * "no production fallbacks, ever."
 */

const ROOT = process.cwd();
const SCANNED_DIRS = ["app", "components", "lib"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

// Patterns that must never appear in production source.
const FORBIDDEN_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "MOCK_ constant", pattern: /\bMOCK_[A-Z0-9_]*\b/ },
  { name: "DEMO_ACTOR constant", pattern: /\bDEMO_ACTOR[A-Z0-9_]*\b/ },
  { name: "FALLBACK_TAGS constant", pattern: /\bFALLBACK_TAGS\b/ },
  { name: "'-mock' module import", pattern: /['"][^'"]*-mock['"]/ },
  { name: "import from test/", pattern: /from\s+["']@\/test\// },
];

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(fullPath));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const sourceFiles = SCANNED_DIRS.flatMap((dir) => {
  const abs = path.join(ROOT, dir);
  return fs.existsSync(abs) ? walk(abs) : [];
});

describe("Guard: no runtime fixtures or fabricated fallbacks (ROADMAP.md P0-02)", () => {
  it("scans at least app/, components/ and lib/ source files", () => {
    // A sanity check on the guard itself: if this collapses to near-zero,
    // the walker is broken and every other assertion below is meaningless.
    expect(sourceFiles.length).toBeGreaterThan(50);
  });

  for (const { name, pattern } of FORBIDDEN_PATTERNS) {
    it(`no app/, components/ or lib/ file references ${name}`, () => {
      const offenders = sourceFiles
        .filter((file) => pattern.test(fs.readFileSync(file, "utf-8")))
        .map((file) => path.relative(ROOT, file));

      expect(offenders).toEqual([]);
    });
  }

  it("no app/, components/ or lib/ file imports from the test/ directory", () => {
    const testImportPattern = /from\s+["'](\.\.\/)+test\//;
    const offenders = sourceFiles
      .filter((file) => testImportPattern.test(fs.readFileSync(file, "utf-8")))
      .map((file) => path.relative(ROOT, file));

    expect(offenders).toEqual([]);
  });

  it("lib/*-mock.ts fixture modules no longer exist", () => {
    const libDir = path.join(ROOT, "lib");
    const mockFiles = fs
      .readdirSync(libDir)
      .filter((name) => name.endsWith("-mock.ts"))
      .map((name) => path.join("lib", name));

    expect(mockFiles).toEqual([]);
  });
});

/**
 * Guard against the specific shape of P0-02 route-handler bug: an inner
 * `try { await client.X() } catch { <fake success> }`, nested inside an
 * outer validation `try`, that swallows a real backend error and returns a
 * success-shaped response instead of `apiErrorResponse(error)`.
 *
 * This only flags a `catch` block that is itself nested inside another
 * enclosing `try`, so it does not trip on an intentional single-level catch
 * that normalizes an expected state into 200 (e.g. `GET /api/session`
 * treating a rejected token as "signed out" per P0-07) — that pattern was
 * checked against this exact route and does not nest a `try` inside a
 * `try`.
 */
describe("Guard: no nested try/catch fabricating a fake success (ROADMAP.md P0-02)", () => {
  const routeFiles = (() => {
    const apiDir = path.join(ROOT, "app", "api");
    if (!fs.existsSync(apiDir)) return [];
    const files: string[] = [];
    const stack = [apiDir];
    while (stack.length > 0) {
      const dir = stack.pop();
      if (!dir) continue;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.name === "route.ts") files.push(full);
      }
    }
    return files;
  })();

  /** Returns each `catch { ... }` block's body, tagged with how many
   * enclosing `try` blocks (including its own) surround it. */
  function findCatchBlocksWithDepth(source: string): Array<{ depth: number; body: string }> {
    const results: Array<{ depth: number; body: string }> = [];
    const tryStack: number[] = [];
    let i = 0;

    while (i < source.length) {
      const ch = source[i];

      // Skip over string/template literals so braces inside them are inert.
      if (ch === '"' || ch === "'" || ch === "`") {
        const quote = ch;
        i++;
        while (i < source.length && source[i] !== quote) {
          if (source[i] === "\\") i++;
          i++;
        }
        i++;
        continue;
      }
      if (source.startsWith("//", i)) {
        while (i < source.length && source[i] !== "\n") i++;
        continue;
      }
      if (source.startsWith("/*", i)) {
        const end = source.indexOf("*/", i);
        i = end === -1 ? source.length : end + 2;
        continue;
      }

      if (source.startsWith("try", i) && /[\s{]/.test(source[i + 3] || "")) {
        let j = i + 3;
        while (j < source.length && source[j] !== "{") j++;
        tryStack.push(1);
        i = j + 1;
        continue;
      }

      if (source.startsWith("catch", i) && /[\s(]/.test(source[i + 5] || "")) {
        let j = i + 5;
        while (j < source.length && source[j] !== "{") j++;
        const bodyStart = j + 1;
        let depth = 1;
        let k = bodyStart;
        while (k < source.length && depth > 0) {
          if (source[k] === "{") depth++;
          else if (source[k] === "}") depth--;
          k++;
        }
        results.push({ depth: tryStack.length, body: source.slice(bodyStart, k - 1) });
        tryStack.pop();
        i = k;
        continue;
      }

      i++;
    }

    return results;
  }

  it("scans at least one route.ts file", () => {
    expect(routeFiles.length).toBeGreaterThan(20);
  });

  it("no nested catch block substitutes a fake success instead of calling apiErrorResponse", () => {
    const fakeSuccessShape = /\bok\s*:\s*true\b|status\s*:\s*204\b|status\s*:\s*200\b/;
    const offenders: string[] = [];

    for (const file of routeFiles) {
      const source = fs.readFileSync(file, "utf-8");
      for (const { depth, body } of findCatchBlocksWithDepth(source)) {
        if (depth >= 2 && fakeSuccessShape.test(body) && !/apiErrorResponse\(/.test(body)) {
          offenders.push(path.relative(ROOT, file));
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
