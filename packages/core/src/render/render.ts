import type { SiteSpec } from "../schema/site-spec";
import type { Pack } from "../schema/pack";
import type { AssetManifest } from "../schema/asset";
import type { Theme } from "../schema/theme";
import type { Brief } from "../schema/brief";
import { siteContext } from "../schema/site";
import type { SiteContext } from "../schema/site";
import { createRenderContext } from "./context";
import { escapeHtml, escapeAttr } from "../ui/escape";
import { BASE_CSS } from "./base-css";
import { buildSeoHead } from "../seo/head";
import { primaryEntityJsonLd, websiteJsonLd, resolveAppName } from "../seo/jsonld";
import { A11Y_PREPAINT, a11yWidget } from "../ui/a11y";

function themeCss(theme: Theme): string {
  const p = theme.palette;
  const t = theme.typography;
  const vars = [
    `--bg:${p.background}`,
    `--surface:${p.surface}`,
    `--text:${p.text}`,
    `--text-muted:${p.textMuted}`,
    `--primary:${p.primary}`,
    `--primary-text:${p.primaryText}`,
    `--accent:${p.accent}`,
    `--border:${p.border}`,
    `--heading:${p.heading ?? p.text}`,
    `--band-bg:${p.bandBackground ?? p.primary}`,
    `--band-text:${p.bandText ?? p.primaryText}`,
    `--band-text-muted:${p.bandTextMuted ?? p.bandText ?? p.primaryText}`,
    `--font-heading:${t.headingFamily}`,
    `--font-body:${t.bodyFamily}`,
    `--font-accent:${t.accentFamily ?? t.headingFamily}`,
    `--base-size:${t.baseSizePx}px`,
    `--tracking:${t.trackingEm ?? 0}em`,
    `--radius:${theme.radiusPx}px`,
    `--radius-control:${theme.controlRadiusPx ?? theme.radiusPx}px`,
    `--shadow-card:${theme.cardShadow ?? "none"}`,
    // cards carry either a shadow or a hairline border, never both
    `--card-border:${theme.cardShadow ? "0" : `1px solid ${p.border}`}`,
    `--press-scale:${theme.pressScale ?? 1}`,
  ].join(";");
  return `:root{${vars}}`;
}

/**
 * The engine-owned section shell: stable anchor id (the section type), the
 * tone class, and the width-constraining wrapper. Sections render inner
 * markup only, so structure and tone are uniform across every pack.
 */
function sectionShell(type: string, tone: string | undefined, inner: string): string {
  const toneClass = tone && tone !== "canvas" ? ` class="tone-${escapeAttr(tone)}"` : "";
  return `<section id="${escapeAttr(type)}"${toneClass}><div class="wrap">${inner}</div></section>`;
}

/** Minimal head when no SiteContext is supplied (offline preview, no SEO surface). */
function minimalHead(spec: SiteSpec): string {
  const fontLink = spec.theme.fontImportUrl
    ? `<link rel="stylesheet" href="${escapeAttr(spec.theme.fontImportUrl)}">`
    : "";
  return [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${escapeHtml(spec.meta.title.value)}</title>`,
    `<meta name="description" content="${escapeAttr(spec.meta.description.value)}">`,
    ...(fontLink ? [fontLink] : []),
  ].join("\n");
}

export interface RenderInput {
  spec: SiteSpec;
  pack: Pack;
  /** id -> resolved asset. Defaults to empty; missing refs render nothing. */
  manifest?: AssetManifest;
  /** the Brief — when given with `site`, drives JSON-LD structured data */
  brief?: Brief;
  /** deploy context — enables canonical, hreflang, OG, and structured data */
  site?: SiteContext;
}

/**
 * Compile a SiteSpec into a complete HTML document. Deterministic: same inputs
 * -> byte-identical output (M5 / D5). When `site` is supplied, emits the full
 * SEO/correctness surface (canonical, hreflang, OG, JSON-LD); always emits the
 * a11y widget + skip link + semantic <main>.
 */
/** First-party pack code still must not break out of its tag context. */
function assertEmbeddable(code: string, what: string): void {
  if (/<\/(style|script)/i.test(code)) {
    throw new Error(`pack ${what} must not contain a closing style/script tag`);
  }
}

export function render({ spec, pack, manifest = {}, brief, site }: RenderInput): string {
  const ctx = createRenderContext({ theme: spec.theme, manifest, lang: spec.meta.lang });

  const placed = { header: [] as string[], main: [] as string[], footer: [] as string[] };
  for (const instance of spec.sections) {
    const mod = pack.sections[instance.type];
    if (!mod) throw new Error(`Unknown section type: ${instance.type}`);
    const content = mod.content.parse(instance.content);
    const inner = mod.render(content, ctx);
    const html =
      mod.shell === false ? inner : sectionShell(instance.type, instance.tone, inner);
    placed[mod.placement ?? "main"].push(html);
  }
  const body = placed.main.join("\n");

  let head: string;
  let translate = "";
  if (site) {
    const sctx = siteContext.parse(site); // normalize defaults (icons, path)
    const appName = resolveAppName(sctx, spec, brief?.business.name);
    const jsonLd: Record<string, unknown>[] = [];
    if (brief) jsonLd.push(primaryEntityJsonLd(brief, spec, sctx));
    jsonLd.push(websiteJsonLd(spec, sctx, appName));
    head = buildSeoHead(spec, sctx, jsonLd, appName);
    translate = ` translate="no"`;
  } else {
    head = minimalHead(spec);
  }
  if (pack.css) assertEmbeddable(pack.css, "css");
  if (pack.script) assertEmbeddable(pack.script, "script");
  head += `\n<style>${themeCss(spec.theme)}${BASE_CSS}${pack.css ?? ""}</style>`;

  const document =
    `<!DOCTYPE html>\n<html lang="${escapeAttr(spec.meta.lang)}"${translate}>\n` +
    `<head>\n${A11Y_PREPAINT}\n${head}\n</head>\n` +
    `<body>\n` +
    `<a class="skip-link" href="#main">Skip to content</a>\n` +
    (placed.header.length ? `${placed.header.join("\n")}\n` : "") +
    `<main id="main">\n${body}\n</main>\n` +
    (placed.footer.length ? `${placed.footer.join("\n")}\n` : "") +
    `${a11yWidget()}\n` +
    (pack.script ? `<script>${pack.script}</script>\n` : "") +
    `</body>\n</html>\n`;

  return document;
}
