/**
 * Deterministic colour math for accessible theming.
 *
 * A multi-tenant page is themed by each tenant's raw brand `primary_color`,
 * which is arbitrary and NOT guaranteed to be accessible — a light brand colour
 * used as a band background (white text) or as link text on the light canvas
 * will fail WCAG AA. These helpers let the theme derivation darken a brand
 * colour just enough to clear a target contrast ratio, so every page renders
 * accessibly without a hand-tuned per-tenant theme.
 *
 * Pure + deterministic (same input → same output), matching the engine's
 * "same spec + same pack → identical output" guarantee. No dependencies.
 */

export type Rgb = readonly [number, number, number];

const clamp8 = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));

/** Parse `#rgb` or `#rrggbb` (case-insensitive). Returns null on anything else. */
export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const h = (n: number) => clamp8(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** WCAG relative luminance of an sRGB colour. */
export function relativeLuminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio (1..21) between two colours, given as hex or Rgb. */
export function contrastRatio(a: string | Rgb, b: string | Rgb): number {
  const ra = typeof a === "string" ? hexToRgb(a) : a;
  const rb = typeof b === "string" ? hexToRgb(b) : b;
  if (!ra || !rb) return 1;
  const la = relativeLuminance(ra);
  const lb = relativeLuminance(rb);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Composite `fg` at `alpha` over `bg` (alpha 0..1) → the visible Rgb. */
export function blendOver(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  const a = Math.max(0, Math.min(1, alpha));
  return [a * fg[0] + (1 - a) * bg[0], a * fg[1] + (1 - a) * bg[1], a * fg[2] + (1 - a) * bg[2]];
}

/** Darken a colour by scaling each channel toward black by `frac` (0..1). */
export function darken(hex: string, frac: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const k = 1 - Math.max(0, Math.min(1, frac));
  return rgbToHex([rgb[0] * k, rgb[1] * k, rgb[2] * k]);
}

/**
 * Return `color` darkened just enough that its contrast against `against`
 * reaches `ratio`. If it already passes, it is returned unchanged (hue
 * preserved). Walks toward black in small steps; if even black cannot reach the
 * ratio (i.e. `against` is itself dark), returns black — the best available.
 */
export function darkenToContrast(color: string, against: string, ratio: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  if (contrastRatio(color, against) >= ratio) return color;
  for (let frac = 0.05; frac <= 1; frac += 0.05) {
    const candidate = darken(color, frac);
    if (contrastRatio(candidate, against) >= ratio) return candidate;
  }
  return "#000000";
}

/**
 * Darken `bg` until a translucent overlay (`overlay` at `alpha`) composited over
 * it reaches `ratio` against `bg`. Used to guarantee a brand band is dark enough
 * for its MUTED white text (the binding case): solid white may pass on a band
 * that muted-white still fails, so the band must satisfy the worst overlay.
 * Returns `bg` unchanged when it already passes.
 */
export function darkenForOverlay(bg: string, overlay: string, alpha: number, ratio: number): string {
  const ov = hexToRgb(overlay);
  if (!ov) return bg;
  for (let frac = 0; frac <= 1; frac += 0.05) {
    const candHex = darken(bg, frac);
    const candRgb = hexToRgb(candHex);
    if (!candRgb) break;
    if (contrastRatio(blendOver(ov, alpha, candRgb), candRgb) >= ratio) return candHex;
  }
  return "#000000";
}
