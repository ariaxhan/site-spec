import type { RenderContext } from "../render/context";
import type { AssetRef } from "../schema/asset";
import { escapeHtml, escapeAttr, safeUrl } from "./escape";

/**
 * D7 — UI primitives. Pure `(data, ctx) -> string`. No state, no composition
 * API, no lifecycle. Section authors compose these and never write raw HTML, so
 * accessibility, escaping, lazy-loading, and asset validation are enforced for
 * free.
 */

function clampLevel(level: number): number {
  return Math.min(Math.max(Math.trunc(level), 1), 6);
}

export const ui = {
  heading(level: number, text: string): string {
    const l = clampLevel(level);
    return `<h${l}>${escapeHtml(text)}</h${l}>`;
  },

  text(value: string): string {
    return `<p>${escapeHtml(value)}</p>`;
  },

  /** A warm, handwritten-accent line (uses the theme's accent font). */
  tagline(value: string): string {
    return `<p class="tagline">${escapeHtml(value)}</p>`;
  },

  /**
   * Resolves the ref against the manifest. Missing asset → renders nothing.
   * `priority` marks the LCP/hero image: eager + fetchpriority=high (lazy-
   * loading the LCP image is a documented anti-pattern that worsens LCP).
   * Everything else defaults to lazy.
   */
  image(
    ref: AssetRef,
    alt: string,
    ctx: RenderContext,
    opts?: { priority?: boolean },
  ): string {
    const asset = ctx.manifest[ref];
    if (!asset) return "";
    const dims =
      asset.width && asset.height
        ? ` width="${asset.width}" height="${asset.height}"`
        : "";
    const load = opts?.priority ? ` fetchpriority="high"` : ` loading="lazy"`;
    return `<img src="${escapeAttr(asset.url)}" alt="${escapeAttr(alt)}"${load}${dims}>`;
  },

  cta(label: string, href: string): string {
    return `<a class="cta" href="${escapeAttr(safeUrl(href))}">${escapeHtml(label)}</a>`;
  },

  /** A semantic link that is NOT a styled button (e.g. phone, email). */
  link(label: string, href: string): string {
    return `<a href="${escapeAttr(safeUrl(href))}">${escapeHtml(label)}</a>`;
  },
} as const;
