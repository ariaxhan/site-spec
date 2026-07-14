import type { SiteSpec } from "../schema/site-spec";
import type { Pack } from "../schema/pack";
import type { Brief } from "../schema/brief";
import type { AssetManifest } from "../schema/asset";
import { siteContext, localePath, absUrl } from "../schema/site";
import type { SiteContext } from "../schema/site";
import { foundation } from "../schema/foundation";
import type { Foundation } from "../schema/foundation";
import { createHash } from "node:crypto";
import { render } from "../render/render";
import { resolveAppName } from "../seo/jsonld";
import { escapeHtml, escapeAttr } from "../ui/escape";

/** Deploy targets the build layer knows how to write notes for. */
export type DeployTarget = "cloudflare" | "netlify" | "vercel" | "static";

export interface BuildSiteInput {
  spec: SiteSpec;
  pack: Pack;
  brief: Brief;
  site: unknown; // validated to SiteContext
  manifest?: AssetManifest;
  /** declared backend surface (env/cookies/analytics/forms); defaults to empty */
  foundation?: unknown;
  /** deploy target for DEPLOY.md notes; headers/redirects files are CF/Netlify-native */
  target?: DeployTarget;
}

function xmlEsc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * sitemap.xml with per-locale xhtml:link alternates. Alternates only when
 * real language variants exist; a lone
 * self-referencing hreflang on a single-locale site is pure noise (D9).
 */
function sitemapXml(ctx: SiteContext): string {
  const loc = absUrl(ctx.baseUrl, localePath(ctx.path, ctx.defaultLocale, ctx.defaultLocale));
  let alts = "";
  if (ctx.locales.length > 1) {
    const lines = ctx.locales.map(
      (l) =>
        `    <xhtml:link rel="alternate" hreflang="${xmlEsc(l)}" href="${xmlEsc(absUrl(ctx.baseUrl, localePath(ctx.path, l, ctx.defaultLocale)))}"/>`,
    );
    lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEsc(loc)}"/>`);
    alts = "\n" + lines.join("\n");
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `  <url>\n    <loc>${xmlEsc(loc)}</loc>${alts}\n  </url>\n` +
    `</urlset>\n`
  );
}

/**
 * robots.txt with the standard bot policy: allow search + AI *search*
 * agents (discovery + citations), block AI *training* crawlers, advertise the
 * sitemap. Content-Signal is the Cloudflare standard.
 */
function robotsTxt(ctx: SiteContext): string {
  // Search engines + AI *search/user-fetch* agents: always allowed (being
  // findable is the point; blocking these removes the business from the
  // answers its customers read). Token list is maintained DATA, not lore:
  // https://platform.openai.com/docs/bots · https://support.claude.com/en/articles/8896518
  // (anthropic-ai and Claude-Web are deprecated tokens, deliberately absent).
  const allow = [
    "Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User",
    "Claude-User", "Claude-SearchBot", "PerplexityBot", "Perplexity-User",
    "Applebot", "DuckAssistBot", "MistralAI-User",
  ];
  // AI *training* crawlers: blocked unless the owner opts in (site.aiTraining).
  const block = [
    "GPTBot", "Google-Extended", "ClaudeBot", "CCBot", "Bytespider",
    "Applebot-Extended", "Amazonbot", "Meta-ExternalAgent",
  ];
  const train = ctx.aiTraining === "allow";
  return (
    `# Content-Signal is advisory (no confirmed vendor honors it yet); cheap to state.\n` +
    `Content-Signal: search=yes, ai-input=yes, ai-train=${train ? "yes" : "no"}\n\n` +
    `User-agent: *\nAllow: /\n\n` +
    `# Search + AI agent/search bots: allowed.\n` +
    allow.map((b) => `User-agent: ${b}\nAllow: /\n`).join("") +
    (train
      ? ""
      : `\n# AI training crawlers: blocked (site.aiTraining: "block").\n` +
        block.map((b) => `User-agent: ${b}\nDisallow: /\n`).join("")) +
    `\nSitemap: ${absUrl(ctx.baseUrl, "/sitemap.xml")}\n`
  );
}

