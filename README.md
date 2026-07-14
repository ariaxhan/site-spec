# site-spec

> **Audit any website's invisible foundations — SEO, accessibility, privacy, structured data, performance, and AI searchability.**

[![CI](https://github.com/ariaxhan/site-spec/actions/workflows/ci.yml/badge.svg)](https://github.com/ariaxhan/site-spec/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

Every website has a layer you never see in the browser: the machine-readable
foundation that decides how it's ranked, read, rendered, and trusted — your
`robots.txt`, structured data, response headers, canonical/`noindex` signals,
accessibility semantics, tracker and cookie surface, and more. Most of it is
invisible until it's quietly costing you traffic, breaking your social previews,
or exposing you to a privacy complaint.

site-spec points at a live URL, crawls the site, and reports exactly what's
missing, stale, or broken — with a concrete fix for each finding:

```bash
npx site-spec audit https://yoursite.com
```

No account, no API key, no SaaS. It fetches the real pages and the real HTTP
response headers, follows the sitemap, and audits what crawlers and agents
actually see.

---

## What it checks

Seven areas, each check tuned against false positives (regex/string-level — no
headless browser needed for the crawl). Findings are `error` (breaks something)
or `warning` (worth a look), each with a concrete fix.

| Area | What it catches |
| --- | --- |
| **SEO / findability** | missing `<title>` / description / canonical · accidental `noindex` (both `<meta robots>` and the `X-Robots-Tag` header) · missing Open Graph cards (links unfurl as bare URLs) · zero-or-many `<h1>` · a sitemap that lists pages which don't exist |
| **Accessibility** | images with no `alt` · zoom-blocking viewport (`user-scalable=no`) · images with no width/height (layout shift) |
| **Privacy & security** | mixed content (`http://` asset on an `https://` page) · trackers + cookies with no consent/disclosure story · Google Fonts loaded from Google's CDN (a ruled GDPR violation) · header hygiene (HSTS preload risk, report-only CSP that reports nowhere, dead FLoC / `X-XSS-Protection` config) · inline `onclick=` handlers that block a future CSP |
| **Performance** | hero/LCP image set to `loading="lazy"` · no `Cache-Control` |
| **Structured data** | invalid JSON-LD (crawlers drop the whole block) · self-serving `aggregateRating`/`review` markup (a Google penalty since 2019) |
| **Integrity** | dangling assets that 404 · broken internal links |
| **AI searchability** | `robots.txt` blocking AI answer agents · dead crawler tokens · missing `llms.txt` · missing/broken structured data · client-rendered shells AI crawlers see as blank |

Run it against a live site, or against a build output directory:

```bash
site-spec audit https://yoursite.com        # crawl a live site
site-spec audit ./dist                        # audit a build/output folder
site-spec audit https://yoursite.com --json   # machine-readable report
site-spec audit https://yoursite.com --max 50 # crawl up to 50 pages
```

Exit code is non-zero when there are errors — drop it into CI to gate deploys.

---

## The sharp edge: AI searchability

Most SEO tools cover the first six areas. The one almost nobody checks yet is the
last: whether **Google, ChatGPT, Claude, and Perplexity** can actually find,
read, and cite you — because AI answer engines read your site through the same
machine layer crawlers do, and a lot of sites are accidentally invisible to them.
site-spec flags the exact failure modes:

- **`robots.txt` blocking AI search agents.** Blocking `OAI-SearchBot`,
  `ChatGPT-User`, `Claude-User`, `Claude-SearchBot`, `PerplexityBot`, or
  `Perplexity-User` removes you from the answers your visitors read. (Training
  crawlers are a separate token set — you can block those and stay in search.)
- **Deprecated crawler tokens.** `robots.txt` still naming retired tokens like
  `anthropic-ai` or `Claude-Web` is doing nothing.
- **No `llms.txt`.** No machine-readable summary for AI agents to ground on.
- **Missing or broken structured data.** No JSON-LD — or invalid JSON-LD, which
  crawlers drop entirely — means AI has no typed understanding of your entities.
- **Client-rendered shells.** A page that ships an empty `<body>` + a script
  bundle looks blank to AI crawlers and no-JS clients. site-spec flags pages with
  almost no server-rendered text.

It's the timely edge — not the whole story. The point is a **complete**
foundation audit; AI searchability is the part the rest of the field hasn't
caught up to.

---

## The other half: it also *builds* sites that pass its own audit

The auditor grew out of a **deterministic website compiler**. The idea: instead of
letting an AI write raw HTML (hallucinated facts, generic slop, broken
foundations), you describe a site as a validated intermediate representation — a
**`SiteSpec`** — and compile it:

```
Business Data → Brief → SiteSpec → Renderer → HTML
```

Same spec → byte-identical output, offline. The model (when generation lands —
it's the last milestone by design) only fills typed slots; it never writes markup
or invents facts. Every site the compiler emits passes the audit above by
construction — sitemap, robots, `llms.txt`, structured data, headers, and a full
deployable foundation, all correct.

```bash
npx site-spec build sites/restaurant/site.config.mjs --out ./out
npx site-spec audit ./out          # → PASS
```

This half is generic (the engine knows nothing about any industry — verticals
live in swappable **packs**), but it is secondary to the auditor. If you only
want to check a site you already have, you never need it. See
[`docs/design-philosophy.md`](./docs/design-philosophy.md) for the full compiler
rationale.

---

## Install

Requires Node 20+.

```bash
# one-off, against any URL:
npx site-spec audit https://yoursite.com

# or clone and run the whole thing offline:
git clone https://github.com/ariaxhan/site-spec.git
cd site-spec
npm install
npm test          # unit + golden tests
npm run verify    # html-validate + JSON-LD + axe over the demo output
```

### CLI

```
site-spec audit   <dir|url> [--max N] [--facts brief.json] [--mode strict|generic] [--json]
site-spec build   <site.config.mjs> --out <dir> [--target cloudflare|netlify|vercel|static]
site-spec handoff <site.config.mjs> [--out handoff.json]
```

---

## How the live crawl works

- Fetches the start URL, then discovers pages from `sitemap.xml` (including
  sitemap indexes) and same-origin links.
- Reads the **real HTTP response headers** — so header checks (HSTS, CSP,
  `Cache-Control`, `X-Robots-Tag`) run against what the server actually sends.
- Same-origin only, HTML only, small concurrency, per-request timeout, and a page
  cap (default 25, `--max` to raise). If the cap truncates a large site, it says
  so — nothing is silently dropped.
- The audit engine itself is **pure and deterministic** — no network, no
  filesystem. The crawler hands it a file map; the same map always yields the same
  report.

---

## Packages

| Package             | Responsibility                                                    |
| ------------------- | ----------------------------------------------------------------- |
| `@site-spec/core`   | The audit engine + the compiler (schemas, policies, primitives, renderer, packs) |
| `@site-spec/cli`    | `audit` (dir or url) · `build` · `handoff`                        |

## Documentation

- [`docs/design-philosophy.md`](./docs/design-philosophy.md) — the compiler
  rationale (why a spec, why packs, why policies, the anti-slop philosophy).
- [`docs/implementation-plan.md`](./docs/implementation-plan.md) — the milestone
  plan, built inside-out: specification → validation → rendering → generation.

## Contributing

Contributions welcome — especially new audit checks and packs. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md). Core rules: checks stay tuned against
false positives, the engine stays deterministic and network-free, and vertical
knowledge lives in packs.

## License

[Apache License 2.0](./LICENSE). © 2026 Aria Han.
