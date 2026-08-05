/**
 * HTML rendering for the hosted auditor.
 *
 * Everything interpolated here is attacker-controlled: the target URL comes
 * from a query string, and finding messages quote raw markup from the audited
 * page (`<img ...>` fragments, for example). `esc` is therefore applied to
 * every single interpolation, without exception.
 */

import type { AuditFinding, AuditReport } from "@site-spec/core/audit";
import { LIMITS } from "./crawl";
import type { CrawlMeta } from "./crawl";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The checks this hosted endpoint actually runs, in reporting order.
 * Keeping the list explicit is what lets the report say "this passed" rather
 * than only "we found nothing", and it is the source of the coverage list.
 */
const CHECKS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "audit/robots-missing", label: "robots.txt is present" },
  { id: "audit/robots-stale-token", label: "robots.txt uses current crawler tokens" },
  { id: "audit/robots-blocks-ai-search", label: "AI search agents are not blocked" },
  { id: "audit/sitemap-missing", label: "sitemap.xml is present" },
  { id: "audit/llms-missing", label: "llms.txt is present" },
  { id: "audit/404-missing", label: "a real 404 page is served" },
  { id: "audit/headers-missing", label: "security and cache headers are set" },
  { id: "audit/headers-stale", label: "no dead or harmful header config" },
  { id: "audit/csp-report-only-theater", label: "CSP report-only has a report endpoint" },
  { id: "audit/hsts-preload", label: "HSTS does not carry preload" },
  { id: "audit/cache-policy-missing", label: "Cache-Control is declared" },
  { id: "audit/noindex", label: "the site is not accidentally noindexed" },
  { id: "audit/title-missing", label: "every page has a title" },
  { id: "audit/description-missing", label: "every page has a meta description" },
  { id: "audit/canonical-missing", label: "every page declares a canonical URL" },
  { id: "audit/jsonld-missing", label: "structured data (JSON-LD) is present" },
  { id: "audit/jsonld-invalid", label: "structured data parses as valid JSON" },
  { id: "audit/jsonld-self-serving-rating", label: "no self-serving review markup" },
  { id: "audit/og-missing", label: "Open Graph card is present" },
  { id: "audit/twitter-card-no-image", label: "large-image social cards have an image" },
  { id: "audit/h1-count", label: "exactly one h1 per page" },
  { id: "audit/empty-body", label: "content is server-rendered, not JS-only" },
  { id: "audit/viewport-lock", label: "viewport does not block zoom" },
  { id: "audit/img-alt-missing", label: "images have alt text" },
  { id: "audit/img-dims-missing", label: "images declare width and height" },
  { id: "audit/lcp-image-lazy", label: "the first image is not lazy-loaded" },
  { id: "audit/mixed-content", label: "no insecure http subresources" },
  { id: "audit/inline-handler", label: "no inline event handlers" },
  { id: "audit/google-fonts-cdn", label: "fonts are not served from Google's CDN" },
  { id: "audit/tracker-detected", label: "analytics and tracker surface" },
  { id: "audit/cookie-detected", label: "cookie writes" },
];

/** What this endpoint deliberately does NOT check. Overstating coverage would
 *  make a correctness tool worse than useless. */
const NOT_CHECKED: ReadonlyArray<string> = [
  "Broken internal links and missing assets. A partial crawl cannot prove a file is absent from the server, so these checks are disabled here. The CLI runs them against a local directory.",
  "Anything that needs a real browser: JavaScript-rendered content, layout, contrast, focus order. The engine reads HTML as text.",
  "Full WCAG accessibility. The CLI's `npm run verify:a11y` drives axe-core in a real browser; this endpoint only does the markup-level subset above.",
  "HTML validity and schema.org vocabulary validation. Those are the CLI's html-validate and schemarama gates.",
  "Page speed, Core Web Vitals and real load timing.",
  "Pages beyond the crawl cap, non-HTML resources, and any origin other than the one you submitted.",
  "Whether your content is accurate, useful, or true.",
];

