# Deploy, Rosalia's Kitchen

Target: **cloudflare** · Origin: https://rosalias.example

Everything in this directory is the site. Upload it as-is.

## Platform notes
- Cloudflare Pages reads `_headers` and `_redirects` natively.
- Ship: `npx wrangler pages deploy .` (or connect the repo in the dashboard).

## Security headers
- CSP is **enforcing**: script-src carries sha256 hashes of the exact inline scripts this build emitted (deterministic), so no 'unsafe-inline' for scripts. If you hand-edit any inline script, rebuild; the hash will no longer match and the browser will refuse to run it. style-src keeps 'unsafe-inline' (one compiled style block) as the stated v1 tradeoff.
- HSTS ships max-age only. `includeSubDomains`/`preload` are opt-in via `site.hsts` because they can break unrelated subdomains and preload is semi-permanent.

## What is NOT in this directory
- No env vars. The renderer never reads `process.env` (determinism guarantee).
- Any fonts/assets referenced by the pack under `/fonts/*` or `/assets/*` must be present in this directory, run `site-spec audit` to catch dangling references before shipping.

## Declared backend surface
- Cookies: none.
- Analytics: none.
- Forms: none.

See `foundation.json` for the machine-readable version (the auditor enforces it).
