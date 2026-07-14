# site-spec docs

Design documentation for site-spec. Read in this order:

1. **[design-philosophy.md](./design-philosophy.md)** — the architectural
   rationale. _Why_ site-spec is a compiler and not a generator, why packs and
   policies exist, the anti-slop philosophy, the long-term quality roadmap, and
   the guiding principles. Read this first.

2. **[implementation-plan.md](./implementation-plan.md)** — the milestone plan
   (M0–M13). Built inside-out: specification → validation → rendering →
   generation. Includes the pre-code architectural review checklist and the v1
   definition of success.

> The architecture is a **website compiler** centered on the `SiteSpec`
> artifact, not an "AI website generator." HTML is one compiled backend output.
