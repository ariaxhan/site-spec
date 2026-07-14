import { z } from "zod";
import type { SiteSpec } from "./site-spec";
import type { Pack } from "./pack";

export const severity = z.enum(["error", "warning", "info"]);
export type Severity = z.infer<typeof severity>;

/**
 * D4 — scheduling metadata. The runner stays domain-agnostic; these two fields
 * are how it knows WHEN to call a policy, not domain knowledge leaking in.
 */
export const policyScope = z.enum(["section", "spec", "rendered"]);
export type PolicyScope = z.infer<typeof policyScope>;

export const policyTier = z.enum(["spec", "rendered", "live"]);
export type PolicyTier = z.infer<typeof policyTier>;

export interface PolicyMeta {
  /** namespaced id, e.g. "seo/required-meta-title" */
  id: string;
  description: string;
  severity: Severity;
  scope: PolicyScope;
  tier: PolicyTier;
}

export const finding = z.object({
  policyId: z.string(),
  severity,
  message: z.string(),
  /** stable id for i18n / dedupe of the human message */
  messageId: z.string().optional(),
  /** dot-path to the offending node */
  path: z.string().optional(),
});
export type Finding = z.infer<typeof finding>;

/** Everything that validates a spec is a Policy. The validator just runs them. */
export interface PolicyContext {
  spec: SiteSpec;
  pack: Pack;
  /** the Brief the spec was built from — needed by grounding policies */
  brief: unknown;
  /** the rendered HTML — present only for `tier: "rendered"` policies (D4) */
  html?: string;
}

export interface Policy {
  meta: PolicyMeta;
  evaluate(ctx: PolicyContext): Finding[];
}

export function definePolicy(p: Policy): Policy {
  return p;
}
