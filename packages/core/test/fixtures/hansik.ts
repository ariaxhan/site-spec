import { fact, copy } from "../../src/fields";
import type { SiteSpec } from "../../src/schema/site-spec";
import type { SiteContext } from "../../src/schema/site";
import type { Brief } from "../../src/schema/brief";
import { cateringPack } from "../../src/packs/catering";

/**
 * HANSIK HOUSE 한식하우스 — a FICTIONAL Korean restaurant that Google-style
 * directories also categorize as Caterer + Takeout Restaurant. It proves the
 * catering pack generalizes to a second business with zero design work, and
 * exercises the scrape-shaped Brief path (hour-only meridiem times like "7 AM").
 * All identity details (name, phone, address, domain) are synthetic.
 */

const PHONE = "+1 555 010 0188";

export const hansikBrief: Brief = {
  business: {
    name: "Hansik House 한식하우스",
    category: "Korean restaurant",
    phone: PHONE,
    address: "412 Maple St #105, Springfield, CA 90000",
    country: "US",
    addressLine1: "412 Maple St #105",
    addressLine2: "Springfield, CA 90000",
  },
  categories: ["Korean restaurant", "Caterer", "Takeout Restaurant"],
  services: [
    { name: "Catering" },
    { name: "Takeout Restaurant" },
    { name: "Korean restaurant" },
  ],
  rating: { score: "4.8", count: "36" },
  hours: [
    { day: "Monday", open: "7 AM", close: "5 PM" },
    { day: "Tuesday", open: "7 AM", close: "5 PM" },
    { day: "Wednesday", open: "7 AM", close: "4 PM" },
    { day: "Thursday", open: "7 AM", close: "5 PM" },
    { day: "Friday", open: "7 AM", close: "5 PM" },
    { day: "Saturday", open: "9 AM", close: "2 PM" },
    { day: "Sunday", closed: true },
  ],
};

export const hansikSite: SiteContext = {
  baseUrl: "https://hansikhouse.example",
  path: "/",
  locales: ["en"],
  defaultLocale: "en",
};

const f = (v: string, source: string) => fact(v, source);

