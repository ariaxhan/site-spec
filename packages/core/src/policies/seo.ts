import { definePolicy } from "../schema/policy";
import type { Finding } from "../schema/policy";

/**
 * The correctness layer, enforced. Spec-tier policies check the Brief has the
 * facts good structured data needs; rendered-tier policies audit the emitted
 * HTML for the SEO/a11y surface. Rendered-tier policies only run when the
 * validator is given the rendered `html` (D4 scheduling).
 */

/** spec-tier: the Brief must carry enough to build a useful LocalBusiness block. */
export const structuredDataReadyPolicy = definePolicy({
  meta: {
    id: "seo/structured-data-ready",
    description: "Brief has the business facts needed for LocalBusiness JSON-LD.",
    severity: "warning",
    scope: "spec",
    tier: "spec",
  },
  evaluate({ brief }) {
    const b = (brief ?? {}) as {
      business?: { name?: string; kind?: string; phone?: string; address?: string };
    };
    const biz = b.business ?? {};
    const findings: Finding[] = [];
    if (!biz.name) {
      findings.push({
        policyId: "seo/structured-data-ready",
        severity: "error",
        messageId: "jsonld.no-name",
        message: "Brief has no business.name, structured data cannot be generated.",
        path: "business.name",
      });
    }
    // A software application legitimately has no phone/address, the thin-contact
    // warning only applies to local businesses.
    if (biz.kind !== "softwareApplication" && !biz.phone && !biz.address) {
      findings.push({
        policyId: "seo/structured-data-ready",
        severity: "warning",
        messageId: "jsonld.no-contact",
        message: "Brief has neither phone nor address, LocalBusiness data will be thin.",
        path: "business",
      });
    }
    return findings;
  },
});

function htmlPolicy(
  id: string,
  description: string,
  needle: string | RegExp,
  messageId: string,
  message: string,
) {
  return definePolicy({
    meta: { id, description, severity: "error", scope: "rendered", tier: "rendered" },
    evaluate({ html }) {
      if (!html) return [];
      const present = typeof needle === "string" ? html.includes(needle) : needle.test(html);
      return present
        ? []
        : [{ policyId: id, severity: "error" as const, messageId, message }];
    },
  });
}

export const jsonLdPresentPolicy = htmlPolicy(
  "seo/json-ld-present",
  "Rendered HTML contains a JSON-LD structured-data block.",
  'application/ld+json',
  "jsonld.missing",
  "No JSON-LD structured data found in the rendered HTML.",
);

export const canonicalPresentPolicy = htmlPolicy(
  "seo/canonical-present",
  "Rendered HTML declares a canonical URL.",
  'rel="canonical"',
  "canonical.missing",
  "No <link rel=\"canonical\"> in the rendered HTML.",
);

/**
 * hreflang is for sites with real language alternates. A single-locale page
 * correctly ships zero hreflang links (a lone self-reference is noise), so the
 * rule is conditional: IF any hreflang alternates exist, the cluster must
 * include x-default; if none exist, the page passes.
 */
export const hreflangPresentPolicy = definePolicy({
  meta: {
    id: "i18n/hreflang-present",
    description: "hreflang alternates, when present, include x-default.",
    severity: "error",
    scope: "rendered",
    tier: "rendered",
  },
  evaluate({ html }) {
    if (!html) return [];
    const hasAlternates = /<link rel="alternate" hreflang=/.test(html);
    if (!hasAlternates || html.includes('hreflang="x-default"')) return [];
    return [
      {
        policyId: "i18n/hreflang-present",
        severity: "error" as const,
        messageId: "hreflang.missing",
        message: "hreflang alternates present but no x-default in the cluster.",
      },
    ];
  },
});

export const ogImageNotRequiredButCardPolicy = htmlPolicy(
  "social/og-card-present",
  "Rendered HTML has Open Graph + Twitter card meta.",
  'property="og:title"',
  "og.missing",
  "No Open Graph card meta in the rendered HTML.",
);

export const skipLinkPolicy = htmlPolicy(
  "a11y/skip-link",
  "Rendered HTML has a skip-to-content link.",
  'class="skip-link"',
  "a11y.skip-link-missing",
  "No skip-to-content link in the rendered HTML.",
);

export const manifestLinkedPolicy = htmlPolicy(
  "pwa/manifest-linked",
  "Rendered HTML links a PWA manifest.",
  'rel="manifest"',
  "pwa.manifest-missing",
  "No <link rel=\"manifest\"> in the rendered HTML.",
);

