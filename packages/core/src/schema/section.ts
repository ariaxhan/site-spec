import { z } from "zod";
import type { ZodType, ZodTypeDef } from "zod";
import { schemaVer } from "../version";
import type { SchemaVer } from "../version";
import type { Policy } from "./policy";
import type { RenderContext } from "../render/context";

/** Stable id: `type-slug` + short suffix, minted once, never regenerated. (D6) */
export const stableId = z
  .string()
  .regex(/^[a-z][a-z0-9]*-[a-z0-9]+$/, "id must look like `hero-a3f9`");
export type StableId = z.infer<typeof stableId>;

/**
 * Surface tone of a section — composes the page rhythm (e.g. cream canvas →
 * white card zone → dark feature band) as a per-instance choice instead of a
 * hardcoded layout. The engine maps tones to palette roles; sections never
 * pick colors.
 */
export const sectionTone = z.enum(["canvas", "surface", "band"]);
export type SectionTone = z.infer<typeof sectionTone>;

/**
 * A section instance as it appears inside a SiteSpec. `content` is `unknown`
 * here on purpose: the engine does not know section shapes — the Pack does.
 * `validateSiteSpec` validates each instance's content against its SectionModule.
 */
export const sectionInstance = z.object({
  id: stableId,
  type: z.string().min(1),
  /** sectionVersion — per-section schema version (D3) */
  version: schemaVer,
  /** Surface tone; defaults to "canvas" (the page background). */
  tone: sectionTone.optional(),
  content: z.unknown(),
});
export type SectionInstance = z.infer<typeof sectionInstance>;

/**
 * A SectionModule bundles a section's schema, its render function, and its
 * policies into one self-contained unit. Packs are registries of these.
 *
 * `render` is pure: `(content, ctx) -> string`, and returns the section's
 * INNER markup only — the engine owns the `<section>` shell (anchor id, tone
 * class, content wrapper), so sections compose layouts and can never disagree
 * about structure. No state, no lifecycle, no composition API — the hard line
 * that keeps this from becoming "React with extra steps". (D7)
 */
export interface SectionModule<C> {
  type: string;
  version: SchemaVer;
  /** input is `unknown` so schemas may use defaults (input ≠ output types) */
  content: ZodType<C, ZodTypeDef, unknown>;
  render: (content: C, ctx: RenderContext) => string;
  policies?: Policy[];
  /**
   * Where the section renders: page chrome before <main> ("header"), inside
   * <main> (default), or after it ("footer"). Chrome sections own their
   * semantics (<header>/<footer>/<nav>) so they always set `shell: false`.
   */
  placement?: "header" | "main" | "footer";
  /**
   * `false` → the engine emits the render output raw (no <section> shell, no
   * .wrap). For chrome and full-bleed embeds that own their outer element.
   */
  shell?: boolean;
}

export function defineSection<C>(mod: SectionModule<C>): SectionModule<C> {
  return mod;
}
