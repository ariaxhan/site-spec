import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { localBusinessJsonLd, to24h, cuisineFromCategory } from "../src/seo/jsonld";
import { buildSite } from "../src/build/build-site";
import { render } from "../src/render/render";
import { validateSiteSpec } from "../src/validate/validate";
import { jsonLdParityPolicy } from "../src/policies/seo";
import { restaurantPack } from "../src/packs/restaurant";
import { demoSpec, demoBrief, demoSite } from "./fixtures/restaurant";
import { hansikBrief, hansikSpec, hansikSite } from "./fixtures/hansik";

const site = demoSite;

describe("LocalBusiness JSON-LD from the Brief", () => {
  const ld = localBusinessJsonLd(demoBrief, demoSpec, site);

  it("is grounded: name, phone, address come straight from the Brief", () => {
    expect(ld["@type"]).toBe("Restaurant");
    expect(ld["name"]).toBe(demoBrief.business.name);
    expect(ld["telephone"]).toBe(demoBrief.business.phone);
    expect((ld["address"] as Record<string, unknown>)["addressLocality"]).toBe("Sunnyvale");
  });

  it("derives opening hours (24h) and skips closed days", () => {
    const hours = ld["openingHoursSpecification"] as Array<Record<string, unknown>>;
    // Monday is closed in the Brief -> not present; Tuesday opens 11:30
    expect(hours.some((h) => h["dayOfWeek"] === "https://schema.org/Monday")).toBe(false);
    const tue = hours.find((h) => h["dayOfWeek"] === "https://schema.org/Tuesday")!;
    expect(tue["opens"]).toBe("11:30");
    expect(tue["closes"]).toBe("21:00");
  });

  it("never emits self-serving aggregateRating/review (Google 2019 policy)", () => {
    expect(ld["aggregateRating"]).toBeUndefined();
    expect(ld["review"]).toBeUndefined();
  });

  it("never invents priceRange — only emitted when the Brief provides it", () => {
    expect(ld["priceRange"]).toBeUndefined();
    const withPrice = localBusinessJsonLd(
      { ...demoBrief, business: { ...demoBrief.business, priceRange: "$$" } },
      demoSpec,
      site,
    );
    expect(withPrice["priceRange"]).toBe("$$");
  });

  it("derives servesCuisine from the category, not the raw category string", () => {
    expect(ld["servesCuisine"]).toBe("Italian");
    expect(cuisineFromCategory("Korean restaurant")).toBe("Korean");
    expect(cuisineFromCategory("Korean catering")).toBe("Korean");
    // pure-generic categories yield nothing rather than wrong data
    expect(cuisineFromCategory("Takeout Restaurant")).toBeUndefined();
    expect(cuisineFromCategory("Caterer")).toBeUndefined();
  });
});

describe("to24h accepts real-world scrape formats (hour-only meridiem regression)", () => {
  it("parses hour-only meridiem times like the live hunt produces", () => {
    expect(to24h("7 AM")).toBe("07:00");
    expect(to24h("5 PM")).toBe("17:00");
    expect(to24h("7am")).toBe("07:00");
    expect(to24h("7 a.m.")).toBe("07:00");
    expect(to24h("12 PM")).toBe("12:00");
    expect(to24h("12 AM")).toBe("00:00");
  });

  it("still parses H:MM and 24h forms", () => {
    expect(to24h("11:30 AM")).toBe("11:30");
    expect(to24h("9:00 PM")).toBe("21:00");
    expect(to24h("07:00")).toBe("07:00");
    expect(to24h("19:00")).toBe("19:00");
  });

  it("rejects nonsense instead of emitting bad data", () => {
    expect(to24h("25:00")).toBeUndefined();
    expect(to24h("13 PM")).toBeUndefined();
    expect(to24h("noonish")).toBeUndefined();
    expect(to24h("7:75 AM")).toBeUndefined();
  });

  it("the scrape-shaped Brief loses zero open days", () => {
    const ld = localBusinessJsonLd(hansikBrief, hansikSpec, hansikSite);
    const hours = ld["openingHoursSpecification"] as Array<Record<string, unknown>>;
    const openDays = (hansikBrief.hours ?? []).filter((h) => !h.closed);
    expect(hours).toHaveLength(openDays.length); // 6 — Sunday closed
    const mon = hours.find((h) => h["dayOfWeek"] === "https://schema.org/Monday")!;
    expect(mon["opens"]).toBe("07:00");
    expect(mon["closes"]).toBe("17:00");
  });
});

