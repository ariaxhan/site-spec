import type { SiteSpec } from "../schema/site-spec";
import type { SiteContext } from "../schema/site";
import { localePath, absUrl } from "../schema/site";
import { escapeAttr, escapeHtml, escapeJsonLd } from "../ui/escape";

const OG_LOCALE: Record<string, string> = { en: "en_US", ko: "ko_KR", es: "es_ES" };

/**
 * Assembles the full <head> SEO/PWA surface every site must ship, the union of
 * what production marketing sites each need, with zero gaps:
 * canonical, hreflang (+x-default), robots/theme-color/format-detection meta,
 * favicons + apple-touch + manifest, apple/mobile web-app meta, Open Graph +
 * Twitter cards, web-font preconnect/preload, and JSON-LD.
 */
export function buildSeoHead(
  spec: SiteSpec,
  ctx: SiteContext,
  jsonLdBlocks: ReadonlyArray<Record<string, unknown>>,
  appName: string,
): string {
  const lang = spec.meta.lang;
  const title = spec.meta.title.value;
  const desc = spec.meta.description.value;
  const canonical = absUrl(ctx.baseUrl, localePath(ctx.path, lang, ctx.defaultLocale));
  const themeColor = ctx.themeColor ?? spec.theme.palette.background;

  const lines: string[] = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeAttr(desc)}">`,
    // crawl hints, rich snippets, large image/video previews
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`,
    `<meta name="theme-color" content="${escapeAttr(themeColor)}">`,
    `<meta name="format-detection" content="telephone=no">`,
  ];
  // Blocking browser translation is a per-site choice (protects brand names),
  // never a default: a hardcoded notranslate locks third-language visitors out.
  if (ctx.noTranslate) lines.push(`<meta name="google" content="notranslate">`);
  lines.push(`<link rel="canonical" href="${escapeAttr(canonical)}">`);

  // hreflang alternates + x-default, only when there are real alternates;
  // a lone self-referencing hreflang on a single-locale site is pure noise.
  if (ctx.locales.length > 1) {
    for (const loc of ctx.locales) {
      const href = absUrl(ctx.baseUrl, localePath(ctx.path, loc, ctx.defaultLocale));
      lines.push(`<link rel="alternate" hreflang="${escapeAttr(loc)}" href="${escapeAttr(href)}">`);
    }
    const xDefault = absUrl(ctx.baseUrl, localePath(ctx.path, ctx.defaultLocale, ctx.defaultLocale));
    lines.push(`<link rel="alternate" hreflang="x-default" href="${escapeAttr(xDefault)}">`);
  }

  // icons + PWA manifest, link only icons that actually ship (no dangling refs)
  lines.push(`<link rel="icon" type="image/svg+xml" href="${escapeAttr(ctx.icons.svg)}">`);
  if (ctx.icons.png96) {
    lines.push(
      `<link rel="icon" type="image/png" sizes="96x96" href="${escapeAttr(ctx.icons.png96)}">`,
    );
  }
  if (ctx.icons.appleTouch) {
    lines.push(
      `<link rel="apple-touch-icon" sizes="180x180" href="${escapeAttr(ctx.icons.appleTouch)}">`,
    );
  }
  const basePath = ctx.path === "/" ? "" : ctx.path.replace(/\/+$/, "");
  lines.push(`<link rel="manifest" href="${escapeAttr(`${basePath}/manifest.json`)}">`);

  // apple / mobile web-app meta
  lines.push(
    `<meta name="application-name" content="${escapeAttr(appName)}">`,
    `<meta name="apple-mobile-web-app-title" content="${escapeAttr(appName)}">`,
    `<meta name="apple-mobile-web-app-capable" content="yes">`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="default">`,
    `<meta name="mobile-web-app-capable" content="yes">`,
  );

  // Open Graph
  lines.push(
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeAttr(appName)}">`,
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(desc)}">`,
    `<meta property="og:url" content="${escapeAttr(canonical)}">`,
    `<meta property="og:locale" content="${escapeAttr(OG_LOCALE[lang] ?? lang)}">`,
  );
  if (ctx.ogImage) {
    // No og:image:width/height/type: the compiler cannot verify the remote
    // file's dimensions or format, and asserting unverified values lies to
    // every scraper that trusts them. Emit only what is known true.
    lines.push(
      `<meta property="og:image" content="${escapeAttr(ctx.ogImage)}">`,
      `<meta property="og:image:alt" content="${escapeAttr(title)}">`,
    );
  }

  // Twitter card, degrade honestly: a summary_large_image card with no image
  // renders a broken/blank preview, so the card type follows the image.
  lines.push(
    `<meta name="twitter:card" content="${ctx.ogImage ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${escapeAttr(title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(desc)}">`,
  );
  if (ctx.ogImage) lines.push(`<meta name="twitter:image" content="${escapeAttr(ctx.ogImage)}">`);
  if (ctx.twitterHandle) {
    lines.push(
      `<meta name="twitter:site" content="${escapeAttr(ctx.twitterHandle)}">`,
      `<meta name="twitter:creator" content="${escapeAttr(ctx.twitterHandle)}">`,
    );
  }

  // Web fonts: preconnect + preload the stylesheet (LCP win)
  if (spec.theme.fontImportUrl) {
    const url = escapeAttr(spec.theme.fontImportUrl);
    lines.push(
      `<link rel="preconnect" href="https://fonts.googleapis.com">`,
      `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
      `<link rel="preload" as="style" href="${url}">`,
      `<link rel="stylesheet" href="${url}">`,
    );
  }

  // JSON-LD structured data (escaped against </script> breakout)
  for (const block of jsonLdBlocks) {
    lines.push(`<script type="application/ld+json">${escapeJsonLd(block)}</script>`);
  }

  return lines.join("\n");
}
