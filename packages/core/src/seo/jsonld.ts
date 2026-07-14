import type { Brief } from "../schema/brief";
import type { SiteSpec } from "../schema/site-spec";
import type { SiteContext } from "../schema/site";
import { absUrl } from "../schema/site";

/**
 * Real-world time string -> 24h "HH:MM" for schema.org.
 * Accepts what scrapes actually produce: "11:30 AM", "7 AM", "7am", "7 a.m.",
 * "07:00", "19:00". The original `H:MM` regex silently dropped every hour of
 * an early real-world lead whose hours read "7 AM" — minutes are optional now.
 */
export function to24h(t: string | undefined): string | undefined {
  if (!t) return undefined;
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(?:([AP])\.?\s*M\.?)?$/i.exec(t.trim());
  if (!m) return undefined;
  let h = Number(m[1]);
  const min = m[2] ?? "00";
  const mer = m[3]?.toUpperCase();
  if (h > 23 || Number(min) > 59) return undefined;
  if (mer && (h < 1 || h > 12)) return undefined;
  if (mer === "P" && h !== 12) h += 12;
  if (mer === "A" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

/**
 * Derive a schema.org cuisine from a scraped business category:
 * "Korean restaurant" -> "Korean", "Italian restaurant" -> "Italian".
 * Pure generic categories ("Caterer", "Takeout Restaurant") yield undefined —
 * emitting the raw category as `servesCuisine` was wrong data.
 */
export function cuisineFromCategory(category: string): string | undefined {
  const GENERIC =
    /\b(restaurant|catering|caterer|cafe|café|food|kitchen|takeout|take-?out|to-go|diner|grill|bar|deli|bakery|pizzeria|eatery|cuisine|place)\b/gi;
  const c = category.replace(GENERIC, " ").replace(/\s+/g, " ").trim();
  return c.length ? c : undefined;
}

function postalAddress(
  addr: string | undefined,
  country: string | undefined,
): Record<string, unknown> | undefined {
  if (!addr) return undefined;
  const parts = addr.split(",").map((s) => s.trim());
  // addressCountry only when the Brief declares it; a hardcoded "US" was an
  // invented fact for any non-US business (grounding violation).
  const out: Record<string, unknown> = { "@type": "PostalAddress" };
  if (country) out["addressCountry"] = country;
  if (parts[0]) out["streetAddress"] = parts[0];
  if (parts[1]) out["addressLocality"] = parts[1];
  if (parts[2]) {
    const m = /([A-Z]{2})\s*(\d{5})?/.exec(parts[2]);
    if (m) {
      out["addressRegion"] = m[1];
      if (m[2]) out["postalCode"] = m[2];
    }
  }
  return out;
}

const FOOD = /restaurant|cafe|caterer|catering|food|bakery|diner|grill|bar|deli|pizzeria/i;

/** Resolve the short app/site name: explicit override, else business, else title. */
export function resolveAppName(
  ctx: SiteContext,
  spec: SiteSpec,
  businessName?: string,
): string {
  return ctx.appName ?? businessName ?? spec.meta.title.value;
}

/** WebSite node — emitted by every reference site alongside the business node. */
export function websiteJsonLd(
  spec: SiteSpec,
  ctx: SiteContext,
  appName: string,
): Record<string, unknown> {
  // Anchor identity to the page path, not the origin root: one origin can host
  // many pages (e.g. a directory hosts a landing page per listing at /<slug>), and a
  // root-anchored @id would collide across every page on the same origin.
  const page = absUrl(ctx.baseUrl, ctx.path);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": page + "#website",
    url: page,
    name: appName,
    description: spec.meta.description.value,
    inLanguage: spec.meta.lang,
    publisher: { "@id": page + "#business" },
  };
}

/**
 * SoftwareApplication node — for product/app sites (brief.business.kind ===
 * "softwareApplication"), e.g. a landing page. No storefront facts (hours,
 * address, priceRange); instead the app surface (category, platforms, offers),
 * every field Brief-sourced or absent. Shares the "#business" @id slot so the WebSite node's publisher
 * reference resolves without special-casing websiteJsonLd.
 */
export function softwareApplicationJsonLd(
  brief: Brief,
  spec: SiteSpec,
  ctx: SiteContext,
): Record<string, unknown> {
  const biz = brief.business;
  const page = absUrl(ctx.baseUrl, ctx.path);
  // Product facts are Brief-sourced or ABSENT. The compiler never invents an
  // applicationCategory or a price to satisfy a rich-result recipe (that is
  // the manual-action path). A product without real ratings simply does not
  // qualify for the rich result yet, and that is fine.
  const b = brief as {
    platforms?: string[];
    appCategory?: string;
    pricing?: "free" | { price: string; currency: string };
  };
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": page + "#business",
    name: biz.name,
    description: spec.meta.description.value,
    url: page,
  };
  if (b.appCategory) data["applicationCategory"] = b.appCategory;
  if (b.pricing === "free") {
    data["offers"] = { "@type": "Offer", price: "0", priceCurrency: "USD" };
  } else if (b.pricing && typeof b.pricing === "object") {
    data["offers"] = {
      "@type": "Offer",
      price: b.pricing.price,
      priceCurrency: b.pricing.currency,
    };
  }
  if (Array.isArray(b.platforms) && b.platforms.length) {
    data["operatingSystem"] = b.platforms.join(", ");
  }
  if (ctx.ogImage) data["image"] = ctx.ogImage;
  if (ctx.sameAs && ctx.sameAs.length) data["sameAs"] = ctx.sameAs;
  return data;
}

