import { z } from "zod";
import type { ZodTypeAny } from "zod";

/**
 * D1 — the single most important type decision in the schema.
 *
 * Content fields are split at the type level into facts and copy:
 *
 *  - FactField  carries a `source` (a dot-path into the Brief). The model fills
 *               it from real business data and NEVER invents it.
 *               `factsGroundedPolicy` deterministically checks value === brief[source].
 *  - CopyField  is acknowledged creative output (taglines, intros). The grounding
 *               policy never runs on it; a separate, non-deterministic
 *               `copyQualityPolicy` handles it.
 *
 * This makes "the model never invents facts" mechanically enforceable instead of
 * a slogan.
 */
export function factField<T extends ZodTypeAny>(value: T) {
  return z.object({
    kind: z.literal("fact"),
    value,
    /** dot-path into the Brief this value was sourced from, e.g. "business.name" */
    source: z.string().min(1),
  });
}

export interface FactField<T> {
  kind: "fact";
  value: T;
  source: string;
}

export const copyField = z.object({
  kind: z.literal("copy"),
  value: z.string(),
  /** D6 — when true, regeneration patches that touch this field are rejected. */
  locked: z.boolean().optional(),
});

export type CopyField = z.infer<typeof copyField>;

/** Hand-authoring constructors (used by fixtures and the future generator). */
export const fact = <T>(value: T, source: string): FactField<T> => ({
  kind: "fact",
  value,
  source,
});

export const copy = (value: string, locked?: boolean): CopyField =>
  locked === undefined ? { kind: "copy", value } : { kind: "copy", value, locked };
