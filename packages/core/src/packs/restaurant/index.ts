import { definePack, registerSections } from "../../schema/pack";
import { restaurantTheme } from "./theme";
import { hero } from "./sections/hero";
import { menu } from "./sections/menu";
import { hours } from "./sections/hours";
import { gallery } from "./sections/gallery";
import { reviews } from "./sections/reviews";
import { contact } from "./sections/contact";

/**
 * The Generic Local Restaurant pack — the first real pack (M6, scoped to one
 * vertical for the depth-first slice). Six sections cover a mom-and-pop
 * restaurant landing page: hero, menu, hours, gallery, reviews, contact.
 */
export const restaurantPack = definePack({
  id: "restaurant",
  version: "0-1-0",
  name: "Generic Local Restaurant",
  theme: restaurantTheme,
  sections: registerSections([hero, menu, hours, gallery, reviews, contact]),
});

export { hero, menu, hours, gallery, reviews, contact, restaurantTheme };
export type { HeroContent } from "./sections/hero";
export type { MenuContent } from "./sections/menu";
export type { HoursContent } from "./sections/hours";
export type { GalleryContent } from "./sections/gallery";
export type { ReviewsContent } from "./sections/reviews";
export type { ContactContent } from "./sections/contact";
