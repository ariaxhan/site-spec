import { z } from "zod";
import { schemaVer } from "../version";
import { copyField } from "../fields";
import { theme } from "./theme";
import { sectionInstance } from "./section";

/**
 * The SiteSpec — the intermediate representation, the artifact, the product.
 * Treated as a public API: assume it must survive for years. (M1)
 *
 * Versioning discipline is locked from day one (D3); the schema *content* stays
 * at MODEL 0 / unstable until a generation probe proves an LLM can hit it (D8).
 */
export const siteSpec = z.object({
  /** checked BEFORE structural validation */
  specVersion: schemaVer,
  /** which pack (+ version) renders this spec — required for determinism over time */
  pack: z.object({
    id: z.string().min(1),
    version: schemaVer,
  }),
  meta: z.object({
    /** BCP-47 language tag */
    lang: z.string().min(2),
    title: copyField,
    description: copyField,
  }),
  /** theme/content separation (D6): theme is editor-mutable independent of content */
  theme,
  /** ordered array, never a map — deterministic output depends on order (D5) */
  sections: z.array(sectionInstance).min(1),
});

export type SiteSpec = z.infer<typeof siteSpec>;