describe("seo/jsonld-parity policy — silent drops become loud failures", () => {
  const ctx = { brief: demoBrief, spec: demoSpec };

  it("passes on faithful output", () => {
    const html = render({ spec: demoSpec, pack: restaurantPack, brief: demoBrief, site });
    expect(jsonLdParityPolicy.evaluate({ ...ctx, html })).toEqual([]);
  });

  it("flags dropped hours", () => {
    const html =
      `<script type="application/ld+json">` +
      JSON.stringify({ "@type": "Restaurant", telephone: "x", address: {} }) +
      `</script>`;
    const findings = jsonLdParityPolicy.evaluate({ ...ctx, html });
    expect(findings.map((f) => f.messageId)).toContain("jsonld.hours-dropped");
  });

  it("flags an invented priceRange plus dropped phone and address", () => {
    const html =
      `<script type="application/ld+json">` +
      JSON.stringify({ "@type": "Restaurant", priceRange: "$$" }) +
      `</script>`;
    const ids = jsonLdParityPolicy.evaluate({ ...ctx, html }).map((f) => f.messageId);
    expect(ids).toContain("jsonld.pricerange-ungrounded");
    expect(ids).toContain("jsonld.phone-dropped");
    expect(ids).toContain("jsonld.address-dropped");
  });
});

describe("SEO head surface (render with site context)", () => {
  const html = render({ spec: demoSpec, pack: restaurantPack, brief: demoBrief, site });

  it("emits canonical, hreflang per-locale + x-default, OG, and JSON-LD", () => {
    expect(html).toContain('<link rel="canonical" href="https://rosalias.example/">');
    expect(html).toContain('hreflang="en" href="https://rosalias.example/"');
    expect(html).toContain('hreflang="es" href="https://rosalias.example/es/"');
    expect(html).toContain('hreflang="x-default"');
    expect(html).toContain('property="og:image" content="https://rosalias.example/og.png"');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"Restaurant"');
  });

  it("preloads fonts and ships the a11y widget + skip link", () => {
    expect(html).toContain('rel="preconnect" href="https://fonts.gstatic.com"');
    expect(html).toContain('rel="preload" as="style"');
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('data-a11y-root');
    expect(html).toContain('<main id="main">');
  });

  it("ships the full PWA/icon/meta surface (zero gaps)", () => {
    expect(html).toContain('<html lang="en" translate="no">');
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('name="robots" content="index, follow');
    expect(html).toContain('<link rel="manifest" href="/manifest.json">');
    // default context: only the emitted svg favicon is linked (no dangling refs)
    expect(html).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"');
    expect(html).not.toContain('rel="apple-touch-icon"');
    expect(html).not.toContain('sizes="96x96"');
    // provided icons ARE linked
    const withIcons = render({
      spec: demoSpec, pack: restaurantPack, brief: demoBrief,
      site: { ...site, icons: { svg: "/favicon.svg", png96: "/favicon-96x96.png", appleTouch: "/apple-touch-icon.png" } },
    });
    expect(withIcons).toContain('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"');
    expect(withIcons).toContain('rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png"');
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="application-name" content="Rosalia&#39;s Kitchen"');
    expect(html).toContain('property="og:site_name" content="Rosalia&#39;s Kitchen"');
    expect(html).toContain('property="og:image:alt"');
    expect(html).toContain('"@type":"Restaurant"');
    expect(html).toContain('"@type":"WebSite"');
  });

  it("passes the rendered-tier SEO/a11y policies", () => {
    const result = validateSiteSpec({ spec: demoSpec, pack: restaurantPack, brief: demoBrief, html });
    expect(result.ok).toBe(true);
    const ids = result.findings.map((f) => f.policyId);
    expect(ids).not.toContain("seo/json-ld-present");
    expect(ids).not.toContain("a11y/skip-link");
  });
});