/** Every HTML path this (single-page) site serves, used for cache rules. */
function htmlPaths(ctx: SiteContext): string[] {
  const paths = ctx.locales.map((l) => localePath(ctx.path, l, ctx.defaultLocale));
  return [...new Set(paths)];
}

/** sha256 CSP source tokens for every inline (non-JSON-LD) script in the pages. */
function inlineScriptHashes(htmlPages: string[]): string[] {
  const hashes = new Set<string>();
  for (const html of htmlPages) {
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const attrs = m[1] ?? "";
      if (/\bsrc=/i.test(attrs)) continue;
      if (/application\/ld\+json/i.test(attrs)) continue; // data block, not executable
      const body = m[2] ?? "";
      if (!body) continue;
      hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
    }
  }
  return [...hashes].sort();
}

/** External https origins the pages actually load images from (CSP img-src). */
function externalImgOrigins(htmlPages: string[], ctx: SiteContext): string[] {
  const self = new URL(ctx.baseUrl).origin;
  const origins = new Set<string>();
  for (const html of htmlPages) {
    for (const m of html.matchAll(/<(?:img|source)\b[^>]*?\s(?:src|srcset|poster)="([^"]+)"/gi)) {
      for (const entry of m[1]!.split(",")) {
        const url = entry.trim().split(/\s+/)[0] ?? "";
        if (/^https:\/\//i.test(url)) {
          const origin = new URL(url).origin;
          if (origin !== self) origins.add(origin);
        }
      }
    }
  }
  return [...origins].sort();
}

/**
 * Cloudflare/Netlify `_headers`: the security profile + an explicit cache
 * policy. Profile rationale (deep-audit report section 08):
 * - HSTS one year, NO includeSubDomains/preload by default (owner opt-in via
 *   site.hsts; a default preload is semi-permanent and can brick an unrelated
 *   HTTP-only subdomain).
 * - XFO DENY + CSP frame-ancestors 'none': brochure pages have no legitimate
 *   embedding use; frame-ancestors is authoritative, XFO is the legacy shim.
 * - Permissions-Policy names only the drive-by-abuse trio; interest-cohort is
 *   dead (FLoC, 2022) and the 28-feature list is scanner cosplay.
 * - CSP is ENFORCING, not Report-Only: report-only without a report endpoint
 *   does nothing, and the compiler can hash the exact inline scripts it just
 *   emitted (deterministic), so 'unsafe-inline' is never needed for script-src.
 *   style-src keeps 'unsafe-inline' as the stated v1 tradeoff (one compiled
 *   style block; CSS injection on a no-secret page is defacement risk only).
 * - X-XSS-Protection: 0, the legacy auditor created vulnerabilities; any
 *   other value is 2016 copy-paste.
 * HTML revalidates (rules are per-page-path to avoid duplicate Cache-Control
 * values from overlapping rules); static asset dirs are long-lived immutable.
 */
