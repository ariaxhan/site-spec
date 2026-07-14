import { fact, copy } from "../../src/fields";
import type { SiteSpec } from "../../src/schema/site-spec";
import type { SiteContext } from "../../src/schema/site";
import type { Brief } from "../../src/schema/brief";
import { cateringPack } from "../../src/packs/catering";

/**
 * SUNNY TABLE CATERING — a FICTIONAL Korean-American catering business used as
 * the catering pack demo. Every FactField below resolves to a path in the Brief;
 * all identity details (name, phone, address, email, domain) are synthetic.
 * Renders to examples/catering-site.
 */

const PHONE_1 = "+1 555 010 0142";
const PHONE_2 = "+1 555 010 0143";
const EMAIL = "hello@sunnytable.example";
const ADDRESS_Q = "128 Garden Ave Springfield CA 90000";

/** The 12 banchan dishes, EN + KR, with their extracted photos. */
const BANCHAN: ReadonlyArray<[string, string, string]> = [
  ["Napa Kimchi", "배추김치", "bn-1"],
  ["Japchae", "잡채", "bn-2"],
  ["Pink Radish Rolls", "핑크 무쌈말이", "bn-3"],
  ["Braised Short Ribs", "갈비찜", "bn-4"],
  ["Spicy Squid Salad", "오징어무침", "bn-5"],
  ["Pan-Fried Meat Patties", "동그랑땡 (완자전)", "bn-6"],
  ["Chilled Jellyfish Salad", "해파리 냉채", "bn-7"],
  ["Acorn Jelly Salad", "도토리묵 무침", "bn-8"],
  ["Three-Color Namul", "삼색 나물", "bn-9"],
  ["California Roll", "캘리포니아 롤", "bn-10"],
  ["Seasoned Namul", "나물무침", "bn-11"],
  ["Stir-Fried Fish Cake", "어묵볶음", "bn-12"],
];

const SERVICES: ReadonlyArray<[string, string]> = [
  ["Customized Catering", "맞춤형 케이터링"],
  ["Lunch Boxes", "도시락"],
  ["Premium Side Dishes", "프리미엄 반찬"],
  ["Delivery & To-Go", "배달 및 포장"],
];

/** Grounding: every FactField in cateringSpec resolves to a path here, verbatim. */
export const cateringBrief: Brief = {
  business: {
    name: "Sunny Table Catering",
    category: "Korean catering",
    phone: PHONE_1,
    phone2: PHONE_2,
    email: EMAIL,
    address: "128 Garden Ave, Springfield, CA 90000",
    country: "US",
    addressLine1: "128 Garden Ave",
    addressLine2: "Springfield, CA 90000",
  },
  services: SERVICES.map(([name, nameKo]) => ({ name, nameKo })),
  menu: { banchan: BANCHAN.map(([name, nameKo]) => ({ name, nameKo })) },
  assets: {
    hero: "A spread of fresh Korean dishes from Sunny Table Catering",
    feature: "An event catering table set by Sunny Table Catering",
    about: "Cooking in the Sunny Table Catering kitchen",
  },
  hours: [],
  reviews: [],
};

export const cateringSite: SiteContext = {
  baseUrl: "https://sunnytable.example",
  path: "/",
  locales: ["en"],
  defaultLocale: "en",
};

/**
 * The quote form is the site's one interactive surface. Declared here so
 * foundation.json matches reality and the auditor can verify the rendered
 * <form id="quoteForm"> against a real contract instead of guessing.
 */
export const cateringFoundation = {
  forms: [
    {
      id: "quoteForm",
      intent: "request a catering quote",
      endpoint: `mailto:${EMAIL}`,
      method: "mailto",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "phone", type: "tel", required: true },
        { name: "email", type: "email" },
        { name: "date", type: "text" },
        { name: "guests", type: "select" },
        { name: "occasion", type: "select" },
        { name: "notes", type: "textarea" },
      ],
    },
  ],
};

const f = (v: string, source: string) => fact(v, source);

