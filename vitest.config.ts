import path from "node:path";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    exclude: [...configDefaults.exclude, "**/test/e2e/**", "**/test/e2e-real/**", "**/.next/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
      // `server-only` throws on import unless resolved through the
      // "react-server" bundler condition (which Next.js's real build sets).
      // Vitest doesn't set that condition — and shouldn't, since it would
      // also swap React itself onto its server build — so alias just this
      // one package to its own designated no-op instead, the same way its
      // `exports` map does for a real RSC build.
      "server-only": path.resolve(import.meta.dirname, "./node_modules/server-only/empty.js"),
    },
  },
});
