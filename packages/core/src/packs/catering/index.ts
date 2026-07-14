import { definePack, registerSections } from "../../schema/pack";
import type { Theme } from "../../schema/theme";
import { cateringTheme } from "../../themes/catering";
import { CATERING_CSS } from "./css";
import { CATERING_SCRIPT } from "./script";
import { topbar, nav, footer, quote } from "./sections/chrome";
import { hero, trust, services, banchan, feature, about, contact, map } from "./sections/main";

/**
 * The catering pack — a bilingual EN/KR food-service vertical. The layouts,
 * the stylesheet, and the icon set form a warm-cream / green design system;
 * the Brief pours each business's facts into the slots.
 */

/** The pack theme extends the design tokens with the bilingual font loads. */
const cateringPackTheme: Theme = {
  ...cateringTheme,
  fontImportUrl:
    "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Kalam:wght@400;700&family=Noto+Sans+KR:wght@400;500;700;800&family=Nanum+Pen+Script&display=swap",
};

export const cateringPack = definePack({
  id: "catering",
  version: "0-1-0",
  name: "Family catering (bilingual EN/KR)",
  theme: cateringPackTheme,
  sections: registerSections([
    topbar,
    nav,
    hero,
    trust,
    services,
    banchan,
    feature,
    about,
    contact,
    map,
    footer,
    quote,
  ]),
  css: CATERING_CSS,
  script: CATERING_SCRIPT,
});

export * from "./sections/chrome";
export * from "./sections/main";
export { icn, iconName } from "./icons";