export const cateringSpec: SiteSpec = {
  specVersion: "0-1-0",
  pack: { id: "catering", version: "0-1-0" },
  meta: {
    lang: "en",
    title: copy("Sunny Table Catering — Fresh & Authentic Korean Home Cooking"),
    description: copy(
      "Authentic Korean home cooking for your most special moments — no MSG, made fresh daily. Catering, lunch boxes, premium side dishes, and OC & LA delivery.",
    ),
  },
  theme: cateringPack.theme,
  sections: [
    {
      id: "topbar-01",
      type: "topbar",
      version: "0-1-0",
      content: {
        badge: copy("NO MSG · MADE FRESH DAILY"),
        phones: [f(PHONE_1, "business.phone"), f(PHONE_2, "business.phone2")],
        email: f(EMAIL, "business.email"),
      },
    },
    {
      id: "nav-01",
      type: "nav",
      version: "0-1-0",
      content: {
        logo: "logo",
        logoAlt: f("Sunny Table Catering", "business.name"),
        links: [
          { label: copy("Catering"), labelKo: copy("케이터링"), href: "#services" },
          { label: copy("Side Dishes"), labelKo: copy("반찬"), href: "#banchan" },
          { label: copy("About"), labelKo: copy("소개"), href: "#about" },
          { label: copy("Contact"), labelKo: copy("연락처"), href: "#contact" },
        ],
        cta: { label: copy("Call to order"), href: "tel:15550100142" },
      },
    },
    {
      id: "hero-01",
      type: "hero",
      version: "0-1-0",
      content: {
        eyebrow: copy("Fresh · Authentic · No MSG"),
        headline: copy("Bringing happiness\nto your table."),
        lede: copy(
          "Authentic Korean home cooking for your most special moments — made fresh every day with high-quality ingredients and the warm taste of a home-cooked meal.",
        ),
        ledeKo: copy(
          "신선한 재료와 정성 가득한 손맛으로 여러분의 소중한 순간을 더욱 특별하게 만들어 드립니다. 건강을 생각하여 인공 조미료를 사용하지 않습니다.",
        ),
        badge: { lines: [copy("NO"), copy("MSG")], caption: copy("FRESH DAILY") },
        image: "hero-dish",
        imageAlt: f("A spread of fresh Korean dishes from Sunny Table Catering", "assets.hero"),
        ctas: [
          { label: copy("Explore our catering"), href: "#services" },
          { label: copy("Call to order"), href: "tel:15550100142", icon: "phone" },
        ],
      },
    },
    {
      id: "trust-01",
      type: "trust",
      version: "0-1-0",
      content: {
        items: [
          { icon: "leaf", title: copy("No MSG, ever"), sub: copy("무조미료 · 건강한 한식") },
          { icon: "clock", title: copy("Made fresh daily"), sub: copy("매일 신선하게 조리") },
          { icon: "heart", title: copy("Home-cooked taste"), sub: copy("정성 가득한 집밥") },
          { icon: "pin", title: copy("OC & LA delivery"), sub: copy("OC · LA 배달 가능") },
        ],
      },
    },
    {
      id: "services-01",
      type: "services",
      version: "0-1-0",
      content: {
        eyebrow: copy("Our services"),
        heading: copy("Everything you need\nto feed the moment"),
        introKo: copy(
          "각종 모임, 기업 행사, 파티 등 행사의 성격에 맞춘 최적의 메뉴와 정갈한 반찬, 그리고 편리한 배달·포장 서비스를 제공합니다.",
        ),
        items: [
          {
            image: "svc-catering",
            title: f("Customized Catering", "services.0.name"),
            titleKo: f("맞춤형 케이터링", "services.0.nameKo"),
            body: copy(
              "Tailored menus for private gatherings, corporate events, and parties — built around the size and spirit of your occasion.",
            ),
            bodyKo: copy("각종 모임, 기업 행사, 파티 등 행사의 성격에 맞춘 최적의 메뉴를 제공합니다."),
          },
          {
            image: "svc-lunchbox",
            title: f("Lunch Boxes", "services.1.name"),
            titleKo: f("도시락", "services.1.nameKo"),
            body: copy(
              "Individually packed Korean lunch boxes made with fresh ingredients and a neat, tidy presentation — optimized for large-volume corporate and event orders.",
            ),
            bodyKo: copy(
              "신선한 식재료로 정갈하게 포장한 한식 도시락. 대량 주문에 최적화되어 행사·기업 단체 주문에 안성맞춤입니다.",
            ),
          },
          {
            image: "svc-banchan",
            title: f("Premium Side Dishes", "services.2.name"),
            titleKo: f("프리미엄 반찬", "services.2.nameKo"),
            body: copy(
              "A wide variety of authentic Korean banchan, freshly made every single day. Clean, balanced, and full of flavor.",
            ),
            bodyKo: copy("매일 직접 만드는 정갈하고 다양한 한식 반찬을 만나보세요."),
          },
          {
            image: "svc-delivery",
            title: f("Delivery & To-Go", "services.3.name"),
            titleKo: f("배달 및 포장", "services.3.nameKo"),
            body: copy(
              "Delivery available across the OC & LA areas (please contact us for details). Quick and easy to-go pick-up, too.",
            ),
            bodyKo: copy(
              "OC 및 LA 지역 배달 서비스를 제공하며, 포장 주문 시 더욱 간편하고 빠르게 픽업하실 수 있습니다.",
            ),
          },
        ],
      },
    },
    {
      id: "banchan-01",
      type: "banchan",
      version: "0-1-0",
      content: {
        eyebrow: copy("Freshly made every day"),
        heading: copy("Catering"),
        introKo: copy("매일 아침 직접 만드는 반찬 — 정갈한 손맛 그대로."),
        items: BANCHAN.map(([en, ko, id], i) => ({
          image: id,
          name: f(en, `menu.banchan.${i}.name`),
          nameKo: f(ko, `menu.banchan.${i}.nameKo`),
        })),
      },
    },
    {
      id: "feature-01",
      type: "feature",
      version: "0-1-0",
      content: {
        eyebrow: copy("Catering for every occasion"),
        heading: copy("From office lunches\nto family celebrations."),
        body: copy(
          "Tell us about your event and we'll build the menu around it — fresh, generous, and made to your headcount.",
        ),
        bodyKo: copy("행사의 규모와 성격에 맞춰 정성껏 준비해 드립니다. 인원수에 맞춰 넉넉하게 차려 드려요."),
        image: "feat-catering",
        imageAlt: f("An event catering table set by Sunny Table Catering", "assets.feature"),
        ctas: [
          { label: copy("Request a quote"), href: "#quote" },
          { label: copy("Call us"), href: "tel:15550100142" },
        ],
      },
    },
    {
      id: "about-01",
      type: "about",
      version: "0-1-0",
      content: {
        eyebrow: copy("Our story"),
        heading: copy("Cooked the way\nMom always did."),
        body: copy(
          "At Sunny Table Catering, every dish starts with fresh ingredients and the kind of care you only get at home. No MSG, no shortcuts — just honest Korean cooking, prepared fresh each morning and served with love.",
        ),
        bodyKo: copy(
          "써니테이블은 신선한 재료와 정성 가득한 손맛으로 모든 요리를 준비합니다. 인공 조미료 없이, 매일 아침 정성을 다해 만드는 건강한 집밥을 차려 드립니다.",
        ),
        noteEn: copy("Don't worry about leftovers — that's the best part."),
        noteKo: copy("맛있게 드세요 — 엄마가"),
        image: "about-kitchen",
        imageAlt: f("Cooking in the Sunny Table Catering kitchen", "assets.about"),
      },
    },
    {
      id: "contact-01",
      type: "contact",
      version: "0-1-0",
      content: {
        eyebrow: copy("Get in touch"),
        heading: copy("Let's cater your next moment"),
        body: copy("Call or email us to plan your event, order side dishes, or arrange delivery and pick-up."),
        bodyKo: copy("행사 준비, 반찬 주문, 배달 및 포장 문의는 전화 또는 이메일로 연락 주세요."),
        ctas: [
          { label: copy("Request a quote · 견적 문의"), href: "#quote" },
          { label: copy("Call us · 전화"), href: "tel:15550100142", icon: "phone" },
        ],
        phones: [f(PHONE_1, "business.phone"), f(PHONE_2, "business.phone2")],
        email: f(EMAIL, "business.email"),
        addressLines: [
          f("128 Garden Ave", "business.addressLine1"),
          f("Springfield, CA 90000", "business.addressLine2"),
        ],
        addressQuery: ADDRESS_Q,
        areaTitle: copy("Orange County"),
        areaSub: copy("& Los Angeles"),
      },
    },
    {
      id: "map-01",
      type: "map",
      version: "0-1-0",
      content: {
        addressQuery: ADDRESS_Q,
        pinTitle: f("128 Garden Ave", "business.addressLine1"),
        pinSub: copy("Springfield, CA 90000 · OC & LA"),
      },
    },
    {
      id: "footer-01",
      type: "footer",
      version: "0-1-0",
      content: {
        logo: "logo-light",
        logoAlt: f("Sunny Table Catering", "business.name"),
        blurb: copy(
          "Fresh, authentic Korean home cooking — no MSG, made fresh daily. Bringing happiness to your table.",
        ),
        blurbKo: copy("맛있는 한식, 건강한 집밥. 써니테이블."),
        cols: [
          {
            heading: copy("Services"),
            items: [
              { label: copy("Customized Catering"), href: "#services" },
              { label: copy("Premium Side Dishes"), href: "#banchan" },
              { label: copy("Delivery & To-Go"), href: "#services" },
            ],
          },
          {
            heading: copy("Contact"),
            items: [
              { label: copy(PHONE_1), href: "tel:15550100142" },
              { label: copy(PHONE_2), href: "tel:15550100143" },
              { label: copy(EMAIL), href: "mailto:" + EMAIL },
            ],
          },
          {
            heading: copy("Service area"),
            items: [
              { label: copy("Orange County (OC)") },
              { label: copy("Los Angeles (LA)") },
              { label: copy("Delivery & pick-up") },
            ],
          },
        ],
        bottomLeft: copy("© 2026 Sunny Table Catering · 써니테이블. Made fresh with love."),
        bottomRight: copy("No MSG · Made fresh daily"),
      },
    },
    {
      id: "quote-01",
      type: "quote",
      version: "0-1-0",
      content: {
        email: f(EMAIL, "business.email"),
        eyebrow: copy("Request a quote · 견적 문의"),
        heading: copy("Tell us about your event"),
        sub: copy("행사 정보를 남겨 주시면 빠르게 견적을 보내 드립니다."),
      },
    },
  ],
};