/**
 * The primary entity node — dispatches on brief.business.kind. Default and
 * "localBusiness" → LocalBusiness/Restaurant; "softwareApplication" → the app
 * surface. One seam so render() never branches on business kind.
 */
export function primaryEntityJsonLd(
  brief: Brief,
  spec: SiteSpec,
  ctx: SiteContext,
): Record<string, unknown> {
  return brief.business.kind === "softwareApplication"
    ? softwareApplicationJsonLd(brief, spec, ctx)
    : localBusinessJsonLd(brief, spec, ctx);
}

/**
 * Generate schema.org structured data from the BRIEF — the same grounded facts
 * that fill the page also fill the JSON-LD, so the structured data is accurate
 * by construction. This is the engine's core differentiator: every site ships
 * with correct LocalBusiness/Restaurant data and hours for free.
 */
export function localBusinessJsonLd(
  brief: Brief,
  spec: SiteSpec,
  ctx: SiteContext,
): Record<string, unknown> {
  const biz = brief.business;
  const type = FOOD.test(biz.category) ? "Restaurant" : "LocalBusiness";
  // page-path-anchored identity (see websiteJsonLd) — unique per page on a
  // multi-page origin, identical to the old root-anchored value when path is "/".
  const page = absUrl(ctx.baseUrl, ctx.path);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
    "@id": page + "#business",
    name: biz.name,
    description: spec.meta.description.value,
    url: page,
  };
  // priceRange only when the Brief carries it — the previous hardcoded "$$"
  // was an invented fact shipped to Google (grounding violation).
  if (biz.priceRange) data["priceRange"] = biz.priceRange;
  if (biz.phone) data["telephone"] = biz.phone;
  if (biz.email) data["email"] = biz.email;
  const addr = postalAddress(biz.address, biz.country);
  if (addr) data["address"] = addr;
  if (type === "Restaurant") {
    const cuisine = cuisineFromCategory(biz.category);
    if (cuisine) data["servesCuisine"] = cuisine;
  }
  if (ctx.ogImage) data["image"] = ctx.ogImage;
  if (ctx.organization) {
    data["parentOrganization"] = {
      "@type": "Organization",
      name: ctx.organization.name,
      url: ctx.organization.url,
    };
  }
  if (ctx.sameAs && ctx.sameAs.length) data["sameAs"] = ctx.sameAs;

  const hours = (brief.hours ?? [])
    .filter((h) => !h.closed)
    .map((h): Record<string, unknown> | null => {
      const opens = to24h(h.open);
      const closes = to24h(h.close);
      if (!opens || !closes) return null;
      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${h.day}`,
        opens,
        closes,
      };
    })
    .filter((x) => x !== null);
  if (hours.length) data["openingHoursSpecification"] = hours;

  // NO aggregateRating/review here, ever: Google prohibits self-serving review
  // markup on LocalBusiness/Organization (Sept 2019 policy). At best it is
  // ignored; at worst it is a structured-data spam signal. Brief reviews render
  // as VISIBLE testimonials (with provenance) via pack sections instead.

  return data;
}
