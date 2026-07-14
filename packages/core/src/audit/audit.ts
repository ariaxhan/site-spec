import { foundation } from "../schema/foundation";
import type { Foundation } from "../schema/foundation";
import { jsonLdParityPolicy } from "../policies/seo";
import type { Brief } from "../schema/brief";

/**
 * Audit mode, inspect a static site directory (site-spec-built or not) and
 * report what is missing, dangling, undeclared, or broken. Pure: the caller
 * (CLI, test) reads the directory into a file map; this module never touches
 * the filesystem or network.
 *
 * Design bias: useful, not perfect. Checks are regex/string-level (no DOM, no
 * headless browser) and tuned against false positives, script blocks are
 * stripped before attribute scans, external URLs are never resolved, and
 * checks that can't be decided reliably are warnings, not errors. axe /
 * html-validate / schemarama remain the deep external gates (`npm run verify`).
 */

export interface AuditInput {
  /** path (posix, relative to the site root) → text content, or null for binary */
  files: Record<string, string | null>;
  /**
   * strict = built-for-a-target output: presence gaps are errors.
   * generic = somebody else's dist dir: platform-specific files are warnings.
   * Default: strict when foundation.json is present, else generic.
   */
  mode?: "strict" | "generic";
  /** Brief for claims parity (JSON-LD facts must trace to it) */
  facts?: unknown;
  /** File-presence-dependent checks (dangling refs, broken links, sitemap↔page parity).
   *  Default true. Set false for a LIVE crawl, where a partial file map cannot prove a
   *  resource is absent from the server. */
  linkChecks?: boolean;
}

export interface AuditFinding {
  checkId: string;
  severity: "error" | "warning";
  file?: string;
  message: string;
  fix?: string;
}

export interface AuditReport {
  ok: boolean;
  mode: "strict" | "generic";
  errors: number;
  warnings: number;
  findings: AuditFinding[];
  /** html files inspected */
  pages: string[];
}

/** Known analytics/tracker signatures (script origins + inline globals). */
const TRACKER_SIGNATURES: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  { id: "google-analytics", pattern: /googletagmanager\.com|google-analytics\.com|\bgtag\s*\(/ },
  { id: "segment", pattern: /cdn\.segment\.com|analytics\.load\s*\(/ },
  { id: "hotjar", pattern: /static\.hotjar\.com|\bhj\s*\(/ },
  { id: "clarity", pattern: /clarity\.ms/ },
  { id: "posthog", pattern: /posthog\.(com|init)/ },
  { id: "plausible", pattern: /plausible\.io\/js/ },
  { id: "fathom", pattern: /usefathom\.com/ },
  { id: "matomo", pattern: /matomo\.js|_paq\b/ },
  { id: "umami", pattern: /umami(\.is)?\/script\.js|data-website-id/ },
  { id: "meta-pixel", pattern: /connect\.facebook\.net|\bfbq\s*\(/ },
];

const norm = (p: string): string => p.replace(/^\.?\//, "");

function stripScripts(html: string): string {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
}

function inlineScripts(html: string): string {
  const out: string[] = [];
  for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    out.push(m[1] ?? "");
  }
  return out.join("\n");
}

/** Is this ref something we can resolve inside the file map? */
function isInternalRef(ref: string): boolean {
  return (
    !/^(https?:)?\/\//i.test(ref) &&
    !/^(mailto:|tel:|sms:|data:|javascript:|#)/i.test(ref) &&
    ref.length > 0
  );
}

/** Resolve an internal ref (from a page at pagePath) to a file-map key. */
function resolveRef(ref: string, pagePath: string): string {
  const clean = ref.split(/[?#]/)[0] ?? "";
  if (clean === "") return pagePath; // pure fragment/query, same page
  let path: string;
  if (clean.startsWith("/")) {
    path = clean.slice(1);
  } else {
    const dir = pagePath.includes("/") ? pagePath.slice(0, pagePath.lastIndexOf("/") + 1) : "";
    const stack = (dir + clean).split("/");
    const resolved: string[] = [];
    for (const part of stack) {
      if (part === "" || part === ".") continue;
      if (part === "..") resolved.pop();
      else resolved.push(part);
    }
    path = resolved.join("/");
  }
  if (path === "" || path.endsWith("/")) path += "index.html";
  return path;
}

/** Does a resolved path exist in the map (directly or as dir/index.html)? */
function exists(files: Record<string, string | null>, path: string): boolean {
  return path in files || `${path}/index.html` in files || `${path}index.html` in files;
}

/** Collect every internal resource/link ref in a page: [ref, kind]. */
function collectRefs(html: string, css: string): Array<{ ref: string; kind: "resource" | "link" }> {
  const refs: Array<{ ref: string; kind: "resource" | "link" }> = [];
  const noScript = stripScripts(html);
  // resource-loading attributes
  for (const m of noScript.matchAll(
    /<(?:link|img|source|video|audio|iframe|embed)\b[^>]*?\s(?:href|src|poster)="([^"]+)"/gi,
  )) {
    refs.push({ ref: m[1]!, kind: "resource" });
  }
  for (const m of html.matchAll(/<script\b[^>]*?\ssrc="([^"]+)"/gi)) {
    refs.push({ ref: m[1]!, kind: "resource" });
  }
  // srcset entries
  for (const m of noScript.matchAll(/\ssrcset="([^"]+)"/gi)) {
    for (const entry of m[1]!.split(",")) {
      const url = entry.trim().split(/\s+/)[0];
      if (url) refs.push({ ref: url, kind: "resource" });
    }
  }
  // css url(...), inline <style> blocks + any linked stylesheet content
  const styleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1] ?? "")
    .join("\n");
  for (const m of (styleBlocks + "\n" + css).matchAll(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi)) {
    refs.push({ ref: m[1]!, kind: "resource" });
  }
  // anchors
  for (const m of noScript.matchAll(/<a\b[^>]*?\shref="([^"]+)"/gi)) {
    refs.push({ ref: m[1]!, kind: "link" });
  }
  return refs;
}