function headersFile(
  spec: SiteSpec,
  ctx: SiteContext,
  fnd: Foundation,
  htmlPages: string[],
): string {
  const googleFonts = Boolean(spec.theme.fontImportUrl);
  const scriptHashes = inlineScriptHashes(htmlPages);
  const imgOrigins = externalImgOrigins(htmlPages, ctx);
  const mailtoForms = fnd.forms.some((f) => f.endpoint.startsWith("mailto:"));
  const csp = [
    "default-src 'self'",
    `script-src 'self'${scriptHashes.length ? " " + scriptHashes.join(" ") : ""}`,
    `style-src 'self' 'unsafe-inline'${googleFonts ? " https://fonts.googleapis.com" : ""}`,
    `font-src 'self'${googleFonts ? " https://fonts.gstatic.com" : ""}`,
    `img-src 'self' data:${imgOrigins.length ? " " + imgOrigins.join(" ") : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
    `form-action 'self'${mailtoForms ? " mailto:" : ""}`,
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
  const hstsScope = ctx.hsts.preload
    ? "; includeSubDomains; preload" // preload list requires includeSubDomains
    : ctx.hsts.subdomains
      ? "; includeSubDomains"
      : "";
  const htmlRules = [...htmlPaths(ctx), "/404.html"]
    .map((p) => `${p}\n  Cache-Control: public, max-age=0, must-revalidate\n`)
    .join("\n");
  return (
    `/*\n` +
    `  Strict-Transport-Security: max-age=31536000${hstsScope}\n` +
    `  X-Content-Type-Options: nosniff\n` +
    `  X-Frame-Options: DENY\n` +
    `  Referrer-Policy: strict-origin-when-cross-origin\n` +
    `  Permissions-Policy: camera=(), microphone=(), geolocation=()\n` +
    `  Content-Security-Policy: ${csp}\n` +
    `  Cross-Origin-Opener-Policy: same-origin\n` +
    `  X-XSS-Protection: 0\n\n` +
    htmlRules +
    `\n/assets/*\n` +
    `  Cache-Control: public, max-age=31536000, immutable\n` +
    `\n/fonts/*\n` +
    `  Cache-Control: public, max-age=31536000, immutable\n`
  );
}

/** Cloudflare/Netlify `_redirects` from the declared rules. */
function redirectsFile(ctx: SiteContext): string {
  const lines = ctx.redirects.map((r) => `${r.from} ${r.to} ${r.status}`);
  return (
    `# Redirect rules (Cloudflare Pages / Netlify format): from to status.\n` +
    `# None declared means none needed, this file existing IS the decision.\n` +
    (lines.length ? lines.join("\n") + "\n" : "")
  );
}

/** PWA manifest.json, icons list only what actually ships (no dangling refs). */
function basePath(ctx: SiteContext): string {
  return ctx.path === "/" ? "" : ctx.path.replace(/\/+$/, "");
}

function manifestJson(spec: SiteSpec, ctx: SiteContext, appName: string): string {
  const icons: Record<string, string>[] = [
    { src: ctx.icons.svg, sizes: "any", type: "image/svg+xml", purpose: "any" },
  ];
  if (ctx.icons.maskable192) {
    icons.push({ src: ctx.icons.maskable192, sizes: "192x192", type: "image/png", purpose: "maskable" });
  }
  if (ctx.icons.maskable512) {
    icons.push({ src: ctx.icons.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" });
  }
  if (ctx.icons.appleTouch) {
    icons.push({ src: ctx.icons.appleTouch, sizes: "180x180", type: "image/png", purpose: "any" });
  }
  const manifest = {
    name: appName,
    short_name: appName,
    description: spec.meta.description.value,
    start_url: basePath(ctx) + "/",
    scope: basePath(ctx) + "/",
    display: "browser",
    background_color: spec.theme.palette.background,
    theme_color: ctx.themeColor ?? spec.theme.palette.background,
    lang: spec.meta.lang,
    icons,
  };
  return JSON.stringify(manifest, null, 2) + "\n";
}

/**
 * A deterministic letter-mark favicon derived from the theme, so the default
 * `/favicon.svg` link never dangles. Deploys that want a real icon set
 * `site.icons.svg` to their own path and ship the file.
 */
function faviconSvg(spec: SiteSpec, appName: string): string {
  const letter = escapeHtml((appName.trim()[0] ?? "•").toUpperCase());
  const p = spec.theme.palette;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<rect width="100" height="100" rx="22" fill="${escapeAttr(p.primary)}"/>` +
    `<text x="50" y="54" font-family="system-ui, -apple-system, sans-serif" font-size="58" font-weight="700" fill="${escapeAttr(p.primaryText)}" text-anchor="middle" dominant-baseline="middle">${letter}</text>` +
    `</svg>\n`
  );
}

/** A theme-styled, noindexed 404 that links home. Every site ships one. */
function notFoundHtml(spec: SiteSpec, ctx: SiteContext, appName: string): string {
  const p = spec.theme.palette;
  const home = localePath(ctx.path, ctx.defaultLocale, ctx.defaultLocale);
  return (
    `<!DOCTYPE html>\n<html lang="${escapeAttr(spec.meta.lang)}">\n<head>\n` +
    `<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
    `<meta name="robots" content="noindex">\n` +
    `<title>Page not found, ${escapeHtml(appName)}</title>\n` +
    `<link rel="icon" type="image/svg+xml" href="${escapeAttr(ctx.icons.svg)}">\n` +
    `<style>` +
    `body{margin:0;min-height:100vh;display:grid;place-items:center;` +
    `background:${p.background};color:${p.text};` +
    `font-family:${spec.theme.typography.bodyFamily};text-align:center;padding:2rem}` +
    `main{max-width:28rem}` +
    `h1{font-family:${spec.theme.typography.headingFamily};color:${p.heading ?? p.text};margin:0 0 .5rem}` +
    `p{color:${p.textMuted};margin:0 0 1.5rem}` +
    `a{display:inline-block;background:${p.primary};color:${p.primaryText};` +
    `text-decoration:none;padding:.75rem 1.5rem;border-radius:${spec.theme.controlRadiusPx ?? spec.theme.radiusPx}px}` +
    `</style>\n</head>\n<body>\n<main>\n` +
    `<h1>Page not found</h1>\n` +
    `<p>The page you're looking for doesn't exist or has moved.</p>\n` +
    `<a href="${escapeAttr(home)}">Back to ${escapeHtml(appName)}</a>\n` +
    `</main>\n</body>\n</html>\n`
  );
}

/** Machine-readable site summary for AI agents, generated from the Brief. */
function llmsTxt(brief: Brief, spec: SiteSpec, ctx: SiteContext): string {
  const biz = brief.business;
  const canonical = absUrl(ctx.baseUrl, localePath(ctx.path, ctx.defaultLocale, ctx.defaultLocale));
  const lines: string[] = [
    `# ${biz.name}`,
    ``,
    `> ${spec.meta.description.value}`,
    ``,
    `${biz.name} is a ${biz.category}.`,
    ``,
    `## Contact`,
  ];
  if (biz.phone) lines.push(`- Phone: ${biz.phone}`);
  if (biz.email) lines.push(`- Email: ${biz.email}`);
  if (biz.address) lines.push(`- Address: ${biz.address}`);
  lines.push(``, `## Pages`, `- [${spec.meta.title.value}](${canonical})`);
  if (ctx.locales.length > 1) {
    lines.push(``, `## Languages`);
    for (const l of ctx.locales) {
      lines.push(`- ${l}: ${absUrl(ctx.baseUrl, localePath(ctx.path, l, ctx.defaultLocale))}`);
    }
  }
  return lines.join("\n") + "\n";
}

/** Deploy notes for the humans/agents shipping this directory. */
function deployMd(ctx: SiteContext, target: DeployTarget, fnd: Foundation, appName: string): string {
  const lines: string[] = [
    `# Deploy, ${appName}`,
    ``,
    `Target: **${target}** · Origin: ${ctx.baseUrl}`,
    ``,
    `Everything in this directory is the site. Upload it as-is.`,
    ``,
    `## Platform notes`,
  ];
  if (target === "cloudflare") {
    lines.push(
      `- Cloudflare Pages reads \`_headers\` and \`_redirects\` natively.`,
      `- Ship: \`npx wrangler pages deploy .\` (or connect the repo in the dashboard).`,
    );
  } else if (target === "netlify") {
    lines.push(`- Netlify reads \`_headers\` and \`_redirects\` natively. Drag-drop or \`netlify deploy\`.`);
  } else if (target === "vercel") {
    lines.push(
      `- Vercel does NOT read \`_headers\`/\`_redirects\`, translate them into \`vercel.json\` before shipping (not yet emitted; keep the values identical).`,
    );
  } else {
    lines.push(
      `- Generic static host: \`_headers\`/\`_redirects\` are Cloudflare/Netlify conventions. Configure the same headers (see \`_headers\`) at your server/CDN, or accept reduced hardening.`,
    );
  }
  lines.push(
    ``,
    `## Security headers`,
    `- CSP is **enforcing**: script-src carries sha256 hashes of the exact inline scripts this build emitted (deterministic), so no 'unsafe-inline' for scripts. If you hand-edit any inline script, rebuild; the hash will no longer match and the browser will refuse to run it. style-src keeps 'unsafe-inline' (one compiled style block) as the stated v1 tradeoff.`,
    `- HSTS ships max-age only. \`includeSubDomains\`/\`preload\` are opt-in via \`site.hsts\` because they can break unrelated subdomains and preload is semi-permanent.`,
    ``,
    `## What is NOT in this directory`,
  );
  if (fnd.env.length) {
    lines.push(`- Env vars the deploy needs: ${fnd.env.map((e) => `\`${e.name}\` (${e.requiredAt})`).join(", ")}.`);
  } else {
    lines.push(`- No env vars. The renderer never reads \`process.env\` (determinism guarantee).`);
  }
  lines.push(
    `- Any fonts/assets referenced by the pack under \`/fonts/*\` or \`/assets/*\` must be present in this directory, run \`site-spec audit\` to catch dangling references before shipping.`,
    ``,
    `## Declared backend surface`,
    `- Cookies: ${fnd.cookies.length ? fnd.cookies.map((c) => c.name).join(", ") : "none"}.`,
    `- Analytics: ${fnd.analytics.provider}.`,
    `- Forms: ${fnd.forms.length ? fnd.forms.map((f) => `\`${f.id}\` → ${f.endpoint}`).join(", ") : "none"}.`,
    ``,
    `See \`foundation.json\` for the machine-readable version (the auditor enforces it).`,
  );
  return lines.join("\n") + "\n";
}

