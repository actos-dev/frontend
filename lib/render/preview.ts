import { enrichPreviewHtml } from "./enrich-html";
import { stripInvisibleAndBidi } from "./text-sanitize";

type ActosRenderer = typeof import("markstone").actos;

/**
 * The browser export resolves to Markstone's WASM build. Initialization and
 * module loading are shared across every editor on the page, while the
 * renderer remains lazy until someone opens a Preview tab.
 */
let rendererPromise: Promise<ActosRenderer> | null = null;

async function getRenderer(): Promise<ActosRenderer> {
  if (!rendererPromise) {
    rendererPromise = import("markstone")
      .then(async (module) => {
        const browserModule = module as typeof module & {
          init?: () => Promise<unknown>;
        };
        // The browser conditional export exposes WASM initialization. Tests
        // and other Node consumers resolve the native export, which is ready
        // immediately and intentionally has no `init` function.
        await browserModule.init?.();
        return module.actos;
      })
      .catch((error) => {
        rendererPromise = null;
        throw error;
      });
  }
  return rendererPromise;
}

export async function renderPreview(markdown: string): Promise<string> {
  if (!markdown?.trim()) return "";

  const cleaned = stripInvisibleAndBidi(markdown);
  const renderer = await getRenderer();
  return enrichPreviewHtml(renderer.toHtml(cleaned));
}
