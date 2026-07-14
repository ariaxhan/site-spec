# site-spec — Architectural Rationale & Design Philosophy

> **Read this to understand _why_ the architecture looks the way it does.**
> The implementation plan tells you _what_ to build. This document records the
> reasoning, the decisions made during design discussions, the tradeoffs
> considered, and the long-term vision. The goal is to preserve **intent** so
> future contributors understand not only what site-spec does, but why it was
> designed this way.

---

## The one sentence to remember above everything else

> **Do not build the AI part first.**
>
> Build the grammar, compiler, and validator so well that the AI becomes the
> least interesting part of the system.

The real moat is not Gemini, Places, or generation. It is:

```
SiteSpec
  + Packs
  + Policies
  + UI Primitives
  + Deterministic Rendering
```

Everything else plugs into that.

---

## The Core Realization

The original project began as an **AI website generator**.

The architecture evolved after recognizing a fundamental problem: most AI
website generators produce websites directly.

```
Prompt
  ↓
HTML / CSS
```

This approach creates several issues:

- Hallucinated facts
- Inconsistent structure
- Poor accessibility
- Weak SEO
- Vendor lock-in
- Difficult editing
- Poor maintainability
- Unpredictable output
- Generic AI-generated content

The key realization was:

> **The website is not the artifact. The specification is.**

The architecture therefore became:

```
Business Data
  ↓
Brief
  ↓
SiteSpec
  ↓
Renderer
  ↓
HTML
```

This changes everything:

- The renderer becomes **deterministic**.
- The LLM becomes **constrained**.
- The specification becomes **portable**.
- The system becomes **testable**.

---

## The True Product

The project is **not a website generator**. It is a **website specification
system**.

The central artifact is the **SiteSpec** — not HTML, not a Page, not a Website.

The renderer is merely one backend. Future backends could include:

- HTML
- React
- Email
- PDF
- Editor UI
- Screenshot generation
- Static site export
- Native app surfaces

The specification remains stable. The renderer changes.

---

## Naming Decisions

The original proposed name was **Pagewright**. This was rejected because it:

- Sounds like a page-writing tool.
- Sounds artisanal and handcrafted.
- Emphasizes output rather than architecture.
- Does not reflect the actual design.

The architecture consistently revolved around: **Brief → SiteSpec → Pack →
Renderer**. The strongest concept already had a name: **SiteSpec**.

The chosen direction:

| Concept       | Name                                                   |
| ------------- | ------------------------------------------------------ |
| Repository    | `site-spec`                                            |
| Core artifact | `SiteSpec`                                             |
| Packages      | `@site-spec/core`, `@site-spec/providers`, `@site-spec/cli` |

The reasoning: the project already naturally speaks in terms of SiteSpecs.
People will say _"Generate a SiteSpec. Validate a SiteSpec. Render a SiteSpec.
Persist a SiteSpec. Version a SiteSpec."_ That language emerges naturally from
the architecture. That is a strong signal.

---

## Compiler Mental Model

One of the most important decisions: **treat site-spec as a compiler, not a
generator.**

| Compiler concept              | site-spec equivalent |
| ----------------------------- | -------------------- |
| Source code                   | **Brief**            |
| Intermediate representation   | **SiteSpec**         |
| Standard library + design system | **Pack**          |
| Backend compiler target       | **Renderer**         |
| Compiled output               | **HTML**             |

This framing explains many architectural decisions.

---

## Why Packs Exist

The Pack concept solves a key problem:

> How can the engine remain generic while supporting different industries and
> design systems?

The answer: **move all vertical intelligence into Packs.**

The engine knows:

- How to generate
- How to validate
- How to render

The Pack knows:

- What sections exist
- What content is allowed
- What designs exist
- What typography exists
- What voice exists

Examples:

```
Generic Local Pack        Photo-Booth Pack
  hero                      hero
  about                     packages
  gallery                   gallery
  hours                     how-it-works
  reviews                   occasions
  contact                   faq
                            booking
```

The engine never learns what a photo booth is. The Pack does.

---

## Section Architecture

A major refinement: **sections should not be loose render functions.** Each
section should be a self-contained module.

```
hero/
  schema.ts
  render.ts
  validate.ts
  index.ts
```

A section becomes:

```ts
defineSection({
  type,
  schema,
  policies,
  render,
});
```

This allows: validation, documentation, reuse, testing, discoverability.

---

## UI Primitive Philosophy

One of the most important architectural discoveries:

> **Section authors should not write HTML.**

Instead of:

```ts
return `<a href="${href}">${label}</a>`;
```

They should write:

```ts
ui.cta(...)
```

Instead of:

```html
<img src="...">
```

They should write:

