import { z } from "zod";

/**
 * The Theme is the bridge between Canva and the engine. A designer locks these
 * decisions in Canva (palette, two fonts, a spacing rhythm); we translate them
 * once into a Theme and the renderer reproduces them deterministically.
 *
 * Every value is type-validated so theme tokens can never inject CSS. (§5)
 */

/** Hex, rgb()/rgba(), or hsl()/hsla() — and nothing that could escape a CSS value. */
export const colorToken = z
  .string()
  .regex(
    /^(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|(?:rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\))$/,
    "color token must be a hex, rgb(), or hsl() value",
  );
export type ColorToken = z.infer<typeof colorToken>;

/**
 * A CSS box-shadow value, bounded so it can never escape the value context:
 * no colons, quotes, semicolons, or braces — `url(...)` and declaration
 * injection are structurally impossible.
 */
export const shadowToken = z
  .string()
  .regex(
    /^[0-9a-zA-Z#(),.\s%/-]+$/,
    "shadow token may only contain lengths, colors, and commas",
  );
export type ShadowToken = z.infer<typeof shadowToken>;

/**
 * Named, semantic palette tokens. The renderer references these — never raw
 * hex. The optional roles exist for richer design systems (tiered brand colors,
 * dark feature bands); when absent the renderer falls back to the core eight.
 */
export const palette = z.object({
  background: colorToken,
  surface: colorToken,
  text: colorToken,
  textMuted: colorToken,
  primary: colorToken,
  primaryText: colorToken,
  accent: colorToken,
  border: colorToken,
  /** Heading color when it differs from body text (e.g. brand green). */
  heading: colorToken.optional(),
  /** Dark feature-band surface (`tone: "band"` sections). Falls back to primary. */
  bandBackground: colorToken.optional(),
  /** Text on the band surface. Falls back to primaryText. */
  bandText: colorToken.optional(),
  /** Secondary text on the band surface. Falls back to bandText. */
  bandTextMuted: colorToken.optional(),
});
export type Palette = z.infer<typeof palette>;

export const typography = z.object({
  headingFamily: z.string().min(1),
  bodyFamily: z.string().min(1),
  /**
   * Optional handwritten/script face for taglines and warm accents — the
   * "mom's handwriting" touch. Falls back to the heading font when absent.
   */
  accentFamily: z.string().min(1).optional(),
  baseSizePx: z.number().positive(),
  /** modular scale ratio, e.g. 1.25 (major third) */
  scaleRatio: z.number().positive(),
  headingWeight: z.number().int().min(100).max(900),
  bodyWeight: z.number().int().min(100).max(900),
  /** Global letter-spacing in em (e.g. -0.01 for tight, confident tracking). */
  trackingEm: z.number().min(-0.1).max(0.3).optional(),
});
export type Typography = z.infer<typeof typography>;

export const spacing = z.object({
  unitPx: z.number().positive(),
  /** multipliers of the base unit, ascending */
  scale: z.array(z.number().nonnegative()).min(1),
});
export type Spacing = z.infer<typeof spacing>;

export const theme = z.object({
  palette,
  typography,
  spacing,
  radiusPx: z.number().nonnegative().default(0),
  /**
   * Radius for interactive controls (buttons, badges) when it differs from
   * cards — e.g. 50 for full-pill buttons. Falls back to radiusPx.
   */
  controlRadiusPx: z.number().nonnegative().optional(),
  /** Card elevation. When present, cards drop their hairline border for it. */
  cardShadow: shadowToken.optional(),
  /** Interactive press feedback: controls scale to this on :active (e.g. 0.95). */
  pressScale: z.number().min(0.5).max(1).optional(),
  /**
   * Optional stylesheet URL for web fonts (e.g. a Google Fonts `css2` link).
   * Injected into <head> so the theme's families actually load. The renderer
   * still only emits a <link>, never inline @font-face from untrusted input.
   */
  fontImportUrl: z.string().url().optional(),
});
export type Theme = z.infer<typeof theme>;