const STYLE = `
:root{--bg:#fbfaf8;--fg:#1a1a19;--dim:#6b6a66;--line:#dedbd4;--card:#fff;--err:#a4243b;--warn:#8a6a12;--ok:#2f6b47;--accent:#1a1a19}
@media (prefers-color-scheme:dark){:root{--bg:#131311;--fg:#e8e6e1;--dim:#95928b;--line:#2c2b28;--card:#1b1b19;--err:#e0798d;--warn:#d6ad4e;--ok:#7fbf95;--accent:#e8e6e1}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 ui-serif,Georgia,"Iowan Old Style",Palatino,serif;-webkit-text-size-adjust:100%}
.wrap{max-width:56rem;margin:0 auto;padding:3rem 1.25rem 5rem}
h1{font-size:1.5rem;letter-spacing:-.01em;margin:0 0 .35rem}
h2{font-size:.78rem;text-transform:uppercase;letter-spacing:.11em;margin:2.5rem 0 .9rem;color:var(--dim);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600}
p{margin:0 0 1rem}
a{color:var(--fg)}
.lede{color:var(--dim);margin-bottom:2rem;max-width:40rem}
form{display:flex;gap:.5rem;flex-wrap:wrap}
input[type=url],input[type=text]{flex:1 1 20rem;min-width:0;padding:.7rem .8rem;font:15px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:2px}
input:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
button{padding:.7rem 1.4rem;font:600 15px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--bg);background:var(--accent);border:1px solid var(--accent);border-radius:2px;cursor:pointer}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.tiles{display:flex;flex-wrap:wrap;gap:1.75rem;padding:1.1rem 1.25rem;border:1px solid var(--line);background:var(--card);border-radius:2px}
.tile .n{font:600 1.6rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;display:block}
.tile .k{font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--dim);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.err{color:var(--err)}.warn{color:var(--warn)}.ok{color:var(--ok)}
ul.f{list-style:none;padding:0;margin:0;border-top:1px solid var(--line)}
ul.f li{padding:.85rem 0;border-bottom:1px solid var(--line)}
.tag{font:600 .68rem ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.08em;padding:.1rem .4rem;border:1px solid currentColor;border-radius:2px;vertical-align:.08em}
.cid{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.8rem;color:var(--dim)}
.msg{margin:.4rem 0 0;overflow-wrap:anywhere}
.fix{margin:.3rem 0 0;color:var(--dim);font-size:.92rem;overflow-wrap:anywhere}
.pass{columns:2 15rem;column-gap:2rem;list-style:none;padding:0;margin:0;font-size:.9rem}
.pass li{padding:.16rem 0;break-inside:avoid;color:var(--dim)}
.pass li::before{content:"\\2713";color:var(--ok);margin-right:.5rem;font-family:ui-monospace,monospace}
.note{border-left:2px solid var(--line);padding:.15rem 0 .15rem .9rem;margin:0 0 .7rem;color:var(--dim);font-size:.92rem}
.bad{border:1px solid var(--err);color:var(--err);padding:.9rem 1.1rem;border-radius:2px;margin-bottom:1.5rem;overflow-wrap:anywhere}
footer{margin-top:3.5rem;padding-top:1.25rem;border-top:1px solid var(--line);color:var(--dim);font-size:.85rem}
table{border-collapse:collapse;width:100%;font-size:.9rem}
td{padding:.3rem .9rem .3rem 0;vertical-align:top;border-bottom:1px solid var(--line)}
td:first-child{color:var(--dim);white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.8rem}
.scroll{overflow-x:auto}
`;

