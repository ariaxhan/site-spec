# Contributing to site-spec

Thanks for your interest. site-spec audits and repairs the invisible foundation
of any website. The most valuable contributions are **new checks** and **new
fixers** — and the bar exists to keep them trustworthy.

## Ground rules (non-negotiable)

1. **The engine is pure and deterministic.** `@site-spec/core` never touches the
   network or filesystem. Same input file map → the same report and the same
   fixes, byte-for-byte. All I/O lives in the CLI.
2. **Checks are tuned against false positives.** A check that cries wolf on
   healthy sites is worse than no check. When something can't be decided reliably
   from the served markup/headers, it's a `warning`, not an `error` — or it isn't
   a check.
3. **A fixer never silently guesses.** Only apply an automatic fix when it's
   mechanical and safe (no real-world facts required). Anything needing facts is
   *scaffolded* with clear `TODO`s; anything a human must decide is reported as
   *manual* — never edited behind their back.
4. **Every finding carries a concrete fix string**, and (where safe) a fixer.
5. **Source-agnostic.** Checks audit the served output, not any particular
   toolchain. Don't assume a site was built by site-spec.
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

## Adding a check or a fixer

Checks live in `packages/core/src/audit/audit.ts`; fixers in
`packages/core/src/fix/fix.ts`. A good addition:

- decides purely from the served HTML/headers/robots/sitemap in the file map — no
  network, no DOM, no headless browser;
- is tuned against false positives (see ground rule 2);
- emits a `checkId`, a severity, and a concrete `fix` string;
- if it's safely auto-fixable, adds a fixer that classifies as `fixed`,
  `scaffolded`, or `manual` (ground rule 3);
- ships offline unit tests for both the check and the fixer.

The legacy compiler (`packages/core/src/packs/*`, `build`) is retained but is not
where new work should go — see `docs/design-philosophy.md` for that history.

## Pull requests

- One logical change per PR. Conventional commit messages
  (`type(scope): description`).
- Describe what changed and why; link any related issue.
- Keep diffs minimal — don't restructure unrelated code.

## Reporting bugs

Open an issue with a reproduction: the input config/spec, the command you ran,
and the actual vs. expected output.
