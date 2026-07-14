import { siteSpec } from "../schema/site-spec";
import type { Pack } from "../schema/pack";
import type { Policy, Finding } from "../schema/policy";
import type { ValidationResult } from "../schema/validation-result";
import { defaultPolicies } from "../policies";

export interface ValidateInput {
  /** unknown on purpose — validation is the gate that proves it's a SiteSpec */
  spec: unknown;
  pack: Pack;
  /** the Brief, for grounding policies. Defaults to {} (all facts will fail). */
  brief?: unknown;
  /** rendered HTML — enables `tier: "rendered"` policies (SEO/a11y audit) */
  html?: string;
  /** override the policy set; defaults to the baseline offline policies */
  policies?: Policy[];
}

/**
 * The validator knows nothing about SEO, a11y, or security — it runs policies.
 * Order: SchemaVer + structural (zod) -> per-section content (against the pack)
 * -> policies. `live`-tier policies (network/LLM) are skipped offline.
 */
export function validateSiteSpec(input: ValidateInput): ValidationResult {
  const findings: Finding[] = [];

  // 1. structural — specVersion + shape
  const parsed = siteSpec.safeParse(input.spec);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      findings.push({
        policyId: "schema/structural",
        severity: "error",
        message: issue.message,
        path: issue.path.join("."),
      });
    }
    return { ok: false, findings };
  }
  const spec = parsed.data;

  // 2. per-section content — the engine defers section shapes to the pack
  spec.sections.forEach((instance, i) => {
    const mod = input.pack.sections[instance.type];
    if (!mod) {
      findings.push({
        policyId: "schema/unknown-section",
        severity: "error",
        message: `Unknown section type "${instance.type}" — not registered in pack "${input.pack.id}".`,
        path: `sections.${i}.type`,
      });
      return;
    }
    const res = mod.content.safeParse(instance.content);
    if (!res.success) {
      for (const issue of res.error.issues) {
        findings.push({
          policyId: "schema/section-content",
          severity: "error",
          message: `${instance.type}: ${issue.message}`,
          path: `sections.${i}.content.${issue.path.join(".")}`,
        });
      }
    }
  });

  // 3. policies — only when structure + content are clean (they assume a valid spec)
  if (!findings.some((f) => f.severity === "error")) {
    const policies = input.policies ?? defaultPolicies;
    for (const policy of policies) {
      if (policy.meta.tier === "live") continue; // network/LLM phase, not offline
      if (policy.meta.tier === "rendered" && input.html === undefined) continue; // needs HTML
      findings.push(
        ...policy.evaluate({
          spec,
          pack: input.pack,
          brief: input.brief ?? {},
          ...(input.html !== undefined ? { html: input.html } : {}),
        }),
      );
    }
  }

  return { ok: !findings.some((f) => f.severity === "error"), findings };
}
