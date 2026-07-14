# Contributing to site-spec

Thanks for your interest. site-spec is a deterministic website compiler, and the
contribution bar exists to protect that determinism. Read
[`docs/design-philosophy.md`](./docs/design-philosophy.md) before proposing
architectural changes.

## Ground rules (non-negotiable)

1. **Determinism.** Same spec + same pack must produce byte-identical output.
   No wall-clock time, randomness, or network access in the render path.
2. **The engine stays generic.** All vertical/industry knowledge lives in a
   **Pack**. Never teach the core what a restaurant (or any business) is.
3. **No raw HTML in sections.** Compose UI primitives (`ui.*`). They carry the
   accessibility, escaping, and lazy-loading guarantees.
4. **Everything factual traces to the Brief.** Do not let a section invent facts.
5. **Do not pull generation ahead of specification.** Generation is the last
   milestone by design.
6. **No AI/authorship attribution** in commits, PRs, code comments, or any
   committed artifact.

## Development

Requires Node 20+.

```bash
npm install
npm test          # unit + golden tests
npm run verify    # html-validate + JSON-LD + axe accessibility
npm run typecheck
```

All four must be green before a PR is merged. CI runs the same gate.

### Regenerating golden output

Rendered demo output in `examples/` is byte-checked. If a change legitimately
alters output, regenerate and review the diff:

```bash
UPDATE_CONFIGS=1 npx vitest run packages/core/test/site-configs.test.ts
UPDATE_GOLDEN=1  npx vitest run packages/core/test/golden.test.ts
```

Commit the regenerated `examples/` and `sites/` alongside the code change.

## Adding a pack (a new vertical)

A pack is a versioned design system + section set. Use the existing
`packages/core/src/packs/restaurant` and `.../catering` packs as references.
Every pack must:

- register its sections and declare its theme tokens (no inline CSS);
- pass all policies (SEO, a11y, security, grounding);
- ship a fixture and a golden output directory;
- use only fictional, non-identifying demo data (fictional business names,
  `555-01xx` phone numbers, `.example` domains — never real business data).

## Pull requests

- One logical change per PR. Conventional commit messages
  (`type(scope): description`).
- Describe what changed and why; link any related issue.
- Keep diffs minimal — don't restructure unrelated code.

## Reporting bugs

Open an issue with a reproduction: the input config/spec, the command you ran,
and the actual vs. expected output.
