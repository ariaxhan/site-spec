# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