describe("buildSite — the deployable correctness layer", () => {
  const files = buildSite({ spec: demoSpec, pack: restaurantPack, brief: demoBrief, site });

  it("emits the full deployable surface (html, seo files, headers, 404, favicon, manifests)", () => {
    expect(Object.keys(files).sort()).toEqual([
      "404.html", "DEPLOY.md", "_headers", "_redirects", "favicon.svg", "foundation.json",
      "index.html", "llms.txt", "manifest.json", "robots.txt", "sitemap.xml",
    ]);
  });

  it("404 is themed, noindexed, and links home; favicon is a theme letter-mark", () => {
    expect(files["404.html"]).toContain('<meta name="robots" content="noindex">');
    expect(files["404.html"]).toContain('lang="en"');
    expect(files["404.html"]).toContain('href="/"');
    expect(files["favicon.svg"]).toContain("<svg");
    expect(files["favicon.svg"]).toContain(">R</text>"); // Rosalia's letter-mark
  });

  it("foundation.json defaults to the honest empty surface", () => {
    const f = JSON.parse(files["foundation.json"]!) as Record<string, unknown>;
    expect(f["env"]).toEqual([]);
    expect(f["cookies"]).toEqual([]);
    expect((f["analytics"] as Record<string, unknown>)["provider"]).toBe("none");
    expect(f["forms"]).toEqual([]);
  });

  it("sitemap has per-locale alternates", () => {
    expect(files["sitemap.xml"]).toContain('hreflang="en" href="https://rosalias.example/"');
    expect(files["sitemap.xml"]).toContain('hreflang="es" href="https://rosalias.example/es/"');
    expect(files["sitemap.xml"]).toContain('hreflang="x-default"');
  });

  it("robots has the bot policy + sitemap; llms.txt summarizes the business", () => {
    expect(files["robots.txt"]).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=no");
    expect(files["robots.txt"]).toContain("User-agent: GPTBot\nDisallow: /");
    expect(files["robots.txt"]).toContain("Sitemap: https://rosalias.example/sitemap.xml");
    expect(files["llms.txt"]).toContain("# Rosalia's Kitchen");
    expect(files["llms.txt"]).toContain("Phone: +14085550142");
  });

  it("manifest.json has name, colors, and only icons that ship", () => {
    const m = JSON.parse(files["manifest.json"]!) as Record<string, unknown>;
    expect(m["name"]).toBe("Rosalia's Kitchen");
    expect(m["theme_color"]).toBe("#faf6f0");
    const icons = m["icons"] as Array<Record<string, unknown>>;
    expect(icons).toEqual([{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }]);
    const withIcons = buildSite({
      spec: demoSpec, pack: restaurantPack, brief: demoBrief,
      site: { ...site, icons: { svg: "/favicon.svg", maskable512: "/icon-512.png" } },
    });
    const m2 = JSON.parse(withIcons["manifest.json"]!) as Record<string, unknown>;
    const icons2 = m2["icons"] as Array<Record<string, unknown>>;
    expect(icons2.some((i) => i["purpose"] === "maskable" && i["sizes"] === "512x512")).toBe(true);
  });

  it("_headers has the security profile (deep-audit section 08)", () => {
    const h = files["_headers"]!;
    // HSTS: one year, no includeSubDomains/preload unless the owner opts in
    expect(h).toContain("Strict-Transport-Security: max-age=31536000\n");
    expect(h).not.toContain("preload");
    expect(h).toContain("X-Content-Type-Options: nosniff");
    expect(h).toContain("X-Frame-Options: DENY");
    expect(h).toContain("Referrer-Policy: strict-origin-when-cross-origin");
    // FLoC died in 2022; interest-cohort is cargo cult
    expect(h).not.toContain("interest-cohort");
    expect(h).toContain("X-XSS-Protection: 0");
    expect(h).toContain("Cross-Origin-Opener-Policy: same-origin");
  });

  it("CSP is enforcing with sha256 hashes for every inline script", () => {
    const h = files["_headers"]!;
    expect(h).toContain("Content-Security-Policy: ");
    expect(h).not.toContain("Content-Security-Policy-Report-Only");
    const csp = /Content-Security-Policy: ([^\n]+)/.exec(h)![1]!;
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src "))!;
    // no unsafe-inline for scripts; the inline a11y bootstrap is hash-allowed
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).toMatch(/'sha256-[A-Za-z0-9+/]+=*'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'none'");
  });

  it("hsts opt-ins expand the header (preload implies includeSubDomains)", () => {
    const withHsts = buildSite({
      spec: demoSpec,
      pack: restaurantPack,
      brief: demoBrief,
      site: { ...site, hsts: { preload: true } },
    });
    expect(withHsts["_headers"]).toContain(
      "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
    );
  });
});
