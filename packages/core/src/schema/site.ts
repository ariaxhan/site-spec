import { z } from "zod";

/**
 * Icon asset paths. Only the svg favicon is linked by default, buildSite emits
 * a deterministic /favicon.svg, so the default never dangles. The png variants
 * are linked ONLY when the deploy actually provides them (a linked icon that
 * 404s is slop; the old defaults shipped four dangling references per site).
 */
export const siteIcons = z.object({
  /** scalable favicon; buildSite emits the file when left at the default */
  svg: z.string().default("/favicon.svg"),
  /** 96x96 png favicon (optional, linked only when provided) */
  png96: z.string().optional(),
  /** 180x180 apple touch icon (optional, linked only when provided) */
  appleTouch: z.string().optional(),
  /** 192x192 maskable (optional, in manifest only when provided) */
  maskable192: z.string().optional(),
  /** 512x512 maskable (optional, in manifest only when provided) */
  maskable512: z.string().optional(),
});
export type SiteIcons = z.infer<typeof siteIcons>;

/**
 * Site-level deployment context, the environmental facts the renderer needs to
 * emit correct canonical URLs, hreflang alternates, sitemaps, structured data,
 * PWA manifest, icons, and security headers. Kept separate from the SiteSpec
 * (which is portable/content) because these are deploy-time concerns.
 */
export const siteContext = z.object({
  /** origin, e.g. https://rosalias.example (no trailing slash required) */
  baseUrl: z.string().url(),
  /** this page's path, e.g. "/" */
  path: z.string().default("/"),
  /** every locale this site is published in (BCP-47). First is canonical order. */
  locales: z.array(z.string().min(2)).min(1),
  defaultLocale: z.string().min(2),
  /** absolute URL of the 1200x630 share image */
  ogImage: z.string().url().optional(),
  /** short app name for PWA/apple-web-app meta; defaults to the business name */
  appName: z.string().min(1).optional(),
  /** browser-chrome color; defaults to the theme background */
  themeColor: z.string().optional(),
  /** icon asset paths; sensible defaults applied */
  icons: siteIcons.default({}),
  /** twitter handle incl. @, e.g. "@rosalias" */
  twitterHandle: z.string().optional(),
  /**
   * Emit <meta name="google" content="notranslate">. Off by default: blocking
   * browser translation locks out visitors who read neither site language.
   * Opt in only to protect brand names that mistranslate badly.
   */
  noTranslate: z.boolean().default(false),
  /**
   * HSTS scope. Both default false: `includeSubDomains` can brick a client's
   * HTTP-only subdomain (webmail, booking) the compiler knows nothing about,
   * and hstspreload.org explicitly tells tools not to emit `preload` by
   * default (it is semi-permanent, months to unwind). Owner opt-ins only.
   * preload implies includeSubDomains at emission (the preload list requires it).
   */
  hsts: z
    .object({
      subdomains: z.boolean().default(false),
      preload: z.boolean().default(false),
    })
    .default({}),
  /**
   * Whether AI training crawlers may ingest the site. The owner's values
   * call, not the compiler's. Default "block": search + AI-search/user-fetch
   * agents stay allowed either way (being findable is the point).
   */
  aiTraining: z.enum(["allow", "block"]).default("block"),
  /** social/profile URLs for schema.org sameAs */
  sameAs: z.array(z.string().url()).optional(),
  /** redirect rules emitted to _redirects (Cloudflare Pages / Netlify format) */
  redirects: z
    .array(
      z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        status: z.number().int().default(301),
      }),
    )
    .default([]),
  organization: z
    .object({ name: z.string().min(1), url: z.string().url() })
    .optional(),
});
export type SiteContext = z.infer<typeof siteContext>;

/** Locale-aware path: default locale lives at root, others are prefixed. */
export function localePath(path: string, locale: string, defaultLocale: string): string {
  if (locale === defaultLocale) return path;
  if (path === "/") return `/${locale}/`;
  return `/${locale}${path}`;
}

/** Join an origin and a path into one absolute URL. */
export function absUrl(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/+$/, "") + path;
}
