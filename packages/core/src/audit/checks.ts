/**
 * The check catalog: every `checkId` the audit engine can emit, with a
 * one-line description and whether `fixFiles` can repair it.
 *
 * This is a DESCRIPTION of the engine, not a second source of truth. The
 * catalog is gated by `test/checks.test.ts`, which scrapes the real check ids
 * out of `audit.ts` and the real repairable ids out of `fix.ts` and fails on
 * any drift in either direction. Add a check to the engine without adding it
 * here (or vice versa) and the suite goes red.
 *
 * Pure data. No imports, no I/O.
 */

export type CheckCategory =
  | "structure"
  | "seo"
  | "ai-searchability"
  | "structured-data"
  | "accessibility"
  | "performance"
  | "privacy"
  | "security";

export interface CheckDescriptor {
  /** the id that appears on every AuditFinding this check produces */
  id: string;
  /** what the check looks for, one line */
  description: string;
  /** broad grouping, for grouping output; not used by the engine */
  category: CheckCategory;
  /**
   * true when `fixFiles` has a repair path for this id (it may still choose
   * `scaffolded` over `fixed` when the repair needs real business facts).
   */
  fixable: boolean;
}

export const CHECK_CATALOG: readonly CheckDescriptor[] = [
  // ---- structure ----------------------------------------------------------
  {
    id: "audit/no-pages",
    description: "No .html files were found, so there is nothing to audit.",
    category: "structure",
    fixable: false,
  },
  {
    id: "audit/empty-body",
    description: "A page's <body> is effectively empty, so the URL renders nothing.",
    category: "structure",
    fixable: false,
  },
  {
    id: "audit/404-missing",
    description: "No 404.html, so broken URLs fall through to the host's default error page.",
    category: "structure",
    fixable: false,
  },
  {
    id: "audit/dangling-ref",
    description: "A page references an asset that is not present in the output.",
    category: "structure",
    fixable: false,
  },
  {
    id: "audit/broken-link",
    description: "An internal link points at a page that does not exist in the output.",
    category: "structure",
    fixable: false,
  },
  {
    id: "audit/foundation-invalid",
    description: "foundation.json is present but is not a valid foundation manifest.",
    category: "structure",
    fixable: false,
  },

  // ---- seo ----------------------------------------------------------------
  {
    id: "audit/title-missing",
    description: "A page has no <title>.",
    category: "seo",
    fixable: true,
  },
  {
    id: "audit/description-missing",
    description: "A page has no meta description.",
    category: "seo",
    fixable: true,
  },
  {
    id: "audit/canonical-missing",
    description: "A page has no canonical URL, leaving duplicate-content ambiguity.",
    category: "seo",
    fixable: true,
  },
  {
    id: "audit/noindex",
    description: "A page or the whole site is noindexed, hiding it from search.",
    category: "seo",
    fixable: true,
  },
  {
    id: "audit/og-missing",
    description: "A page has no Open Graph card, so shared links unfurl as bare URLs.",
    category: "seo",
    fixable: true,
  },
  {
    id: "audit/twitter-card-no-image",
    description: "twitter:card claims summary_large_image but no image is declared.",
    category: "seo",
    fixable: true,
  },
  {
    id: "audit/h1-count",
    description: "A page has zero or multiple <h1> elements (exactly one is wanted).",
    category: "seo",
    fixable: false,
  },
  {
    id: "audit/sitemap-missing",
    description: "No sitemap.xml.",
    category: "seo",
    fixable: true,
  },
  {
    id: "audit/sitemap-page-missing",
    description: "The sitemap lists a URL that does not exist in the output.",
    category: "seo",
    fixable: false,
  },
  {
    id: "audit/robots-missing",
    description: "No robots.txt, so the site ships no explicit crawl policy.",
    category: "seo",
    fixable: true,
  },

  // ---- ai searchability ---------------------------------------------------
  {
    id: "audit/robots-stale-token",
    description: "robots.txt names a retired crawler token that no longer matches any bot.",
    category: "ai-searchability",
    fixable: true,
  },
  {
    id: "audit/robots-blocks-ai-search",
    description:
      "robots.txt blocks an AI search/user-fetch agent, removing the site from the answers its visitors read.",
    category: "ai-searchability",
    fixable: true,
  },
  {
    id: "audit/llms-missing",
    description: "No llms.txt, so AI agents get no machine-readable summary of the site.",
    category: "ai-searchability",
    fixable: true,
  },

  // ---- structured data ----------------------------------------------------
  {
    id: "audit/jsonld-missing",
    description: "A page carries no JSON-LD structured data.",
    category: "structured-data",
    fixable: true,
  },
  {
    id: "audit/jsonld-invalid",
    description: "A JSON-LD block is not valid JSON, so crawlers drop the whole block.",
    category: "structured-data",
    fixable: false,
  },
  {
    id: "audit/jsonld-self-serving-rating",
    description: "JSON-LD declares an aggregateRating the site awarded itself.",
    category: "structured-data",
    fixable: true,
  },
  {
    id: "audit/claims-parity",
    description: "A JSON-LD claim is not traceable to a fact in the Brief.",
    category: "structured-data",
    fixable: false,
  },

  // ---- accessibility ------------------------------------------------------
  {
    id: "audit/img-alt-missing",
    description: "An <img> has no alt attribute at all (empty alt is fine for decorative images).",
    category: "accessibility",
    fixable: false,
  },
  {
    id: "audit/viewport-lock",
    description: "The viewport meta blocks zooming (user-scalable=no or a capped maximum-scale).",
    category: "accessibility",
    fixable: true,
  },
  {
    id: "audit/form-untyped",
    description: "A form control has no usable type or label association.",
    category: "accessibility",
    fixable: false,
  },

  // ---- performance --------------------------------------------------------
  {
    id: "audit/img-dims-missing",
    description: "An <img> has no width/height, which causes layout shift.",
    category: "performance",
    fixable: false,
  },
  {
    id: "audit/lcp-image-lazy",
    description: "The likely LCP image is lazy-loaded, delaying the largest paint.",
    category: "performance",
    fixable: false,
  },
  {
    id: "audit/cache-policy-missing",
    description: "_headers declares no Cache-Control rules, leaving caching to platform defaults.",
    category: "performance",
    fixable: true,
  },

  // ---- privacy ------------------------------------------------------------
  {
    id: "audit/tracker-detected",
    description: "A known analytics/tracker signature is present on the site.",
    category: "privacy",
    fixable: false,
  },
  {
    id: "audit/tracker-undeclared",
    description: "A detected tracker contradicts what foundation.json declares.",
    category: "privacy",
    fixable: false,
  },
  {
    id: "audit/cookie-detected",
    description: "Scripts write document.cookie.",
    category: "privacy",
    fixable: false,
  },
  {
    id: "audit/cookie-undeclared",
    description: "Scripts write document.cookie but foundation.json declares zero cookies.",
    category: "privacy",
    fixable: false,
  },
  {
    id: "audit/google-fonts-cdn",
    description: "Fonts load from the Google Fonts CDN, leaking visitor IPs (a GDPR problem).",
    category: "privacy",
    fixable: false,
  },

  // ---- security -----------------------------------------------------------
  {
    id: "audit/headers-missing",
    description: "No _headers file, so no security headers or cache policy at the edge.",
    category: "security",
    fixable: false,
  },
  {
    id: "audit/headers-stale",
    description: "A response header names dead config (interest-cohort, X-Xss-Protection).",
    category: "security",
    fixable: true,
  },
  {
    id: "audit/hsts-preload",
    description: "Strict-Transport-Security carries the preload token, which takes months to unwind.",
    category: "security",
    fixable: true,
  },
  {
    id: "audit/csp-report-only-theater",
    description: "CSP is Report-Only with no reporting endpoint: it enforces nothing and reports to nobody.",
    category: "security",
    fixable: false,
  },
  {
    id: "audit/mixed-content",
    description: "A page loads a subresource over plain http.",
    category: "security",
    fixable: false,
  },
  {
    id: "audit/inline-handler",
    description: "A page uses an inline event handler, which blocks any future CSP.",
    category: "security",
    fixable: false,
  },
];

/** Look up one check descriptor by id. */
export function getCheck(id: string): CheckDescriptor | undefined {
  return CHECK_CATALOG.find((c) => c.id === id);
}

/** Every check id the engine can emit, sorted. */
export const CHECK_IDS: readonly string[] = CHECK_CATALOG.map((c) => c.id).sort();