export const themeColorPolicy = htmlPolicy(
  "pwa/theme-color",
  "Rendered HTML declares a theme-color.",
  'name="theme-color"',
  "pwa.theme-color-missing",
  "No theme-color meta in the rendered HTML.",
);

/**
 * warning, not error: the engine links an apple-touch-icon only when the deploy
 * actually provides one (`site.icons.appleTouch`), a link that 404s is worse
 * than no link. The warning nudges real deploys to ship a proper 180x180 png.
 */
export const appleTouchIconPolicy = definePolicy({
  meta: {
    id: "pwa/apple-touch-icon",
    description: "Rendered HTML declares an apple-touch-icon (provide via site.icons.appleTouch).",
    severity: "warning",
    scope: "rendered",
    tier: "rendered",
  },
  evaluate({ html }) {
    if (!html || html.includes('rel="apple-touch-icon"')) return [];
    return [
      {
        policyId: "pwa/apple-touch-icon",
        severity: "warning" as const,
        messageId: "pwa.apple-touch-missing",
        message:
          "No apple-touch-icon, provide a 180x180 png via site.icons.appleTouch and ship the file.",
      },
    ];
  },
});

/**
 * rendered-tier: the emitted JSON-LD must carry every groundable Brief fact and
 * invent none. This is the loud-failure net against silent drops: an early
 * real-world lead shipped zero opening hours because a time-format
 * mismatch was filtered without a sound. Never again.
 */
export const jsonLdParityPolicy = definePolicy({
  meta: {
    id: "seo/jsonld-parity",
    description:
      "Emitted JSON-LD business node carries the Brief's hours, phone, and address, and invents no priceRange.",
    severity: "error",
    scope: "rendered",
    tier: "rendered",
  },
  evaluate({ brief, html }) {
    if (!html) return [];
    const findings: Finding[] = [];
    const err = (messageId: string, message: string) =>
      findings.push({ policyId: "seo/jsonld-parity", severity: "error", messageId, message });

    const blocks = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ];
    const nodes: Record<string, unknown>[] = [];
    for (const b of blocks) {
      try {
        nodes.push(JSON.parse(b[1]!) as Record<string, unknown>);
      } catch {
        err("jsonld.unparseable", "A JSON-LD block is not valid JSON.");
      }
    }
    const business = nodes.find((n) => {
      const t = n["@type"];
      return t === "LocalBusiness" || t === "Restaurant";
    });
    if (!business) return findings; // jsonLdPresentPolicy covers absence

    const b = (brief ?? {}) as {
      business?: { phone?: string; address?: string; priceRange?: string };
      hours?: { day?: string; open?: string; close?: string; closed?: boolean }[];
    };
    const biz = b.business ?? {};

    if (biz.phone && !business["telephone"]) {
      err("jsonld.phone-dropped", "Brief has a phone but the JSON-LD has no telephone.");
    }
    if (biz.address && !business["address"]) {
      err("jsonld.address-dropped", "Brief has an address but the JSON-LD has no address.");
    }
    if (business["priceRange"] && !biz.priceRange) {
      err(
        "jsonld.pricerange-ungrounded",
        "JSON-LD has a priceRange the Brief does not provide, invented fact.",
      );
    }

    const openDays = (b.hours ?? []).filter((h) => !h.closed && h.open && h.close);
    const spec = business["openingHoursSpecification"];
    const emitted = Array.isArray(spec) ? spec.length : 0;
    if (openDays.length > 0 && emitted < openDays.length) {
      const emittedDays = new Set(
        (Array.isArray(spec) ? spec : []).map((s) =>
          String((s as Record<string, unknown>)["dayOfWeek"] ?? "").replace(
            "https://schema.org/",
            "",
          ),
        ),
      );
      const dropped = openDays.map((h) => h.day).filter((d) => !emittedDays.has(String(d)));
      err(
        "jsonld.hours-dropped",
        `Brief has ${openDays.length} open day(s) but JSON-LD emits ${emitted}, dropped: ${dropped.join(", ") || "(unknown)"}. Likely an unparseable time format.`,
      );
    }
    return findings;
  },
});

export const seoPolicies = [
  structuredDataReadyPolicy,
  jsonLdParityPolicy,
  jsonLdPresentPolicy,
  canonicalPresentPolicy,
  hreflangPresentPolicy,
  ogImageNotRequiredButCardPolicy,
  skipLinkPolicy,
  manifestLinkedPolicy,
  themeColorPolicy,
  appleTouchIconPolicy,
];
