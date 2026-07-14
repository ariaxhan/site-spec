import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { auditFiles } from "../src/audit/audit";
import { buildSite } from "../src/build/build-site";
import { restaurantPack } from "../src/packs/restaurant";
import { demoSpec, demoBrief, demoSite } from "./fixtures/restaurant";
import { cateringBrief } from "./fixtures/catering";

const TEXT_EXT = /\.(html|css|js|mjs|json|txt|xml|svg|md|webmanifest)$/i;
const TEXT_NAMES = new Set(["_headers", "_redirects"]);

/** Read a directory into the audit file map (text by extension, binary = null). */
function readSiteDir(dir: string): Record<string, string | null> {
  const root = resolve(process.cwd(), dir);
  const files: Record<string, string | null> = {};
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      const rel = relative(root, full).split("\\").join("/");
      const isText = TEXT_EXT.test(name) || TEXT_NAMES.has(name);
      files[rel] = isText ? readFileSync(full, "utf8") : null;
    }
  };
  walk(root);
  return files;
}

describe("audit: the slop fixture fails loudly", () => {
  const files = readSiteDir("packages/core/test/fixtures/slop-site");
  const report = auditFiles({ files });

  it("fails with a rich, named finding set (≥15 distinct checks)", () => {
    expect(report.ok).toBe(false);
    const ids = new Set(report.findings.map((f) => f.checkId));
    const expected = [
      "audit/title-missing",
      "audit/description-missing",
      "audit/canonical-missing",
      "audit/jsonld-missing",
      "audit/og-missing",
      "audit/noindex",
      "audit/h1-count",
      "audit/img-alt-missing",
      "audit/img-dims-missing",
      "audit/mixed-content",
      "audit/inline-handler",
      "audit/dangling-ref",
      "audit/broken-link",
      "audit/form-untyped",
      "audit/cookie-undeclared",
      "audit/tracker-undeclared",
      "audit/sitemap-missing",
      "audit/robots-missing",
      "audit/llms-missing",
      "audit/404-missing",
      "audit/headers-missing",
    ];
    for (const id of expected) {
      expect(ids, `expected finding ${id}`).toContain(id);
    }
    expect(ids.size).toBeGreaterThanOrEqual(15);
  });

  it("is generic mode (no foundation.json) and every finding names its check", () => {
    expect(report.mode).toBe("generic");
    for (const f of report.findings) {
      expect(f.checkId).toMatch(/^audit\//);
      expect(f.message.length).toBeGreaterThan(10);
    }
  });
});

describe("audit: site-spec's own output passes (dogfood gate)", () => {
  const SITES: Array<{ dir: string; facts?: unknown }> = [
    { dir: "examples/restaurant-site", facts: demoBrief },
    { dir: "examples/catering-site", facts: cateringBrief },
  ];

  for (const site of SITES) {
    it(`${site.dir} audits clean (strict mode, zero errors)`, () => {
      const files = readSiteDir(site.dir);
      const report = auditFiles({ files, facts: site.facts });
      const errors = report.findings.filter((f) => f.severity === "error");
      expect(report.mode).toBe("strict");
      expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
      expect(report.ok).toBe(true);
    });
  }

  it("fresh in-memory buildSite output audits clean too", () => {
    const files = buildSite({
      spec: demoSpec,
      pack: restaurantPack,
      brief: demoBrief,
      site: demoSite,
    });
    const report = auditFiles({ files, facts: demoBrief });
    const errors = report.findings.filter((f) => f.severity === "error");
    expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Policy-hardening checks: every check fires on the exact bad shape (positive)
// and stays quiet on the legitimate neighbor of that shape (negative). Tests
// assert exact checkIds, so unrelated ambient findings never affect them.
// ---------------------------------------------------------------------------

/** Minimal valid-enough page; head/body extras carry the shape under test. */
const page = (head = "", body = "<h1>ok</h1>") =>
  `<!doctype html><html lang="en"><head><title>t</title>${head}</head><body>${body}</body></html>`;

const idsOf = (files: Record<string, string | null>) =>
  auditFiles({ files }).findings.map((f) => f.checkId);

const findingsFor = (files: Record<string, string | null>, checkId: string) =>
  auditFiles({ files }).findings.filter((f) => f.checkId === checkId);

describe("audit/robots-stale-token", () => {
  it("fires once per deprecated Anthropic token", () => {
    const files = {
      "index.html": page(),
      "robots.txt": "User-agent: anthropic-ai\nDisallow: /\n\nUser-agent: Claude-Web\nDisallow: /\n",
    };
    const hits = findingsFor(files, "audit/robots-stale-token");
    expect(hits).toHaveLength(2);
    expect(hits[0]!.file).toBe("robots.txt");
  });

  it("does not fire on the current crawler token set", () => {
    const files = {
      "index.html": page(),
      "robots.txt":
        "User-agent: ClaudeBot\nDisallow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: *\nAllow: /\n",
    };
    expect(idsOf(files)).not.toContain("audit/robots-stale-token");
  });
});

describe("audit/robots-blocks-ai-search", () => {
  it("fires when an AI search/user-fetch agent is fully blocked", () => {
    const files = {
      "index.html": page(),
      "robots.txt": "User-agent: OAI-SearchBot\nDisallow: /\n\nUser-agent: Claude-User\nDisallow: /\n",
    };
    expect(findingsFor(files, "audit/robots-blocks-ai-search")).toHaveLength(2);
  });

  it("does not fire when only training crawlers are blocked", () => {
    const files = {
      "index.html": page(),
      "robots.txt": "User-agent: GPTBot\nDisallow: /\n\nUser-agent: CCBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n",
    };
    expect(idsOf(files)).not.toContain("audit/robots-blocks-ai-search");
  });

  it("does not fire on a partial disallow for a search agent", () => {
    const files = {
      "index.html": page(),
      "robots.txt": "User-agent: PerplexityBot\nDisallow: /admin/\n",
    };
    expect(idsOf(files)).not.toContain("audit/robots-blocks-ai-search");
  });
});

describe("audit/headers-stale", () => {
  it("fires on interest-cohort (dead FLoC config)", () => {
    const files = {
      "index.html": page(),
      "_headers": "/*\n  Permissions-Policy: interest-cohort=()\n  Cache-Control: max-age=0\n",
    };
    expect(findingsFor(files, "audit/headers-stale")).toHaveLength(1);
  });

  it("fires on X-XSS-Protection: 1", () => {
    const files = {
      "index.html": page(),
      "_headers": "/*\n  X-XSS-Protection: 1; mode=block\n  Cache-Control: max-age=0\n",
    };
    expect(findingsFor(files, "audit/headers-stale")).toHaveLength(1);
  });

  it("does not fire on a modern header set (X-XSS-Protection: 0)", () => {
    const files = {
      "index.html": page(),
      "_headers":
        "/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  X-XSS-Protection: 0\n  Permissions-Policy: camera=(), microphone=()\n  Cache-Control: max-age=0, must-revalidate\n",
    };
    expect(idsOf(files)).not.toContain("audit/headers-stale");
  });
});

describe("audit/csp-report-only-theater", () => {
  it("fires on Report-Only CSP with no reporting endpoint", () => {
    const files = {
      "index.html": page(),
      "_headers": "/*\n  Content-Security-Policy-Report-Only: default-src 'self'\n  Cache-Control: max-age=0\n",
    };
    expect(idsOf(files)).toContain("audit/csp-report-only-theater");
  });

  it("does not fire on Report-Only CSP that wires report-uri", () => {
    const files = {
      "index.html": page(),
      "_headers":
        "/*\n  Content-Security-Policy-Report-Only: default-src 'self'; report-uri https://example.report-uri.com/r/d/csp\n  Cache-Control: max-age=0\n",
    };
    expect(idsOf(files)).not.toContain("audit/csp-report-only-theater");
  });

  it("does not fire on an enforced CSP", () => {
    const files = {
      "index.html": page(),
      "_headers": "/*\n  Content-Security-Policy: default-src 'self'\n  Cache-Control: max-age=0\n",
    };
    expect(idsOf(files)).not.toContain("audit/csp-report-only-theater");
  });
});

describe("audit/hsts-preload", () => {
  it("fires when HSTS carries preload", () => {
    const files = {
      "index.html": page(),
      "_headers": "/*\n  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload\n  Cache-Control: max-age=0\n",
    };
    expect(idsOf(files)).toContain("audit/hsts-preload");
  });

  it("does not fire on max-age-only HSTS, even with rel=preload on another line", () => {
    const files = {
      "index.html": page(),
      "_headers":
        "/*\n  Strict-Transport-Security: max-age=31536000; includeSubDomains\n  Link: </fonts/body.woff2>; rel=preload; as=font\n  Cache-Control: max-age=0\n",
    };
    expect(idsOf(files)).not.toContain("audit/hsts-preload");
  });
});

describe("audit/viewport-lock", () => {
  it("fires (as error) on user-scalable=no", () => {
    const files = {
      "index.html": page(`<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">`),
    };
    const hits = findingsFor(files, "audit/viewport-lock");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.severity).toBe("error");
  });

  it("fires on maximum-scale=1 (and 1.0)", () => {
    for (const v of ["maximum-scale=1", "maximum-scale=1.0"]) {
      const files = {
        "index.html": page(`<meta name="viewport" content="width=device-width, initial-scale=1, ${v}">`),
      };
      expect(idsOf(files), v).toContain("audit/viewport-lock");
    }
  });

  it("does not fire on the standard viewport", () => {
    const files = {
      "index.html": page(`<meta name="viewport" content="width=device-width, initial-scale=1">`),
    };
    expect(idsOf(files)).not.toContain("audit/viewport-lock");
  });

  it("does not fire when zoom stays available (maximum-scale >= 2)", () => {
    for (const v of ["maximum-scale=2", "maximum-scale=5", "maximum-scale=10"]) {
      const files = {
        "index.html": page(`<meta name="viewport" content="width=device-width, initial-scale=1, ${v}">`),
      };
      expect(idsOf(files), v).not.toContain("audit/viewport-lock");
    }
  });
});

describe("audit/lcp-image-lazy", () => {
  it("fires when the first image on the page is lazy", () => {
    const files = {
      "index.html": page("", `<h1>x</h1><img src="/hero.jpg" alt="" width="800" height="400" loading="lazy">`),
      "hero.jpg": null,
    };
    expect(idsOf(files)).toContain("audit/lcp-image-lazy");
  });

  it("does not fire when the hero is eager and only below-fold images are lazy", () => {
    const files = {
      "index.html": page(
        "",
        `<h1>x</h1>` +
          `<img src="/hero.jpg" alt="" width="800" height="400" fetchpriority="high">` +
          `<img src="/gallery-1.jpg" alt="" width="400" height="300" loading="lazy">` +
          `<img src="/gallery-2.jpg" alt="" width="400" height="300" loading="lazy">`,
      ),
      "hero.jpg": null,
      "gallery-1.jpg": null,
      "gallery-2.jpg": null,
    };
    expect(idsOf(files)).not.toContain("audit/lcp-image-lazy");
  });

  it("ignores lazy image markup inside script blocks", () => {
    const files = {
      "index.html": page(
        "",
        `<h1>x</h1>` +
          `<script>const tpl = '<img src="/x.jpg" loading="lazy">';</script>` +
          `<img src="/hero.jpg" alt="" width="800" height="400">`,
      ),
      "hero.jpg": null,
    };
    expect(idsOf(files)).not.toContain("audit/lcp-image-lazy");
  });
});

describe("audit/twitter-card-no-image", () => {
  it("fires on summary_large_image with no twitter:image", () => {
    const files = {
      "index.html": page(`<meta name="twitter:card" content="summary_large_image">`),
    };
    expect(idsOf(files)).toContain("audit/twitter-card-no-image");
  });

  it("does not fire when twitter:image is present", () => {
    const files = {
      "index.html": page(
        `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://example.com/og.jpg">`,
      ),
    };
    expect(idsOf(files)).not.toContain("audit/twitter-card-no-image");
  });

  it("does not fire on a plain summary card without an image", () => {
    const files = {
      "index.html": page(`<meta name="twitter:card" content="summary">`),
    };
    expect(idsOf(files)).not.toContain("audit/twitter-card-no-image");
  });
});

describe("audit/google-fonts-cdn", () => {
  it("fires when fonts load from Google's CDN", () => {
    const files = {
      "index.html": page(
        `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
          `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Karla:wght@400;700&display=swap">`,
      ),
    };
    expect(idsOf(files)).toContain("audit/google-fonts-cdn");
  });

  it("does not fire on self-hosted fonts", () => {
    const files = {
      "index.html": page(
        `<style>@font-face { font-family: "Body"; src: url("/fonts/body.woff2") format("woff2"); font-display: swap; }</style>`,
      ),
      "fonts/body.woff2": null,
    };
    expect(idsOf(files)).not.toContain("audit/google-fonts-cdn");
  });
});

describe("audit/jsonld-self-serving-rating", () => {
  const ld = (obj: unknown) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

  it("fires (as error) on a Restaurant that rates itself", () => {
    const files = {
      "index.html": page(
        "",
        `<h1>x</h1>${ld({
          "@context": "https://schema.org",
          "@type": "Restaurant",
          name: "Park's",
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "128" },
        })}`,
      ),
    };
    const hits = findingsFor(files, "audit/jsonld-self-serving-rating");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.severity).toBe("error");
  });

  it("fires on a self-serving review inside an @graph node", () => {
    const files = {
      "index.html": page(
        "",
        `<h1>x</h1>${ld({
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebSite", name: "Site" },
            {
              "@type": "LocalBusiness",
              name: "Shop",
              review: [{ "@type": "Review", reviewBody: "Great!", author: { "@type": "Person", name: "A" } }],
            },
          ],
        })}`,
      ),
    };
    expect(idsOf(files)).toContain("audit/jsonld-self-serving-rating");
  });

  it("does not fire on Product ratings (review snippets are allowed there)", () => {
    const files = {
      "index.html": page(
        "",
        `<h1>x</h1>${ld({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Widget",
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.2", reviewCount: "31" },
        })}`,
      ),
    };
    expect(idsOf(files)).not.toContain("audit/jsonld-self-serving-rating");
  });

  it("does not fire on a business block without rating markup", () => {
    const files = {
      "index.html": page(
        "",
        `<h1>x</h1>${ld({ "@context": "https://schema.org", "@type": "Restaurant", name: "Park's" })}`,
      ),
    };
    expect(idsOf(files)).not.toContain("audit/jsonld-self-serving-rating");
  });

  it("a literal null block is valid JSON: neither invalid nor self-serving", () => {
    const files = {
      "index.html": page("", `<h1>x</h1><script type="application/ld+json">null</script>`),
    };
    const ids = idsOf(files);
    expect(ids).not.toContain("audit/jsonld-invalid");
    expect(ids).not.toContain("audit/jsonld-self-serving-rating");
  });

  it("genuinely broken JSON still reports jsonld-invalid", () => {
    const files = {
      "index.html": page("", `<h1>x</h1><script type="application/ld+json">{"@type": "Restaurant",}</script>`),
    };
    expect(idsOf(files)).toContain("audit/jsonld-invalid");
  });
});
