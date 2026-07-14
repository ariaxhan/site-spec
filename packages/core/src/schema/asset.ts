import { z } from "zod";

/**
 * A reference to an asset by stable id. Resolved at render time against the
 * manifest — never a URL or filesystem path in the spec. (D5: render takes a
 * fully materialized spec; `ui.image` resolves only against the manifest.)
 */
export const assetRef = z.string().min(1);
export type AssetRef = z.infer<typeof assetRef>;

/**
 * Asset location: an absolute http(s) URL, or a site-relative path (no scheme,
 * no `..` traversal — the colon-free pattern makes `javascript:` impossible).
 */
const assetUrl = z.union([
  z.string().url().regex(/^https?:\/\//, "only http(s) URLs"),
  z.string().regex(/^\/?[a-zA-Z0-9][a-zA-Z0-9._/-]*$/, "relative asset path"),
]);

/** A fully materialized asset. The manifest maps ids to these before render. */
export const resolvedAsset = z.object({
  id: z.string().min(1),
  url: assetUrl,
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  /** licensing / provenance — long-term consideration #7 */
  license: z.string().optional(),
});
export type ResolvedAsset = z.infer<typeof resolvedAsset>;

export const assetManifest = z.record(z.string(), resolvedAsset);
export type AssetManifest = z.infer<typeof assetManifest>;
