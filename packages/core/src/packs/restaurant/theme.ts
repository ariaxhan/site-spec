import type { Theme } from "../../schema/theme";

/**
 * Placeholder theme until the designer's Canva template lands (A2). Kept
 * genuinely tasteful — warm cream, terracotta, herb green — so the rendered
 * output looks like a real restaurant site, not AI slop. Deliberately NOT Inter.
 *
 * When the Canva template arrives, only these token values change; no renderer
 * or section code moves. That is the whole point of the theme/content split.
 */
export const restaurantTheme: Theme = {
  palette: {
    background: "#faf6f0",
    surface: "#ffffff",
    text: "#2b2420",
    textMuted: "#6f655c",
    primary: "#b4541f",
    primaryText: "#ffffff",
    accent: "#2f6b4f",
    border: "#e7ddd1",
  },
  typography: {
    headingFamily: "'Fraunces', Georgia, 'Times New Roman', serif",
    bodyFamily: "'Source Sans 3', system-ui, -apple-system, sans-serif",
    baseSizePx: 18,
    scaleRatio: 1.25,
    headingWeight: 600,
    bodyWeight: 400,
  },
  spacing: {
    unitPx: 8,
    scale: [0, 0.5, 1, 1.5, 2, 3, 4, 6, 8],
  },
  radiusPx: 10,
  fontImportUrl:
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Source+Sans+3:wght@400;600&display=swap",
};
