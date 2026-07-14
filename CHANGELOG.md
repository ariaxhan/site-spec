# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-07-13

Audit any live website. The auditor becomes the headline capability.

### Added

- **Live URL audit + crawl** — `site-spec audit <url>` fetches a site, reads its
  real HTTP response headers, discovers pages via `sitemap.xml` (including
  sitemap indexes) and same-origin links, and audits every crawled page.
  Same-origin only, HTML only, per-request timeout, and a page cap (`--max`,
  default 25) that reports truncation instead of hiding it.
- **AI-searchability check: empty server-rendered body** (`audit/empty-body`) —
  flags pages that ship almost no server-rendered text but load scripts, i.e. a
  client-rendered shell that AI crawlers and no-JS clients see as blank.
- `linkChecks` option on the audit engine — file-presence-dependent checks
  (dangling refs, broken links, sitemap↔page parity) are skipped on a live crawl,
  where a partial fetch can't prove a resource is absent from the server.

### Changed

- **Positioning:** site-spec now leads as a **website-foundation auditor** —
  check any site's AI searchability, SEO, structured data, accessibility, and
  privacy. The deterministic compiler is the secondary half (it builds sites that
  pass the audit by construction).
- Foundation-manifest checks (form contracts, tracker/cookie declarations) now
  only apply when a `foundation.json` is present. On external sites, tracker and
  cookie usage is reported as generic privacy warnings instead.

## [0.1.0] — 2026-07-13

First public release. The offline engine spine.

### Added

- **`@site-spec/core`** — the deterministic compiler:
  - SiteSpec schema with the fact/copy field split (facts trace to the Brief;
    copy is translatable).
  - Policy engine — SEO, accessibility, security, and content-grounding checks
    represented uniformly as policies.
  - UI primitives — section authors compose `ui.*` instead of writing raw HTML;
    accessibility, escaping, and lazy-loading are baked in.
  - Deterministic renderer — same spec + same pack → byte-identical output,
    offline.
  - Build pipeline — HTML, sitemap, robots, structured data (JSON-LD), and a
    full deployable foundation.
  - Audit mode — inspect any static output directory against the policy set.
  - Two generic packs: **restaurant** and **catering**.
- **`@site-spec/cli`** — `build`, `audit`, and `handoff` commands over pure-data
  site configs.
- External-validator gate: `html-validate`, a vendored schema.org vocabulary for
  JSON-LD validation, and `axe-core` accessibility checks — not just byte-exact
  golden tests.
- Apache-2.0 license.

### Not included (by design)

- **Generation (LLM slot-filling).** It is the final milestone and is built only
  after specification, validation, and rendering all work offline.
