# @site-spec/core

The compiler core: SiteSpec schemas, the section/pack system, policies, UI
primitives, and the deterministic renderer. No AI, no providers, no network —
everything here runs offline.

## Package map

```
src/
  version.ts            SchemaVer (MODEL-REVISION-ADDITION) + breaking-change check   (D3)
  fields.ts             FactField vs CopyField — the grounding type split             (D1)
  schema/
    brief.ts            the Brief (compiler "source code") + getByPath resolver
    theme.ts            palette / type / spacing tokens — the Canva→Pack bridge        (D6)
    asset.ts            AssetRef + resolved manifest                                   (D5)
    section.ts          SectionInstance + SectionModule + defineSection                (D7)
    pack.ts             Pack + definePack + registerSections
    policy.ts           Policy + scope/tier scheduling metadata                        (D4)
    site-spec.ts        the SiteSpec IR (the artifact)                                 (M1)
    validation-result.ts
  ui/
    escape.ts           context-aware escaping + URL scheme allowlist                  (§5)
    primitives.ts       ui.* — pure (data, ctx) -> string, no raw HTML                 (D7)
  render/
    context.ts          frozen RenderContext (no ambient state)                        (D5)
    render.ts           SiteSpec -> deterministic HTML
    base-css.ts         theme-variable-driven base stylesheet
  policies/             facts-grounded, required-meta, one-h1
  validate/             validateSiteSpec: structural -> per-section -> policies
  packs/restaurant/     the first pack — 6 sections + placeholder theme               (M6)
```

## Commands (from repo root)

```bash
npm run typecheck   # tsc -b, strict
npm test            # vitest run (also emits examples/restaurant.html)
```

## Decision: Zod as the schema source (for now)

The architecture review (§3) preferred **JSON Schema** as the versioned public
contract, with runtime validators derived. We deliberately use **Zod as the
source** for the internal MVP because:

- the product is **internal**; we sell output, not the schema (no external
  consumers need a portable JSON Schema yet — §7-B), and
- Zod gives runtime validation + TS types + editor-introspectable field metadata
  from one definition, which is the fastest path to a *validating* schema.

This is a **reversible** call: `zod-to-json-schema` can emit the JSON Schema
artifact (and the additive-only CI diff guard) if/when we externalize the engine.
Until then, SchemaVer + the additive discipline live at the Zod layer.
