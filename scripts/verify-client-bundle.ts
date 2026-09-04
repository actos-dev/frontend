import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface ScanViolation {
  file: string;
  line: number;
  pattern: string;
  snippet: string;
}

export interface ScanResult {
  clean: boolean;
  scannedFiles: number;
  totalBytes: number;
  violations: ScanViolation[];
}

/**
 * Sensitive patterns that must NEVER appear in client bundles (.next/static).
 * Adheres to Plan §Faz 18: "Anahtarın istemci paketinde görünmediği testi (build çıktısında arama)."
 */
export const FORBIDDEN_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: "ACTOS_API_KEY (Server API key env reference)",
    regex: /\bACTOS_API_KEY\b/g,
  },
  {
    name: "ACTOS_ADMIN_TOKEN (Server admin token env)",
    regex: /\bACTOS_ADMIN_TOKEN\b/g,
  },
  {
    name: "ACTOS_TOKEN_SECRET (Internal server token secret)",
    regex: /\bACTOS_TOKEN_SECRET\b/g,
  },
  {
    name: "SESSION_SECRET (Internal session encryption secret)",
    regex: /\bSESSION_SECRET\b/g,
  },
  {
    name: "DATABASE_URL (Server database connection string)",
    regex: /\bDATABASE_URL\b/g,
  },
  {
    name: "POSTGRES_PASSWORD (Database credential)",
    regex: /\bPOSTGRES_PASSWORD\b/g,
  },
  {
    name: "MINIO_SECRET_KEY (Object storage secret)",
    regex: /\bMINIO_SECRET_KEY\b/g,
  },
  {
    name: "Hardcoded API Key / Secret Token pattern",
    regex: /\b(?:actos_[a-zA-Z0-9_-]{24,}|ak_[a-zA-Z0-9_-]{24,}|sk_[a-zA-Z0-9_-]{24,})\b/g,
  },
  {
    name: "Private Key PEM header",
    regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g,
  },
  {
    name: "ACTOS_TOKEN_COOKIE identifier leak",
    regex: /\bACTOS_TOKEN_COOKIE\b/g,
  },
];

/**
 * Recursively retrieves all .js and .mjs files within a directory.
 */
function getFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".mjs"))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Scans a target directory (defaults to .next/static) for client bundle leaks.
 */
export function scanClientBundle(targetDir?: string): ScanResult {
  const dirToScan = targetDir || path.resolve(process.cwd(), ".next/static");

  if (!fs.existsSync(dirToScan)) {
    throw new Error(
      `Target directory "${dirToScan}" does not exist. Please run "pnpm build" before running bundle audit.`,
    );
  }

  const files = getFilesRecursively(dirToScan);
  const violations: ScanViolation[] = [];
  let totalBytes = 0;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8");
    totalBytes += Buffer.byteLength(content, "utf-8");

    const lines = content.split("\n");

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const rule of FORBIDDEN_PATTERNS) {
        // Reset lastIndex for global regex
        rule.regex.lastIndex = 0;
        const match = rule.regex.exec(line);
        if (match) {
          const matchIndex = match.index;
          const snippetStart = Math.max(0, matchIndex - 30);
          const snippetEnd = Math.min(line.length, matchIndex + match[0].length + 30);
          const snippet = line.substring(snippetStart, snippetEnd).trim();

          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: lineIndex + 1,
            pattern: rule.name,
            snippet: `...${snippet}...`,
          });
        }
      }
    }
  }

  return {
    clean: violations.length === 0,
    scannedFiles: files.length,
    totalBytes,
    violations,
  };
}

/**
 * CLI execution entry point
 */
function main() {
  const targetDir = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.resolve(process.cwd(), ".next/static");

  console.log("🔒 Actos İstemci Paketi Güvenlik Taraması (Secret Leak Scan)");
  console.log(`📁 Hedef Dizin: ${targetDir}`);

  try {
    const result = scanClientBundle(targetDir);
    const sizeMb = (result.totalBytes / (1024 * 1024)).toFixed(2);

    console.log(`📊 Tarandı: ${result.scannedFiles} dosya, ${sizeMb} MB istemci JavaScript paketi`);

    if (result.clean) {
      console.log(
        "✅ BAŞARILI: İstemci paketinde hiçbir gizli anahtar veya sunucu sırrı bulunamadı.",
      );
      process.exit(0);
    } else {
      console.error(
        `❌ GÜVENLİK İHLALİ: İstemci paketinde ${result.violations.length} şüpheli sır tespit edildi!`,
      );
      for (const v of result.violations) {
        console.error(`  - [${v.pattern}] ${v.file}:${v.line}`);
        console.error(`    ${v.snippet}`);
      }
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error(`❌ Hata: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// Run if called directly via CLI
if (
  process.argv[1] &&
  (process.argv[1].endsWith("verify-client-bundle.ts") ||
    pathToFileURL(process.argv[1]).href === import.meta.url)
) {
  main();
}
