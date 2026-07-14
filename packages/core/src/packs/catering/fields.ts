import { z } from "zod";
import { copyField } from "../../fields";
import type { RenderContext } from "../../render/context";
import type { AssetRef } from "../../schema/asset";
import { ui } from "../../ui/primitives";
import { escapeHtml, escapeAttr, safeUrl } from "../../ui/escape";

/**
 * Shared shapes + render helpers for the catering pack. The design is
 * bilingual (EN primary, KR secondary) — Korean strings always render inside
 * a `.kr` element with `lang="ko"` so screen readers switch voices.
 */

export const ctaSchema = z.object({ label: copyField, href: z.string() });
export type Cta = z.infer<typeof ctaSchema>;

/** A paragraph-level Korean companion line. */
export function kr(text: string | undefined, cls = "kr"): string {
  const classes = cls === "kr" ? "kr" : `${cls} kr`;
  return text ? `<p class="${classes}" lang="ko">${escapeHtml(text)}</p>` : "";
}

/** Inline Korean span (card captions, drawer links). */
export function krSpan(text: string | undefined, cls = "kr"): string {
  const classes = cls === "kr" ? "kr" : `${cls} kr`;
  return text ? `<span class="${classes}" lang="ko">${escapeHtml(text)}</span>` : "";
}

/** Escape, then honor intentional line breaks in display headlines. */
export function multiline(text: string): string {
  return escapeHtml(text).split("\n").join("<br>");
}

export function eyebrow(text: string, gold = true): string {
  return `<div class="eyebrow${gold ? "" : " eyebrow-bronze"}">${escapeHtml(text)}</div>`;
}

export function btn(cta: Cta, variant: string, iconSvg = ""): string {
  return `<a class="btn btn-${variant}" href="${escapeAttr(safeUrl(cta.href))}">${iconSvg}${escapeHtml(cta.label.value)}</a>`;
}

/**
 * A photo slot: the manifest asset when present, otherwise the warm
 * placeholder tile — the design's graceful-degradation state.
 */
export function photo(
  ref: AssetRef | undefined,
  alt: string,
  ctx: RenderContext,
  cls: string,
  opts?: { priority?: boolean },
): string {
  const img = ref ? ui.image(ref, alt, ctx, opts) : "";
  return `<div class="ph ${cls}${img ? "" : " ph-empty"}">${img}</div>`;
}