function shell(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="Audit any website's invisible foundation: SEO, accessibility, privacy, structured data and AI searchability.">
<meta name="robots" content="index,follow">
<style>${STYLE}</style></head><body><div class="wrap">${body}</div></body></html>`;
}

const FORM = (value = ""): string => `<form action="/audit" method="get">
<label for="url" style="position:absolute;left:-9999px">Website URL</label>
<input id="url" name="url" type="text" inputmode="url" spellcheck="false" autocapitalize="off"
 placeholder="example.com" value="${esc(value)}" required>
<button type="submit">Audit</button>
</form>`;

const FOOTER = `<footer>
<p>site-spec is open source (Apache-2.0).
<a href="https://github.com/ariaxhan/site-spec">Source</a> ·
<a href="https://www.npmjs.com/package/site-spec">npm</a> ·
run the full check set locally with <span class="mono">npx site-spec audit --url example.com</span></p>
</footer>`;

export function renderHome(): string {
  return shell(
    "site-spec — audit any website's invisible foundation",
    `<h1>site-spec</h1>
<p class="lede">Audit the machine-readable layer underneath a website: crawl policy, structured
data, canonical and noindex signals, response headers, accessibility semantics, and the tracker
surface. Deterministic checks, no account, no score out of 100.</p>
${FORM()}
<h2>What this checks</h2>
<ul class="pass">${CHECKS.map((c) => `<li>${esc(c.label)}</li>`).join("")}</ul>
<h2>What this does not check</h2>
${NOT_CHECKED.map((n) => `<p class="note">${esc(n)}</p>`).join("")}
<h2>Limits</h2>
<p class="note">Up to ${LIMITS.maxPages} pages per audit, ${Math.round(
      LIMITS.maxBytesPerResponse / 1000,
    )} KB per response, ${LIMITS.totalTimeoutMs / 1000}s total. Public hosts only: requests to
private, loopback and link-local addresses are refused. Rate limited per IP.</p>
${FOOTER}`,
  );
}

export function renderError(message: string, target: string, status: number): string {
  return shell(
    "site-spec — cannot audit that URL",
    `<h1>site-spec</h1>
<div class="bad"><strong>HTTP ${status}.</strong> ${esc(message)}</div>
${FORM(target)}
${FOOTER}`,
  );
}

function findingItem(f: AuditFinding): string {
  const cls = f.severity === "error" ? "err" : "warn";
  return `<li>
<span class="tag ${cls}">${f.severity}</span>
<span class="cid">${esc(f.checkId)}${f.file ? ` · ${esc(f.file)}` : ""}</span>
<p class="msg">${esc(f.message)}</p>
${f.fix ? `<p class="fix">Fix: ${esc(f.fix)}</p>` : ""}
</li>`;
}

export function renderReport(report: AuditReport, meta: CrawlMeta, target: string): string {
  const errors = report.findings.filter((f) => f.severity === "error");
  const warnings = report.findings.filter((f) => f.severity === "warning");
  const fired = new Set(report.findings.map((f) => f.checkId));
  const passed = CHECKS.filter((c) => !fired.has(c.id));

  const group = (title: string, list: AuditFinding[], cls: string): string =>
    list.length === 0
      ? ""
      : `<h2><span class="${cls}">${esc(title)} (${list.length})</span></h2>
<ul class="f">${list.map(findingItem).join("")}</ul>`;

  return shell(
    `site-spec audit — ${meta.origin}`,
    `<h1>site-spec</h1>
${FORM(target)}

<h2>Result</h2>
<div class="tiles">
<div class="tile"><span class="n ${errors.length ? "err" : "ok"}">${errors.length}</span><span class="k">errors</span></div>
<div class="tile"><span class="n ${warnings.length ? "warn" : "ok"}">${warnings.length}</span><span class="k">warnings</span></div>
<div class="tile"><span class="n ok">${passed.length}</span><span class="k">checks passed</span></div>
<div class="tile"><span class="n">${report.pages.length}</span><span class="k">pages read</span></div>
</div>

<h2>What was audited</h2>
<div class="scroll"><table>
<tr><td>target</td><td class="mono">${esc(meta.startUrl)}</td></tr>
${meta.finalUrl !== meta.startUrl ? `<tr><td>resolved to</td><td class="mono">${esc(meta.finalUrl)}</td></tr>` : ""}
<tr><td>pages</td><td class="mono">${meta.fetched.map((p) => esc(p)).join("<br>") || "none"}</td></tr>
<tr><td>requests</td><td class="mono">${meta.subrequests}</td></tr>
</table></div>
${meta.notes.map((n) => `<p class="note">${esc(n)}</p>`).join("")}

${group("Errors", errors, "err")}
${group("Warnings", warnings, "warn")}
${
  report.findings.length === 0
    ? `<h2><span class="ok">No findings</span></h2><p>Every check below passed on the pages that were read.</p>`
    : ""
}

<h2>Checks that passed (${passed.length})</h2>
<ul class="pass">${passed.map((c) => `<li>${esc(c.label)}</li>`).join("")}</ul>

<h2>What this audit did not check</h2>
${NOT_CHECKED.map((n) => `<p class="note">${esc(n)}</p>`).join("")}
${FOOTER}`,
  );
}
