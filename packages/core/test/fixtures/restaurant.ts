import { fact, copy } from "../../src/fields";
import type { SiteSpec } from "../../src/schema/site-spec";
import type { SiteContext } from "../../src/schema/site";
import { restaurantTheme } from "../../src/packs/restaurant/theme";
import { cateringTheme } from "../../src/themes/catering";

/**
 * The deploy context for the demo site. Shared by the SEO tests and the golden
 * build (examples/restaurant-site/), so both always describe the same site.
 */
export const demoSite: SiteContext = {
  baseUrl: "https://rosalias.example",
  path: "/",
  locales: ["en", "es"],
  defaultLocale: "en",
  ogImage: "https://rosalias.example/og.png",
};

/**
 * A real-shaped Brief for one local restaurant. The SiteSpec below sources every
 * FactField directly from this object, so facts cannot drift from their source.
 */
export const demoBrief = {
  business: {
    name: "Rosalia's Kitchen",
    category: "Italian restaurant",
    phone: "+14085550142",
    email: "hello@rosalias.example",
    address: "118 S Murphy Ave, Sunnyvale, CA 94086",
    country: "US",
  },
  hours: [
    { day: "Monday", closed: true },
    { day: "Tuesday", open: "11:30 AM", close: "9:00 PM" },
    { day: "Wednesday", open: "11:30 AM", close: "9:00 PM" },
    { day: "Thursday", open: "11:30 AM", close: "9:00 PM" },
    { day: "Friday", open: "11:30 AM", close: "10:00 PM" },
    { day: "Saturday", open: "10:00 AM", close: "10:00 PM" },
    { day: "Sunday", open: "10:00 AM", close: "8:00 PM" },
  ],
  menu: {
    categories: [
      {
        name: "Antipasti",
        items: [
          { name: "Bruschetta", price: "$9", desc: "Grilled bread, San Marzano tomato, basil." },
          { name: "Burrata", price: "$14", desc: "Creamy burrata, olive oil, sea salt." },
        ],
      },
      {
        name: "Pasta",
        items: [
          { name: "Cacio e Pepe", price: "$19" },
          { name: "Lasagna della Nonna", price: "$22", desc: "Twelve layers, slow-cooked ragù." },
        ],
      },
    ],
  },
  reviews: [
    { author: "Maria G.", rating: 5, text: "Tastes like my grandmother's cooking. Unreal.", source: "Google" },
    { author: "Devin R.", rating: 5, text: "The lasagna alone is worth the drive.", source: "Yelp" },
  ],
} as const;

const b = demoBrief;

export const demoSpec: SiteSpec = {
  specVersion: "0-1-0",
  pack: { id: "restaurant", version: "0-1-0" },
  meta: {
    lang: "en",
    title: copy("Rosalia's Kitchen — Italian in Sunnyvale"),
    description: copy("Family-run Italian kitchen in downtown Sunnyvale. Fresh pasta, wood-fired classics, and a warm room."),
  },
  theme: restaurantTheme,
  sections: [
    {
      id: "hero-01",
      type: "hero",
      version: "0-1-0",
      content: {
        businessName: fact(b.business.name, "business.name"),
        headline: copy("Fresh pasta, made by hand every morning."),
        subhead: copy("A family-run Italian kitchen in downtown Sunnyvale."),
        cta: { label: copy("See the menu"), href: "#menu" },
      },
    },
    {
      id: "menu-01",
      type: "menu",
      version: "0-1-0",
      content: {
        heading: copy("Our menu"),
        categories: b.menu.categories.map((cat, ci) => ({
          name: fact(cat.name, `menu.categories.${ci}.name`),
          items: cat.items.map((it, ii) => ({
            name: fact(it.name, `menu.categories.${ci}.items.${ii}.name`),
            price: fact(it.price, `menu.categories.${ci}.items.${ii}.price`),
            ...("desc" in it && it.desc ? { description: copy(it.desc) } : {}),
          })),
        })),
      },
    },
    {
      id: "hours-01",
      type: "hours",
      version: "0-1-0",
      content: {
        heading: copy("Hours"),
        days: b.hours.map((h, hi) => ({
          day: fact(h.day, `hours.${hi}.day`),
          ...("closed" in h && h.closed
            ? { closed: true }
            : {
                open: fact((h as { open: string }).open, `hours.${hi}.open`),
                close: fact((h as { close: string }).close, `hours.${hi}.close`),
              }),
        })),
      },
    },
    {
      id: "reviews-01",
      type: "reviews",
      version: "0-1-0",
      content: {
        heading: copy("What people say"),
        items: b.reviews.map((r, ri) => ({
          author: fact(r.author, `reviews.${ri}.author`),
          rating: fact(r.rating, `reviews.${ri}.rating`),
          text: fact(r.text, `reviews.${ri}.text`),
          source: fact(r.source, `reviews.${ri}.source`),
        })),
      },
    },
    {
      id: "contact-01",
      type: "contact",
      version: "0-1-0",
      content: {
        heading: copy("Find us"),
        address: fact(b.business.address, "business.address"),
        phone: fact(b.business.phone, "business.phone"),
        email: fact(b.business.email, "business.email"),
        cta: { label: copy("Call to reserve"), href: "tel:" + b.business.phone },
      },
    },
  ],
};

/**
 * The recombination proof: the SAME content under a different theme, hero
 * variant, and tone rhythm (cream hero -> white menu -> cream hours -> dark
 * band reviews -> cream contact). If this stops rendering correctly, the
 * building-block promise — any content x any theme x any variant — is broken.
 */
export const demoSpecAlt: SiteSpec = {
  ...demoSpec,
  theme: cateringTheme,
  sections: demoSpec.sections.map((s) => {
    if (s.type === "hero") {
      return { ...s, content: { ...(s.content as Record<string, unknown>), variant: "split" } };
    }
    if (s.type === "menu") return { ...s, tone: "surface" as const };
    if (s.type === "reviews") return { ...s, tone: "band" as const };
    return s;
  }),
};
