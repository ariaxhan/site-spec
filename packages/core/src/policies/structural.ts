import { definePolicy } from "../schema/policy";
import type { Finding } from "../schema/policy";

/** SEO: a page needs a non-empty title and meta description. */
export const requiredMetaPolicy = definePolicy({
  meta: {
    id: "seo/required-meta",
    description: "SiteSpec must have a non-empty title and description.",
    severity: "error",
    scope: "spec",
    tier: "spec",
  },
  evaluate({ spec }) {
    const findings: Finding[] = [];
    if (spec.meta.title.value.trim() === "") {
      findings.push({
        policyId: "seo/required-meta",
        severity: "error",
        messageId: "meta.title-empty",
        message: "meta.title is empty.",
        path: "meta.title",
      });
    }
    if (spec.meta.description.value.trim() === "") {
      findings.push({
        policyId: "seo/required-meta",
        severity: "error",
        messageId: "meta.description-empty",
        message: "meta.description is empty.",
        path: "meta.description",
      });
    }
    return findings;
  },
});

/** A11y/SEO: exactly one H1. In this pack the hero owns the single H1. */
export const oneH1Policy = definePolicy({
  meta: {
    id: "a11y/one-h1",
    description: "A page must contain exactly one hero (the single H1).",
    severity: "error",
    scope: "spec",
    tier: "spec",
  },
  evaluate({ spec }) {
    const heroes = spec.sections.filter((s) => s.type === "hero").length;
    if (heroes === 1) return [];
    return [
      {
        policyId: "a11y/one-h1",
        severity: "error",
        messageId: "h1.count",
        message: `Expected exactly one hero section (one H1); found ${heroes}.`,
        path: "sections",
      },
    ];
  },
});
