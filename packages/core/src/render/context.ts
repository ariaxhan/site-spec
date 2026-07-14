import type { Theme } from "../schema/theme";
import type { AssetManifest } from "../schema/asset";

/**
 * D5 — RenderContext is immutable. Primitives receive it and read from it; no
 * mutable counters, no ambient state. Determinism is structural: nothing here
 * reaches `Date.now()`, `Math.random()`, `process.env`, the filesystem, or the
 * network. Anything time-dependent must be passed in explicitly.
 */
export interface RenderContext {
  readonly theme: Theme;
  readonly manifest: AssetManifest;
  readonly lang: string;
}

export function createRenderContext(input: RenderContext): Readonly<RenderContext> {
  return Object.freeze({
    theme: input.theme,
    manifest: input.manifest,
    lang: input.lang,
  });
}
