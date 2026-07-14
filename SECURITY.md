# Security Policy

## Supported versions

site-spec is pre-1.0. Security fixes land on the latest `0.x` release.

## Reporting a vulnerability

Please report security issues privately using GitHub's
[private vulnerability reporting](https://github.com/ariaxhan/site-spec/security/advisories/new)
rather than opening a public issue.

Include a description, reproduction steps, and the potential impact. You can
expect an initial response within a few days. Please give us a reasonable window
to release a fix before any public disclosure.

## Scope notes

site-spec renders untrusted content into HTML. The most relevant classes of
issue are:

- **Injection / XSS** — a path where Brief or spec content reaches output
  unescaped (UI primitives are supposed to make this impossible; a bypass is a
  valid report).
- **Policy bypass** — output that violates a security or grounding policy the
  compiler is supposed to enforce.
- **Supply chain** — issues in the dependency set (`npm audit` runs in CI).
