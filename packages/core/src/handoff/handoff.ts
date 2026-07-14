import type { BuildSiteInput } from "../build/build-site";
import { siteContext, localePath, absUrl } from "../schema/site";
import { foundation } from "../schema/foundation";
import { resolveAppName } from "../seo/jsonld";

/**
 * The frontend handoff contract, the document a design/frontend agent receives
 * before touching the visible layer. Everything a frontend agent might invent
 * (routes, facts, form endpoints, cookies, analytics, the <head>) is pre-decided
 * here; the auditor enforces it afterward. The agent styles; it does not
 * invent backend reality.
 */

interface HandoffFact {
  sectionId: string;
  path: string;
  value: unknown;
  source: string;
}

interface HandoffCopy {
  sectionId: string;
  path: string;
  value: string;
  locked: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Walk a section's content collecting fact/copy fields with their paths. */
function walkFields(
  sectionId: string,
  node: unknown,
  path: string,
  facts: HandoffFact[],
  copies: HandoffCopy[],
): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => walkFields(sectionId, item, `${path}[${i}]`, facts, copies));
    return;
  }
  if (!isRecord(node)) return;
  if (node["kind"] === "fact" && typeof node["source"] === "string") {
    facts.push({ sectionId, path, value: node["value"], source: node["source"] });
    return;
  }
  if (node["kind"] === "copy" && typeof node["value"] === "string") {
    copies.push({
      sectionId,
      path,
      value: node["value"],
      locked: node["locked"] === true,
    });
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    walkFields(sectionId, value, path ? `${path}.${key}` : key, facts, copies);
  }
}

/** Files whose content the compiler owns, a frontend agent never edits these. */
export const COMPILER_OWNED = [
  "the <head> of every page (metadata, canonical, hreflang, OG, JSON-LD)",
  "sitemap.xml",
  "robots.txt",
  "llms.txt",
  "manifest.json",
  "_headers",
  "_redirects",
  "404.html",
  "foundation.json",
  "favicon.svg",
] as const;

/**
 * Build the handoff document from the same inputs as buildSite. Pure data
 * the CLI writes it as handoff.json.
 */
export function buildHandoff(input: BuildSiteInput): Record<string, unknown> {
  const ctx = siteContext.parse(input.site);
  const fnd = foundation.parse(input.foundation ?? {});
  const appName = resolveAppName(ctx, input.spec, input.brief.business.name);
  const canonical = absUrl(
    ctx.baseUrl,
    localePath(ctx.path, ctx.defaultLocale, ctx.defaultLocale),
  );

  const facts: HandoffFact[] = [];
  const copies: HandoffCopy[] = [];
  for (const section of input.spec.sections) {
    walkFields(section.id, section.content, "", facts, copies);
  }

  return {
    specVersion: input.spec.specVersion,
    pack: input.spec.pack,
    appName,
    routes: [
      {
        path: ctx.path,
        canonical,
        title: input.spec.meta.title.value,
        description: input.spec.meta.description.value,
        lang: input.spec.meta.lang,
        locales: ctx.locales,
      },
    ],
    sections: input.spec.sections.map((s) => ({
      id: s.id,
      type: s.type,
      ...(s.tone ? { tone: s.tone } : {}),
    })),
    facts,
    copy: copies,
    rules: {
      claims:
        "Only the values in `facts` may be stated as fact. Everything else is copy, persuasive, not factual. Adding a new factual claim requires a new Brief field.",
      cookies: fnd.cookies.length
        ? `Declared cookies: ${fnd.cookies.map((c) => c.name).join(", ")}. No others may be set.`
        : "This site sets no cookies. Any document.cookie write fails audit.",
      analytics:
        fnd.analytics.provider === "none"
          ? "No analytics. Any tracker script fails audit."
          : `Analytics provider: ${fnd.analytics.provider}. No other trackers.`,
      forms: fnd.forms.length
        ? "Every <form> must keep its declared id and field names (see `forms`). No new forms without a contract."
        : "This site has no forms. Adding a <form> requires a contract in foundation.json.",
      images:
        "Every <img> needs alt text; width/height strongly recommended (audit warns).",
      accessibility:
        "axe serious/critical = fail, at 375px and 1440px. Keep the skip link and the single H1.",
      compilerOwned: COMPILER_OWNED,
    },
    forms: fnd.forms,
    deploy: {
      target: input.target ?? "cloudflare",
      baseUrl: ctx.baseUrl,
      headersFile: "_headers (compiler-owned)",
    },
  };
}
