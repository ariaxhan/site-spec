# site-spec — Revised Implementation Plan

> **Read this first.** This document supersedes the original implementation
> milestones. The architecture evolved significantly after design review.
>
> The original plan assumed that **generation** was one of the core systems.
> The updated architecture treats generation as a **consumer of the
> specification system** rather than the center of the system. The order of
> implementation has changed accordingly.

See [`design-philosophy.md`](./design-philosophy.md) for the _why_ behind this
order.

---

## Before Writing Code

Before implementing anything, perform an **architectural review**. Your job is
not merely to execute this plan — your job is to **stress-test it**.

Specifically:

1. Look for unnecessary complexity.
2. Look for abstraction leaks.
3. Look for future migration problems.
4. Look for areas where policies, packs, sections, validators, or renderers
   overlap unnecessarily.
5. Look for places where the architecture could become difficult to maintain.
6. Identify anything that would make SiteSpec difficult to version.
7. Identify anything that would make Pack development difficult.
8. Identify anything that would make future editor support difficult.
9. Identify anything that would create vendor lock-in.
10. Propose improvements before implementation begins.

> Do not blindly follow this document. **Challenge it. Improve it.** Preserve the
> philosophy while optimizing the implementation.

---

## Revised Core Principle

The system should be built **from the inside out**, not from the outside in.

**Incorrect order:**

```
LLM → Generation → Website
```

**Correct order:**

```
Specification → Validation → Rendering → Generation
```

The specification layer must exist before generation.

---

## New Development Order

### M0 — Foundation

**Goal:** Establish project structure.

**Deliverables:** Monorepo · TypeScript strict · ESM · Vitest · CI · README ·
LICENSE.

No generation. No providers. No APIs. No external dependencies beyond tooling.

**Success condition:** Clean build. Clean tests.

---

### M1 — SiteSpec Contract

**Goal:** Define the language. _This is now the most important milestone._

**Deliverables:**

- Brief schema
- SiteSpec schema
- Section schema
- Pack schema
- Policy schema
- Asset schema
- ValidationResult schema

**Important:** Treat these as **public APIs**. Assume they must survive for
years.

**Success condition:** Hand-authored SiteSpec validates. Nothing renders yet.
Nothing generates yet.

---

### M2 — Section System

**Goal:** Define how packs and sections work.

**Deliverables:** `definePack()` · `defineSection()` · section registry ·
section schemas · section policies.

**Recommended section shape:**

```
section/
  schema.ts
  render.ts
  validate.ts
  index.ts
```

**Success condition:** Sections can be registered and validated. Still no
rendering. Still no generation.

---

### M3 — Policy Engine

**Goal:** Create a unified validation architecture. **Everything becomes a
policy.**

**Examples:** `oneH1Policy` · `requiredMetaPolicy` · `altTextPolicy` ·
`contrastPolicy` · `factsGroundedPolicy` · `validLinksPolicy`.

The validator should know nothing about SEO, accessibility, or security. It only
runs policies.

**Success condition:** Policies can validate SiteSpecs.

---

### M4 — UI Primitive Layer

**Goal:** Create safe rendering primitives.

**Examples:** `ui.heading()` · `ui.text()` · `ui.image()` · `ui.cta()` ·
`ui.address()` · `ui.hours()` · `ui.review()` · `ui.gallery()`.

Renderers should consume primitives, not directly write HTML where possible. The
primitive layer should automatically enforce: accessibility · escaping ·
analytics hooks · mobile defaults · semantic HTML.

**Success condition:** Section renderers can be built entirely from primitives.

---

### M5 — Renderer

**Goal:** Compile SiteSpec into HTML.

**Deliverables:** `render()` · `RenderContext` · HTML shell · theme application
· palette application · typography application.

**Important:** Rendering must be **deterministic**. Same spec + same pack should
produce identical output.

**Success condition:** Hand-authored SiteSpec produces HTML. Still no
generation.

---

### M6 — Generic Local Pack

**Goal:** Create the first real pack.

**Deliverables:** `hero` · `about` · `gallery` · `hours` · `reviews` ·
`contact`. Plus: 2 palettes · 2 typography pairings · copy guide · pack
policies.

**Success condition:** A complete local business website can be rendered
offline. _This is the first truly meaningful milestone._

---

### M7 — Quality System

**Goal:** Formalize production-quality requirements.

Implement baseline policies for: SEO · Accessibility · Security · Responsive
Design · Content Quality. **Not audits. Policies.**

**Examples:** meta title required · meta description required · one H1 · all
images require alt · all URLs validated · facts grounded to Brief.

**Success condition:** Rendered sites satisfy baseline quality requirements.

---

### M8 — Fixtures & Golden Tests

**Goal:** Create confidence.

**Deliverables:** Fixture Briefs · Fixture SiteSpecs · Golden HTML outputs ·
Validation fixtures · Failure fixtures.

**Success condition:** Core passes entirely offline. _This is a major gate._

---

### M9 — Generation

**Only now introduce AI.**

**Deliverables:** `LLMProvider` · Mock provider · Gemini provider · `generate()`
· repair loop.

> The LLM does not generate websites. **The LLM generates SiteSpecs.**

**Success condition:** Generated SiteSpecs validate successfully.

---

### M10 — Enrichment

**Add:** Places provider · Reviews provider · Image provider · Storage provider.

**Success condition:** Seed → Brief works.

---

### M11 — Build Pipeline

**Implement:** `discover()` · `enrich()` · `generate()` · `render()` ·
`build()`.

**Success condition:** Seed → HTML works.

---

### M12 — CLI

**Implement:** `site-spec validate` · `site-spec render` · `site-spec generate`
· `site-spec build`.

**Success condition:** Entire pipeline accessible from CLI.

---

### M13 — API

Optional reference server. Keep thin. No business logic.

**Success condition:** API wraps core.

---

## Architectural Questions To Re-Evaluate

Before each milestone, revisit these questions:

- **SiteSpec** — Can this schema survive 5 years?
- **Packs** — Can third parties create packs without reading engine internals?
- **Policies** — Are policies remaining generic? Or becoming special-case code?
- **Renderer** — Is rendering deterministic?
- **Sections** — Are sections becoming reusable modules? Or just React
  components with extra steps?
- **Generation** — Could generation providers be replaced tomorrow, without
  touching core? **If not, stop and redesign.**

---

## Non-Goals For V1

Do not build:

- Visual editor
- Multi-page sites
- CMS
- Authentication
- Hosting
- Payments
- Outreach
- Business state
- Lead management
- Claim flows
- Analytics providers

These belong to **consumers**.

---

## Definition of Success

A successful v1 is **not** _"AI generated a website."_

A successful v1 is:

> A hand-authored SiteSpec can be **validated, rendered, tested, versioned, and
> compiled into a production-quality website with zero network access**.

Once that works, generation becomes easy. **If generation works before that
exists, the architecture has failed.**