export function auditFiles(input: AuditInput): AuditReport {
  const files: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(input.files)) files[norm(k)] = v;

  const findings: AuditFinding[] = [];
  const add = (f: AuditFinding) => findings.push(f);
  const linkChecks = input.linkChecks ?? true;

  // ---- foundation manifest ----------------------------------------------
  let fnd: Foundation = foundation.parse({});
  const rawFnd = files["foundation.json"];
  if (typeof rawFnd === "string") {
    try {
      fnd = foundation.parse(JSON.parse(rawFnd));
    } catch {
      add({
        checkId: "audit/foundation-invalid",
        severity: "error",
        file: "foundation.json",
        message: "foundation.json exists but is not a valid foundation manifest.",
        fix: "Regenerate with site-spec build, or fix the JSON by hand.",
      });
    }
  }
  const hasFoundation = rawFnd != null;
  const mode: "strict" | "generic" = input.mode ?? (hasFoundation ? "strict" : "generic");
  const presence = (severityInGeneric: "error" | "warning") =>
    mode === "strict" ? ("error" as const) : severityInGeneric;

  // ---- site-wide presence -------------------------------------------------
  const pages = Object.keys(files)
    .filter((p) => p.endsWith(".html"))
    .sort();

  if (pages.length === 0) {
    add({
      checkId: "audit/no-pages",
      severity: "error",
      message: "No .html files found, nothing to audit.",
    });
    return { ok: false, mode, errors: 1, warnings: 0, findings, pages };
  }

  const wantFile = (
    name: string,
    checkId: string,
    severity: "error" | "warning",
    message: string,
    fix: string,
  ) => {
    if (!(name in files)) add({ checkId, severity, message, fix });
  };

  wantFile("sitemap.xml", "audit/sitemap-missing", "error", "No sitemap.xml.", "Emit one (site-spec build does) and reference it from robots.txt.");
  wantFile("robots.txt", "audit/robots-missing", "error", "No robots.txt.", "Ship an explicit crawl policy, silence is not a policy.");
  wantFile("llms.txt", "audit/llms-missing", presence("warning"), "No llms.txt, AI agents get no machine-readable summary.", "Generate one from the site's real facts.");
  wantFile("404.html", "audit/404-missing", presence("warning"), "No 404.html, visitors to broken URLs get the host's default error.", "Ship a branded, noindexed 404 that links home.");
  wantFile("_headers", "audit/headers-missing", presence("warning"), "No _headers file, no security headers or cache policy at the edge (Cloudflare/Netlify).", "Emit _headers with HSTS, nosniff, frame and referrer policies, and Cache-Control rules.");

  // robots.txt content checks: stale tokens + self-defeating AI-search blocks
  const robots = files["robots.txt"];
  if (typeof robots === "string") {
    for (const stale of ["anthropic-ai", "Claude-Web"]) {
      if (new RegExp(`^User-agent:\\s*${stale}\\s*$`, "im").test(robots)) {
        add({
          checkId: "audit/robots-stale-token",
          severity: "warning",
          file: "robots.txt",
          message: `robots.txt names the deprecated crawler token "${stale}" (Anthropic retired it; current set: ClaudeBot, Claude-SearchBot, Claude-User).`,
          fix: "Drop the dead token and target the current crawler names.",
        });
      }
    }
    const aiSearch = ["OAI-SearchBot", "ChatGPT-User", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Perplexity-User"];
    for (const bot of aiSearch) {
      if (new RegExp(`User-agent:\\s*${bot}\\s*\\nDisallow:\\s*/\\s*$`, "im").test(robots)) {
        add({
          checkId: "audit/robots-blocks-ai-search",
          severity: "warning",
          file: "robots.txt",
          message: `robots.txt blocks ${bot}, an AI *search/user-fetch* agent, removing the site from the answers its visitors read (training crawlers are a separate token set).`,
          fix: "Block training crawlers if you want, but leave search and user-fetch agents allowed.",
        });
      }
    }
  }

  const headers = files["_headers"];
  if (typeof headers === "string") {
    // header values that reliably date the config or actively mislead
    if (/interest-cohort/i.test(headers)) {
      add({
        checkId: "audit/headers-stale",
        severity: "warning",
        file: "_headers",
        message: "Permissions-Policy names interest-cohort; FLoC was discontinued in 2022, this is dead config.",
        fix: "Remove interest-cohort=() from Permissions-Policy.",
      });
    }
    if (/x-xss-protection:\s*1/i.test(headers)) {
      add({
        checkId: "audit/headers-stale",
        severity: "warning",
        file: "_headers",
        message: "X-Xss-Protection: 1 re-enables a removed legacy auditor that itself created vulnerabilities.",
        fix: "Set X-XSS-Protection: 0 or drop the header.",
      });
    }
    if (/content-security-policy-report-only/i.test(headers) && !/report-(to|uri)/i.test(headers)) {
      add({
        checkId: "audit/csp-report-only-theater",
        severity: "warning",
        file: "_headers",
        message: "CSP is Report-Only with no report-to/report-uri endpoint: it enforces nothing and reports to nobody.",
        fix: "Enforce the policy (hash inline scripts) or wire a report endpoint; report-only without one is theater.",
      });
    }
    if (/strict-transport-security:[^\n]*preload/i.test(headers)) {
      add({
        checkId: "audit/hsts-preload",
        severity: "warning",
        file: "_headers",
        message: "HSTS carries preload: semi-permanent (months to unwind) and hstspreload.org tells tools never to emit it by default.",
        fix: "Ship max-age only unless the owner explicitly opted into the preload list.",
      });
    }
  }
  if (typeof headers === "string" && !/cache-control/i.test(headers)) {
    add({
      checkId: "audit/cache-policy-missing",
      severity: presence("warning"),
      file: "_headers",
      message: "_headers has no Cache-Control rules, caching left to platform defaults.",
      fix: "HTML: max-age=0, must-revalidate. Static assets: max-age=31536000, immutable.",
    });
  }
  if (typeof headers === "string" && /x-robots-tag:\s*noindex/i.test(headers)) {
    add({
      checkId: "audit/noindex",
      severity: "error",
      file: "_headers",
      message: "X-Robots-Tag: noindex in _headers, the whole site is hidden from search.",
      fix: "Remove it unless this deploy is intentionally private.",
    });
  }

  // sitemap ↔ pages parity, with subpath detection: a single-loc sitemap whose
  // path doesn't resolve means this dir deploys under that path (e.g.
  // example.com/listing). Root-relative refs are then resolved against it;
  // refs OUTSIDE the base path live at the origin, unverifiable from this dir.
  const sitemap = files["sitemap.xml"];
  let basePath = "";
  if (typeof sitemap === "string") {
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (m) => m[1]!.replace(/^https?:\/\/[^/]+/i, "") || "/",
    );
    if (
      locs.length === 1 &&
      locs[0] !== "/" &&
      !exists(files, resolveRef(locs[0]!, "index.html"))
    ) {
      basePath = locs[0]!.replace(/\/+$/, "");
    }
    for (const loc of locs) {
      if (!linkChecks) break;
      const path = basePath && loc.startsWith(basePath) ? loc.slice(basePath.length) || "/" : loc;
      const resolved = resolveRef(path, "index.html");
      if (!exists(files, resolved)) {
        add({
          checkId: "audit/sitemap-page-missing",
          severity: "error",
          file: "sitemap.xml",
          message: `sitemap lists ${loc} but ${resolved} does not exist in the output.`,
          fix: "Remove the entry or ship the page, a sitemap that lies burns crawl trust.",
        });
      }
    }
  }

  /**
   * Rebase a root-relative ref against the detected base path.
   * Returns null when the ref points outside this deploy (skip the check).
   */
  const rebase = (ref: string): string | null => {
    if (!basePath || !ref.startsWith("/")) return ref;
    const clean = ref.split(/[?#]/)[0] ?? "";
    if (clean === basePath) return "/";
    if (clean.startsWith(basePath + "/")) return clean.slice(basePath.length);
    return null;
  };

  // ---- per-page checks -----------------------------------------------------
  const brief = input.facts as Brief | undefined;

  for (const page of pages) {
    const html = files[page];
    if (typeof html !== "string") continue;
    const is404 = page === "404.html" || page.endsWith("/404.html");
    const noScript = stripScripts(html);

    const pageErr = (
      checkId: string,
      severity: "error" | "warning",
      message: string,
      fix?: string,
    ) => add({ checkId, severity, file: page, message, ...(fix ? { fix } : {}) });

    // no server-rendered content: a client-rendered SPA shell (scripts, no text)
    // reads as a blank page to AI crawlers and no-JS clients.
    if (!is404) {
      const visible = html
        .replace(/<script\b[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[\s\S]*?<\/style>/gi, "")
        .replace(/<head\b[\s\S]*?<\/head>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (visible.length < 200 && /<script\b/i.test(html)) {
        pageErr(
          "audit/empty-body",
          "warning",
          `Page ships almost no server-rendered text (${visible.length} chars) but loads scripts: AI crawlers and no-JS clients see a near-empty page.`,
          "Server-render or pre-render the main content so it is in the initial HTML.",
        );
      }
    }

    // head basics
    if (!/<title[^>]*>[^<]/i.test(html)) {
      pageErr("audit/title-missing", "error", "No <title>.", "Every page needs a unique, descriptive title.");
    }
    if (!/<meta\s+name="description"\s+content="[^"]/i.test(html)) {
      pageErr("audit/description-missing", is404 ? "warning" : "error", "No meta description.");
    }
    if (!is404) {
      if (!/rel="canonical"/i.test(html)) {
        pageErr("audit/canonical-missing", "error", "No canonical URL.", 'Add <link rel="canonical">, duplicate-content ambiguity is self-inflicted.');
      }
      if (!/application\/ld\+json/i.test(html)) {
        pageErr("audit/jsonld-missing", "error", "No JSON-LD structured data.", "Emit a typed schema.org block grounded in real facts.");
      }
      if (!/property="og:title"/i.test(html)) {
        pageErr("audit/og-missing", "error", "No Open Graph card.", "Links to this page will unfurl as bare URLs.");
      }
      if (/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html)) {
        pageErr("audit/noindex", "error", "Page is noindexed, accidental noindex is the classic silent SEO kill.", "Remove noindex unless this page is intentionally hidden.");
      }
      const h1s = (noScript.match(/<h1[\s>]/gi) ?? []).length;
      if (h1s !== 1) {
        pageErr("audit/h1-count", "warning", `Page has ${h1s} <h1> elements (want exactly 1).`);
      }
    }

    // viewport lock: disabling zoom is an axe-critical a11y failure
    const viewport = /<meta\s+name="viewport"\s+content="([^"]*)"/i.exec(html)?.[1] ?? "";
    if (/user-scalable\s*=\s*no/i.test(viewport) || /maximum-scale\s*=\s*(0|1)(\.\d+)?\b/i.test(viewport)) {
      pageErr(
        "audit/viewport-lock",
        "error",
        `Viewport blocks zoom (${viewport}), low-vision users cannot scale the page.`,
        "Use width=device-width, initial-scale=1 and nothing else.",
      );
    }

    // lazy LCP heuristic: the first content image on the page should never be lazy
    if (!is404) {
      const firstImg = /<img\b[^>]*>/i.exec(noScript)?.[0];
      if (firstImg && /\sloading="lazy"/i.test(firstImg)) {
        pageErr(
          "audit/lcp-image-lazy",
          "warning",
          `First image on the page is loading="lazy": if it is the LCP element this reliably worsens LCP.`,
          'Load the hero eagerly with fetchpriority="high"; lazy-load only below the fold.',
        );
      }
      // social preview honesty: a large-image card with no image renders blank
      if (
        /name="twitter:card"\s+content="summary_large_image"/i.test(html) &&
        !/name="twitter:image"/i.test(html)
      ) {
        pageErr(
          "audit/twitter-card-no-image",
          "warning",
          "twitter:card is summary_large_image but there is no twitter:image, shares render a broken preview.",
          "Provide an image or degrade the card type to summary.",
        );
      }
    }

    // Google Fonts CDN: transmits visitor IPs to Google pre-consent
    // (LG Muenchen 3 O 17493/20 held this violates GDPR; self-hosting is the fix)
    if (/fonts\.(googleapis|gstatic)\.com/i.test(html)) {
      pageErr(
        "audit/google-fonts-cdn",
        "warning",
        "Fonts load from Google's CDN, which shares visitor IPs with Google (GDPR exposure per LG Muenchen).",
        "Self-host the woff2 files (subset + font-display: swap); drop the fonts.googleapis.com stylesheet.",
      );
    }

    // JSON-LD parses + policy-risk shapes
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        // `?? {}` guards JSON.parse returning null (valid JSON, nothing to inspect)
        const block = (JSON.parse(m[1]!) ?? {}) as Record<string, unknown>;
        const nodes = Array.isArray(block["@graph"]) ? (block["@graph"] as Record<string, unknown>[]) : [block];
        for (const node of nodes) {
          const type = String(node["@type"] ?? "");
          const selfServing = /LocalBusiness|Organization|Restaurant|Store|ProfessionalService/i.test(type);
          if (selfServing && (node["aggregateRating"] !== undefined || node["review"] !== undefined)) {
            pageErr(
              "audit/jsonld-self-serving-rating",
              "error",
              `${type} JSON-LD carries aggregateRating/review about itself; Google has prohibited self-serving review markup since Sept 2019 (spam signal at worst).`,
              "Remove the rating markup; render testimonials as visible, attributed content instead.",
            );
          }
        }
      } catch {
        pageErr("audit/jsonld-invalid", "error", "A JSON-LD block is not valid JSON.", "Broken structured data is worse than none, crawlers drop the whole block.");
      }
    }

    // claims parity (facts mode): emitted JSON-LD must trace to the Brief
    if (brief && !is404) {
      for (const f of jsonLdParityPolicy.evaluate({ brief, html } as never)) {
        pageErr("audit/claims-parity", "error", f.message, "Ground the value in the Brief or remove it from the page.");
      }
    }

    // images
    for (const m of noScript.matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0];
      if (!/\salt=/i.test(tag)) {
        pageErr("audit/img-alt-missing", "error", `<img> without alt text: ${tag.slice(0, 80)}…`, "Empty alt is fine for decorative images; missing alt is not.");
      }
      if (!/\swidth=/i.test(tag) || !/\sheight=/i.test(tag)) {
        pageErr("audit/img-dims-missing", "warning", `<img> without width/height (layout shift): ${tag.slice(0, 80)}…`);
      }
    }

    // mixed content (raw html: script tags count) + inline handlers (scripts stripped)
    for (const m of html.matchAll(/<(?:link|script|img|source|iframe|video|audio)\b[^>]*?\s(?:href|src)="(http:\/\/[^"]+)"/gi)) {
      pageErr("audit/mixed-content", "error", `Insecure resource: ${m[1]}`, "Serve every subresource over https.");
    }
    for (const m of noScript.matchAll(/<[a-z][^>]*?\s(on[a-z]+)=/gi)) {
      pageErr("audit/inline-handler", "warning", `Inline event handler (${m[1]}), blocks any future CSP and hides behavior from review.`);
    }

    // refs: dangling resources + broken internal links
    const cssFiles = Object.entries(files)
      .filter(([p, v]) => p.endsWith(".css") && typeof v === "string")
      .map(([, v]) => v as string)
      .join("\n");
    for (const { ref, kind } of linkChecks ? collectRefs(html, cssFiles) : []) {
      if (!isInternalRef(ref)) continue;
      const rebased = rebase(ref);
      if (rebased === null) continue; // points outside this subpath deploy
      const resolved = resolveRef(rebased, page);
      if (!exists(files, resolved)) {
        if (kind === "resource") {
          pageErr("audit/dangling-ref", "error", `References ${ref} but ${resolved} is not in the output.`, "Ship the file or drop the reference, a 404ing asset is invisible slop.");
        } else {
          pageErr("audit/broken-link", "error", `Internal link to ${ref} but ${resolved} does not exist.`);
        }
      }
    }

    // forms vs contracts (a site-spec authoring concept: only meaningful when a
    // foundation.json manifest was shipped, skip entirely on external sites)
    for (const m of hasFoundation ? noScript.matchAll(/<form\b[^>]*>/gi) : []) {
      const tag = m[0];
      const id = tag.match(/\sid="([^"]+)"/i)?.[1];
      const contract = id ? fnd.forms.find((f) => f.id === id) : undefined;
      if (!contract) {
        pageErr(
          "audit/form-untyped",
          "error",
          id
            ? `<form id="${id}"> has no contract in foundation.json.`
            : `<form> without an id, cannot be matched to any contract.`,
          "Declare id, intent, endpoint, and fields in foundation.json forms[].",
        );
      }
    }
  }

  // ---- scripts: cookies + trackers (page scripts + shipped .js files) ------
  const scriptCorpus =
    pages.map((p) => inlineScripts(files[p] ?? "")).join("\n") +
    "\n" +
    Object.entries(files)
      .filter(([p, v]) => p.endsWith(".js") && typeof v === "string")
      .map(([, v]) => v as string)
      .join("\n");
  const htmlCorpus = pages.map((p) => files[p] ?? "").join("\n");

  const writesCookies = /document\.cookie\s*=/.test(scriptCorpus);
  if (hasFoundation) {
    // foundation-contract checks: emitted trackers/cookies must trace to the manifest.
    if (writesCookies && fnd.cookies.length === 0) {
      add({
        checkId: "audit/cookie-undeclared",
        severity: "error",
        message: "Scripts write document.cookie but foundation.json declares zero cookies.",
        fix: "Declare every cookie (name, purpose, ttl), undeclared cookies are a consent liability.",
      });
    }
    const declaredProvider = fnd.analytics.provider;
    for (const t of TRACKER_SIGNATURES) {
      if (t.id === declaredProvider) continue;
      if (t.pattern.test(htmlCorpus) || t.pattern.test(scriptCorpus)) {
        add({
          checkId: "audit/tracker-undeclared",
          severity: "error",
          message: `Detected ${t.id} but foundation.json declares analytics: ${declaredProvider}.`,
          fix: "Declare the provider in foundation.json (and its consent story), or remove the tracker.",
        });
      }
    }
  } else {
    // external site (no manifest): generic privacy warnings, no foundation.json framing.
    if (writesCookies) {
      add({
        checkId: "audit/cookie-detected",
        severity: "warning",
        message:
          "Scripts set cookies via document.cookie: ensure they are disclosed and consent-gated where required.",
        fix: "Document each cookie's purpose and TTL; gate non-essential cookies behind consent.",
      });
    }
    for (const t of TRACKER_SIGNATURES) {
      if (t.pattern.test(htmlCorpus) || t.pattern.test(scriptCorpus)) {
        add({
          checkId: "audit/tracker-detected",
          severity: "warning",
          message: `Detected the ${t.id} tracker: ensure you have a consent/disclosure story (GDPR/CCPA).`,
          fix: "Disclose it in your privacy policy and gate non-essential trackers behind consent.",
        });
      }
    }
  }

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.length - errors;
  return { ok: errors === 0, mode, errors, warnings, findings, pages };
}
