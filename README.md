# site-spec

> **A deterministic compiler for AI-generated websites — not another AI website generator.**

[![CI](https://github.com/ariaxhan/site-spec/actions/workflows/ci.yml/badge.svg)](https://github.com/ariaxhan/site-spec/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

Most AI website builders take a prompt and emit HTML directly:

```
prompt → HTML/CSS
```

That pipeline hallucinates facts, invents business hours, produces generic slop,
ships broken accessibility and weak SEO, and gives you a pile of markup you can't
diff, version, or safely regenerate.

**site-spec inverts it.** The website is not the artifact — the **specification**
is. An LLM never writes markup, never controls design, and never invents facts.
It fills typed slots in a validated intermediate representation called a
**`SiteSpec`**. Everything downstream is deterministic:

```
Business Data → Brief → SiteSpec → Renderer → HTML
```

Same spec + same pack → byte-identical output, every time, with zero network
access.

---

## Why this exists (the anti-slop thesis)

The model is the **least** interesting part of the system, on purpose. The value
is in the grammar, the compiler, and the validator that make it impossible for a
model to produce slop in the first place:

- The model **never writes HTML** — section authors compose UI primitives
  (`ui.cta`, `ui.image`) that bake in accessibility, escaping, lazy-loading, and
  analytics hooks. The correct thing is easier than the incorrect thing.
- The model **never controls design** — visual identity lives in a **Pack**
  (a versioned design system + section set for a vertical).
- The model **never invents facts** — every fact traces to the **Brief**. A
  grounding policy fails loudly when output claims something the Brief never
  stated.
- SEO, accessibility, security, and content quality are not prompts. They are
  **policies** — validations the compiler enforces structurally.

---

## Mental model: it's a compiler

| Compiler concept                 | site-spec equivalent |
| -------------------------------- | -------------------- |
| Source code                      | **Brief**            |
| Intermediate representation      | **SiteSpec**         |
| Standard library + design system | **Pack**             |
| Backend compiler target          | **Renderer**         |
| Compiled output                  | **HTML**             |

The `SiteSpec` stays stable while renderers change. HTML is just the first
backend — React, email, PDF, and an editor UI are all future targets that read
the same spec.

## The six guiding principles

```
Everything is a policy.
Everything renders through primitives.
Everything vertical lives in packs.
Everything factual traces to the Brief.
Everything editable has an ID.
Everything translatable is a key.
```

---

## Quickstart

Requires Node 20+.

```bash
git clone https://github.com/ariaxhan/site-spec.git
cd site-spec
npm install

# Run the full offline gate: types, tests, HTML validation,
# JSON-LD structured-data validation, and axe accessibility checks.
npm test
npm run verify
```

Compile the bundled demo (a fictional restaurant, "Rosalia's Kitchen") to a
deployable static site — no API keys, no network:

```bash
npx site-spec build sites/restaurant/site.config.mjs --out ./out
npx site-spec audit ./out
```

The CLI:

```
site-spec build   <site.config.mjs> --out <dir> [--target cloudflare|netlify|vercel|static]
site-spec audit   <dir> [--facts brief.json] [--mode strict|generic] [--json]
site-spec handoff <site.config.mjs> [--out handoff.json]
```

A site config is **pure data** — `{ pack, spec, brief, site, foundation?, copy? }` —
so it can be authored without a TypeScript toolchain in the loop. Demo configs
live in [`sites/`](./sites); their rendered, validated output lives in
[`examples/`](./examples).

---

## What's here today (and what isn't)

site-spec is built **inside-out**, deliberately:

```
Specification → Validation → Rendering → Generation
```

🟢 **The offline engine works.** `@site-spec/core` ships the SiteSpec schema (with
the fact/copy field split), the policy engine, UI primitives, the deterministic
renderer, the build pipeline (HTML + sitemap + robots + structured data + a full
deployable foundation), an audit mode that inspects any static output directory,
and two generic packs: **restaurant** and **catering**. A hand-authored SiteSpec
validates and renders to clean, accessible, structured-data-correct HTML with
zero network access. Everything is enforced by external validators
(`html-validate`, a vendored schema.org vocabulary, and `axe-core`), not just
byte-for-byte golden tests.

⚪ **Generation is intentionally last.** Wiring an LLM to fill Brief slots is the
final milestone — it is built *after* specification, validation, and rendering
all work offline. This is the one rule above all others:

> **Do not build the AI part first.** Build the grammar, compiler, and validator
> so well that the AI becomes the least interesting part of the system. If
> generation works before that exists, the architecture has failed.

---

## Packages

| Package             | Responsibility                                              |
| ------------------- | ---------------------------------------------------------- |
| `@site-spec/core`   | Schemas, sections, policies, UI primitives, renderer, build, audit |
| `@site-spec/cli`    | `build` · `audit` · `handoff`                              |

## Repository layout

```
packages/core   the engine — schema, policies, primitives, renderer, packs, audit
packages/cli    the command-line front door
sites/          pure-data demo site configs
examples/       rendered + validated demo output (golden)
tools/          external validators (html, JSON-LD, a11y)
docs/           design philosophy + implementation plan
```

## Documentation

- [`docs/design-philosophy.md`](./docs/design-philosophy.md) — *why* the
  architecture looks the way it does: the compiler framing, why packs and
  policies exist, and the anti-slop philosophy in full.
- [`docs/implementation-plan.md`](./docs/implementation-plan.md) — *what* to
  build, in what order (the M0–M13 milestones).

## Contributing

Contributions are welcome — especially new packs (verticals) and policies. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md). The core rule: preserve determinism, keep
the engine generic, and never pull generation ahead of specification.

## License

[Apache License 2.0](./LICENSE). © 2026 Aria Han.