```ts
ui.image(assetRef, {
  altKey,
  loading: "lazy",
});
```

This decision is critical. It lets the framework automatically enforce:

- Accessibility
- Analytics hooks
- Mobile behavior
- Lazy loading
- Security
- Styling consistency
- Asset validation

The philosophy:

> **Safe primitives. Unsafe escape hatches. The correct thing should be easier
> than the incorrect thing.**

---

## Policies

A major simplification: **everything should be a Policy.**

Instead of separate systems for SEO, Accessibility, Performance, Security,
Mobile, Architecture, and Content Quality — represent them all uniformly as a
`Policy`.

```ts
requiredMetaPolicy();
oneH1Policy();
altTextPolicy();
contrastPolicy();
factsGroundedPolicy();
```

The validator simply runs policies. This keeps the architecture small.

---

## Anti-Slop Philosophy

The project's strongest differentiator:

- The model never writes markup.
- The model never controls design.
- The model never invents facts.
- **The model fills slots.**

Everything else is controlled by the **Pack, Renderer, Validator, and Policy**.

The architecture intentionally prevents:

- Random Tailwind soup
- Inline CSS
- Invented business hours
- Hallucinated claims
- Generic AI website language

The model should be _unable_ to create these problems.

---

## The 30 Long-Term Quality Considerations

These emerged during architecture discussions. Not all belong in v1, but all
should remain part of the long-term roadmap.

1. **Provenance** — Track where information came from.
2. **Freshness** — Track when information was last verified.
3. **CTA Intent Modeling** — Represent user actions explicitly.
4. **Analytics Abstraction** — Provider-independent analytics hooks.
5. **Structured Data** — JSON-LD generation.
6. **Compliance** — Privacy, disclosures, attribution.
7. **Asset Licensing** — Track image rights and origins.
8. **Stable Section IDs** — Future editing support.
9. **Regeneration Safety** — Protect human edits.
10. **Diffability** — SiteSpec should be easy to compare.
11. **Internationalization** — Multiple languages.
12. **Localization** — Regional formatting behavior.
13. **Forms** — Structured form definitions.
14. **Static Hosting** — No runtime requirement.
15. **Graceful Degradation** — Missing data should not break sites.
16. **Copy Quality** — Avoid generic AI language.
17. **Category Sensitivity** — Industry-specific behavior.
18. **Crawlability** — Server-rendered semantic content.
19. **Link Integrity** — Validate references and anchors.
20. **Security** — Sanitization and escaping.
21. **Performance Budgets** — Asset and rendering constraints.
22. **Accessibility Semantics** — Beyond alt text.
23. **Shareability** — OG metadata and previews.
24. **Preview States** — Support generated preview sites.
25. **Observability** — Understand why generation failed.
26. **Determinism** — Same inputs produce same outputs.
27. **Cacheability** — Stable caching strategy.
28. **Pack Versioning** — Versioned rendering behavior.
29. **Schema Migration** — Forward evolution path.
30. **Editor Compatibility** — Future visual editing support.

---

## Core Quality Areas

Five major quality systems should eventually exist:

- SEO
- Accessibility
- Performance
- Responsive Design
- Security

Importantly: **these are not prompts. These are validations.** The system should
guarantee them structurally.

---

## Good Engineering Practices

The architecture should encourage good software design automatically:

- Content separate from rendering
- Stable contracts
- Modular sections
- Small reusable primitives
- Deterministic behavior
- Testability
- Low coupling
- High cohesion

The preferred pattern:

```
Section → Schema → Policies → Renderer
```

Not:

```
Random React Component
```

---

## The Guiding Principles

```
Everything is a policy.
Everything renders through primitives.
Everything vertical lives in packs.
Everything factual traces to Brief.
Everything editable has an ID.
Everything translatable is a key.
```

If future decisions align with those principles, the architecture will likely
remain coherent.

---

## V1 Philosophy

Do not build everything. Build the smallest version that proves the
architecture.

**Recommended V1:**

- SiteSpec schema
- Generic Local Pack
- 6 section types
- 2 palettes
- 2 type pairings
- Renderer
- Validator
- Policies
- Fixture SiteSpecs
- Offline tests

**Success condition:** A hand-authored SiteSpec can render into a
production-quality website offline.

Only after that should generation be added. Only after generation should
enrichment be added. Only after enrichment should consumers be integrated.

---

## Final Vision

The ambition is not _"AI generates websites."_

The ambition is:

> **Websites become portable, validated, versionable specifications.**

- The LLM is a **contributor**.
- The specification is the **product**.
- The renderer is the **compiler**.
- The pack is the **design system**.
- The validator is the **gatekeeper**.
- The SiteSpec is the **artifact**.
