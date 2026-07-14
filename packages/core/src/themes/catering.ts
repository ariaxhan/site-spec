import type { Theme } from "../schema/theme";

/**
 * Catering design system — a warm-cream / green palette for a food-service
 * vertical. Cream canvas (never pure white), four-tier greens mapped to roles,
 * full-pill buttons, whisper-soft layered card shadow, tight tracking,
 * press-to-0.95 feedback.
 * Token mapping:
 *   background      <- cream            #f2f0eb (never pure white)
 *   surface         <- white            card surface
 *   text            <- text-black       rgba(0,0,0,0.87) warm, not pure black
 *   textMuted       <- text-black-soft  rgba(0,0,0,0.58)
 *   heading         <- green-herb       #006241 headings carry the brand
 *   primary         <- green-basil      #00754A filled CTAs
 *   accent          <- green-herb       links lean brand green
 *   border          <- hairline         #e7e7e7
 *   bandBackground  <- green-forest     deep feature bands / footer
 *   bandText(Muted) <- text-white(-soft)
 */
export const cateringTheme: Theme = {
  palette: {
    background: "#f2f0eb",
    surface: "#ffffff",
    text: "rgba(0, 0, 0, 0.87)",
    textMuted: "rgba(0, 0, 0, 0.58)",
    primary: "#00754A",
    primaryText: "#ffffff",
    accent: "#006241",
    border: "#e7e7e7",
    heading: "#006241",
    bandBackground: "#296249",
    bandText: "rgba(255, 255, 255, 1)",
    bandTextMuted: "rgba(255, 255, 255, 0.70)",
  },
  typography: {
    headingFamily: "'Manrope', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    bodyFamily: "'Manrope', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    accentFamily: "'Kalam', 'Comic Sans MS', cursive",
    baseSizePx: 16,
    scaleRatio: 1.25,
    headingWeight: 600,
    bodyWeight: 400,
    trackingEm: -0.01,
  },
  spacing: {
    unitPx: 8,
    scale: [0, 0.5, 1, 2, 3, 4, 5, 6, 7, 8],
  },
  radiusPx: 12,
  controlRadiusPx: 50,
  cardShadow: "0 0 .5px rgba(0,0,0,.14), 0 1px 1px rgba(0,0,0,.24)",
  pressScale: 0.95,
  fontImportUrl:
    "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Kalam:wght@400;700&display=swap",
};
