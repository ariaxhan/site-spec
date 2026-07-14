import { definePolicy } from "../schema/policy";
import type { Finding } from "../schema/policy";
import { getByPath } from "../schema/brief";

/** Structural shape of a FactField at runtime, regardless of T. */
function isFactNode(node: unknown): node is { kind: "fact"; value: unknown; source: string } {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as { kind?: unknown }).kind === "fact" &&
    typeof (node as { source?: unknown }).source === "string"
  );
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a === null || b === null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function* walkFacts(
  node: unknown,
  path: string,
): Iterable<{ path: string; value: unknown; source: string }> {
  if (isFactNode(node)) {
    yield { path, value: node.value, source: node.source };
    return; // a fact's value is a leaf for grounding purposes
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      yield* walkFacts(node[i], `${path}[${i}]`);
    }
    return;
  }
  if (typeof node === "object" && node !== null) {
    for (const [key, value] of Object.entries(node)) {
      yield* walkFacts(value, path ? `${path}.${key}` : key);
    }
  }
}

/**
 * D1 — every FactField value must trace to its Brief `source`. Runs ONLY on fact
 * fields (copy is never checked here). This is what makes "the model never
 * invents facts" mechanically true.
 */
export const factsGroundedPolicy = definePolicy({
  meta: {
    id: "grounding/facts-grounded",
    description: "Every FactField value must match the Brief path it cites.",
    severity: "error",
    scope: "spec",
    tier: "spec",
  },
  evaluate({ spec, brief }) {
    const findings: Finding[] = [];
    spec.sections.forEach((section, i) => {
      for (const fact of walkFacts(section.content, `sections[${i}].content`)) {
        const briefValue = getByPath(brief, fact.source);
        if (briefValue === undefined) {
          findings.push({
            policyId: "grounding/facts-grounded",
            severity: "error",
            messageId: "fact.source-missing",
            message: `Fact at ${fact.path} cites Brief path "${fact.source}" which does not exist.`,
            path: fact.path,
          });
        } else if (!deepEqual(briefValue, fact.value)) {
          findings.push({
            policyId: "grounding/facts-grounded",
            severity: "error",
            messageId: "fact.value-mismatch",
            message: `Fact at ${fact.path} does not match Brief "${fact.source}" (possible invention).`,
            path: fact.path,
          });
        }
      }
    });
    return findings;
  },
});
