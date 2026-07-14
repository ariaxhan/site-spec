import { z } from "zod";

/**
 * The Brief is the compiler's source code: the real, verified business data a
 * SiteSpec is built from. Every FactField in a spec must trace back to a path
 * here. Kept permissive (passthrough) so packs can source arbitrary facts, with
 * a small known core every vertical relies on.
 */
export const briefHours = z.object({
  day: z.string(),
  open: z.string().optional(),
  close: z.string().optional(),
  closed: z.boolean().optional(),
});

export const briefReview = z.object({
  author: z.string(),
  rating: z.number().min(0).max(5),
  text: z.string(),
  source: z.string(),
});

export const brief = z
  .object({
    business: z
      .object({
        name: z.string().min(1),
        category: z.string().min(1),
        /**
         * What the primary entity IS — picks the schema.org structured-data
         * shape. "localBusiness" (default) → LocalBusiness/Restaurant with
         * hours/address; "softwareApplication" → a product/app (no storefront
         * facts), e.g. a landing page. Absent = localBusiness (back-compat).
         */
        kind: z.enum(["localBusiness", "softwareApplication"]).optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        /**
         * ISO 3166-1 alpha-2 country for the postal address ("US", "KR").
         * Emitted as schema.org addressCountry only when declared here; the
         * compiler never assumes a country.
         */
        country: z.string().length(2).optional(),
        /** schema.org priceRange ("$"–"$$$$"). Only emitted when sourced here. */
        priceRange: z
          .string()
          .regex(/^\${1,4}$/, "priceRange must be $ to $$$$")
          .optional(),
      })
      .passthrough(),
    hours: z.array(briefHours).optional(),
    reviews: z.array(briefReview).optional(),
    /** product/app facts (kind: softwareApplication). Sourced or absent. */
    platforms: z.array(z.string()).optional(),
    /** one of Google's enumerated applicationCategory values, if claimed */
    appCategory: z.string().optional(),
    /** "free" is a grounded claim too; paid products declare price+currency */
    pricing: z
      .union([
        z.literal("free"),
        z.object({ price: z.string(), currency: z.string() }),
      ])
      .optional(),
  })
  .passthrough();

export type Brief = z.infer<typeof brief>;

/** Resolve a dot-path (FactField.source) against a Brief. Returns undefined if absent. */
export function getByPath(root: unknown, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = root;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    const key = /^\d+$/.test(seg) ? Number(seg) : seg;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}