/**
 * Compile a SiteSpec + Brief into a deployable static site: the HTML plus the
 * machine-readable correctness layer (sitemap, robots, llms.txt, headers,
 * redirects, 404, favicon, foundation manifest, deploy notes). This is the
 * product, every site ships these whether the owner knows they exist or not.
 */
export function buildSite(input: BuildSiteInput): Record<string, string> {
  const parsed = siteContext.parse(input.site);
  // Subpath deploys (ctx.path "/listing"): the emitted favicon.svg lives inside
  // this directory, so the default icon link must carry the base path or it
  // 404s at the origin root. Custom icon paths are left exactly as given.
  const base = basePath(parsed);
  const ctx =
    parsed.icons.svg === "/favicon.svg" && base !== ""
      ? { ...parsed, icons: { ...parsed.icons, svg: `${base}/favicon.svg` } }
      : parsed;
  const fnd = foundation.parse(input.foundation ?? {});
  const target: DeployTarget = input.target ?? "cloudflare";
  const appName = resolveAppName(ctx, input.spec, input.brief.business.name);
  const html = render({
    spec: input.spec,
    pack: input.pack,
    ...(input.manifest ? { manifest: input.manifest } : {}),
    brief: input.brief,
    site: ctx,
  });
  const html404 = notFoundHtml(input.spec, ctx, appName);
  const files: Record<string, string> = {
    "index.html": html,
    "404.html": html404,
    "manifest.json": manifestJson(input.spec, ctx, appName),
    "sitemap.xml": sitemapXml(ctx),
    "robots.txt": robotsTxt(ctx),
    "llms.txt": llmsTxt(input.brief, input.spec, ctx),
    // hash inputs = every emitted page, so the CSP provably matches the output
    "_headers": headersFile(input.spec, ctx, fnd, [html, html404]),
    "_redirects": redirectsFile(ctx),
    "foundation.json": JSON.stringify(fnd, null, 2) + "\n",
    "DEPLOY.md": deployMd(ctx, target, fnd, appName),
  };
  // the default favicon link must never dangle; custom paths ship their own file
  if (ctx.icons.svg === `${basePath(ctx)}/favicon.svg` || ctx.icons.svg === "/favicon.svg") {
    files["favicon.svg"] = faviconSvg(input.spec, appName);
  }
  return files;
}