export const hansikSpec: SiteSpec = {
  specVersion: "0-1-0",
  pack: { id: "catering", version: "0-1-0" },
  meta: {
    lang: "en",
    title: copy("Hansik House 한식하우스 — Korean Catering & Takeout"),
    description: copy(
      "Homestyle Korean cooking — catering, takeout, and to-go. Open from 7 AM on weekdays. Call +1 555 010 0188 to order.",
    ),
  },
  theme: cateringPack.theme,
  sections: [
    {
      id: "topbar-01",
      type: "topbar",
      version: "0-1-0",
      content: {
        badge: copy("HOMESTYLE KOREAN"),
        phones: [f(PHONE, "business.phone")],
      },
    },
    {
      id: "nav-01",
      type: "nav",
      version: "0-1-0",
      content: {
        wordmark: { name: f("Hansik House 한식하우스", "business.name"), sub: copy("catering & takeout") },
        logoAlt: f("Hansik House 한식하우스", "business.name"),
        links: [
          { label: copy("Catering"), labelKo: copy("케이터링"), href: "#services" },
          { label: copy("About"), labelKo: copy("소개"), href: "#about" },
          { label: copy("Contact"), labelKo: copy("연락처"), href: "#contact" },
        ],
        cta: { label: copy("Call to order"), href: "tel:15550100188" },
      },
    },
    {
      id: "hero-01",
      type: "hero",
      version: "0-1-0",
      content: {
        eyebrow: copy("Fresh · Homestyle · Korean"),
        headline: copy("Home-cooked Korean,\nready for your table."),
        lede: copy(
          "Catering and takeout from a family kitchen — open from 7 in the morning, cooked the way home should taste.",
        ),
        badge: { lines: [copy("4.8"), copy("★")], caption: copy("36 REVIEWS") },
        ctas: [
          { label: copy("See our services"), href: "#services" },
          { label: copy("Call to order"), href: "tel:15550100188", icon: "phone" },
        ],
      },
    },
    {
      id: "trust-01",
      type: "trust",
      version: "0-1-0",
      content: {
        items: [
          { icon: "heart", title: copy("Homestyle cooking"), sub: copy("정성 가득한 집밥") },
          { icon: "clock", title: copy("Open from 7 AM"), sub: copy("평일 아침 7시부터") },
          { icon: "leaf", title: copy("Made fresh to order"), sub: copy("주문 즉시 조리") },
          { icon: "pin", title: copy("Local delivery"), sub: copy("지역 배달") },
        ],
      },
    },
    {
      id: "services-01",
      type: "services",
      version: "0-1-0",
      content: {
        eyebrow: copy("What we do"),
        heading: copy("Catering, takeout,\nand Korean home cooking"),
        items: [
          {
            title: f("Catering", "services.0.name"),
            body: copy(
              "Spreads for gatherings, offices, and family events — tell us the headcount and we'll prepare generously.",
            ),
          },
          {
            title: f("Takeout Restaurant", "services.1.name"),
            body: copy("Order ahead by phone and pick up hot, neatly packed meals to go."),
          },
          {
            title: f("Korean restaurant", "services.2.name"),
            body: copy("Classic homestyle Korean dishes, made fresh through the day from early morning."),
          },
        ],
      },
    },
    {
      id: "feature-01",
      type: "feature",
      version: "0-1-0",
      content: {
        eyebrow: copy("Catering for every occasion"),
        heading: copy("Feeding a crowd?\nLeave it to us."),
        body: copy(
          "From office lunches to family celebrations — call us with your date and headcount and we'll take care of the rest.",
        ),
        ctas: [
          { label: copy("Call us"), href: "tel:15550100188" },
          { label: copy("Find us"), href: "#map" },
        ],
      },
    },
    {
      id: "about-01",
      type: "about",
      version: "0-1-0",
      content: {
        eyebrow: copy("Our kitchen"),
        heading: copy("Korean home cooking,\nmade to order."),
        body: copy(
          "Hansik House is Korean home cooking from a small kitchen — the kind of food that earns its stars one plate at a time. Doors open at 7 AM on weekdays, because home cooking starts early.",
        ),
        noteEn: copy("Come hungry — leave happy."),
        noteKo: copy("맛있게 드세요"),
      },
    },
    {
      id: "contact-01",
      type: "contact",
      version: "0-1-0",
      content: {
        eyebrow: copy("Get in touch"),
        heading: copy("Call us to order or cater"),
        body: copy("Call to plan your event, order takeout, or ask about today's dishes."),
        bodyKo: copy("케이터링 및 포장 주문은 전화로 문의해 주세요."),
        ctas: [{ label: copy("Call us · 전화"), href: "tel:15550100188", icon: "phone" }],
        phones: [f(PHONE, "business.phone")],
        addressLines: [
          f("412 Maple St #105", "business.addressLine1"),
          f("Springfield, CA 90000", "business.addressLine2"),
        ],
        addressQuery: "412 Maple St 105 Springfield CA 90000",
        areaTitle: copy("Springfield"),
        areaSub: copy("& nearby"),
      },
    },
    {
      id: "map-01",
      type: "map",
      version: "0-1-0",
      content: {
        addressQuery: "412 Maple St 105 Springfield CA 90000",
        pinTitle: f("412 Maple St #105", "business.addressLine1"),
        pinSub: copy("Springfield, CA 90000"),
      },
    },
    {
      id: "footer-01",
      type: "footer",
      version: "0-1-0",
      content: {
        wordmark: { name: f("Hansik House 한식하우스", "business.name"), sub: copy("catering & takeout") },
        blurb: copy("Homestyle Korean catering and takeout."),
        cols: [
          {
            heading: copy("Services"),
            items: [
              { label: copy("Catering"), href: "#services" },
              { label: copy("Takeout & to-go"), href: "#services" },
            ],
          },
          {
            heading: copy("Contact"),
            items: [{ label: copy(PHONE), href: "tel:15550100188" }],
          },
          {
            heading: copy("Hours"),
            items: [
              { label: copy("Mon–Fri · 7 AM – 5 PM") },
              { label: copy("Saturday · 9 AM – 2 PM") },
              { label: copy("Sunday · Closed") },
            ],
          },
        ],
        bottomLeft: copy("© 2026 Hansik House 한식하우스. Made fresh with love."),
        bottomRight: copy("Local catering & takeout"),
      },
    },
  ],
};
