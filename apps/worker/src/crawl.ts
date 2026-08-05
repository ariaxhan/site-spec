/**
 * The hosted auditor's crawler.
 *
 * This is a deliberately smaller, harder sibling of the CLI's `fetchSite`.
 * The CLI crawls on behalf of the person who typed the URL on their own
 * machine; this crawls on behalf of anonymous strangers from inside
 * Cloudflare's network, so it adds:
 *
 *   - guard admission on the start URL AND on every redirect hop
 *   - manual redirect handling with a hop cap (redirect: "follow" would let a
 *     public hostname bounce the fetcher onto 169.254.169.254)
 *   - a hard byte cap per response and across the whole crawl
 *   - a subrequest budget, because the Workers free plan allows 50 per request
 *   - a wall-clock deadline shared by every fetch
 *
 * Output shape is exactly what the pure `auditFiles` engine consumes.
 */

import { admitUrl, checkUrlSyntax } from "./guard";

const USER_AGENT =
  "site-spec-audit/0.3 (+https://github.com/ariaxhan/site-spec; hosted auditor)";

export const LIMITS = {
  /** pages of HTML actually audited (free plan: 10ms CPU, keep the corpus small) */
  maxPages: 4,
  /** hard ceiling on fetches, well under the 50/request free-plan budget */
  maxSubrequests: 30,
  /** per-response body cap */
  maxBytesPerResponse: 400_000,
  /** cap across every body we keep */
  maxBytesTotal: 1_500_000,
  /** below this much remaining budget we stop rather than return a stub body */
  minBytesForFetch: 40_000,
  /** redirect hops per URL */
  maxRedirects: 3,
  /** wall clock for the whole crawl */
  totalTimeoutMs: 20_000,
  /** wall clock for a single fetch */
  perRequestTimeoutMs: 6_000,
} as const;

export interface CrawlMeta {
  origin: string;
  startUrl: string;
  finalUrl: string;
  fetched: string[];
  notes: string[];
  subrequests: number;
  truncated: boolean;
}

export interface CrawlResult {
  files: Record<string, string | null>;
  meta: CrawlMeta;
}

export class GuardError extends Error {}

/** Mirror of the CLI's pathToKey: map a URL path to an audit file-map key. */
export function pathToKey(pathname: string): string {
  const clean = pathname.split(/[?#]/)[0] ?? "";
  if (clean === "" || clean === "/") return "index.html";
  const stripped = clean.replace(/^\/+/, "");
  if (/\.html?$/i.test(stripped)) return stripped;
  const last = stripped.split("/").pop() ?? "";
  if (/\.[a-z0-9]+$/i.test(last)) return stripped;
  return `${stripped.replace(/\/+$/, "")}/index.html`;
}

/** Turn real response headers into a Cloudflare-style `_headers` body. */
export function synthesizeHeaders(headers: Record<string, string>): string {
  let out = "/*\n";
  for (const [name, value] of Object.entries(headers)) out += `  ${name}: ${value}\n`;
  return out;
}

interface Fetched {
  status: number;
  finalUrl: string;
  contentType: string;
  headers: Record<string, string>;
  body: string | null;
}

/** Read a response body with a hard byte ceiling, without buffering the rest. */
async function readCapped(res: Response, cap: number): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: "", truncated: false };
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let text = "";
  let total = 0;
  let truncated = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > cap) {
        const keep = Math.max(0, value.byteLength - (total - cap));
        text += decoder.decode(value.slice(0, keep), { stream: true });
        truncated = true;
        break;
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return { text, truncated };
}

/** Crawl-scoped fetcher enforcing the budget, the deadline and the guard. */
class Session {
  subrequests = 0;
  bytes = 0;
  truncated = false;
  readonly notes: string[] = [];
  /** hostnames whose DNS records were already validated during this crawl */
  readonly admittedHosts = new Set<string>();
  private readonly deadline = Date.now() + LIMITS.totalTimeoutMs;

  budgetLeft(): boolean {
    return (
      this.subrequests < LIMITS.maxSubrequests &&
      Date.now() < this.deadline &&
      LIMITS.maxBytesTotal - this.bytes >= LIMITS.minBytesForFetch
    );
  }

  /** An AbortSignal that fires at the per-request timeout or the crawl deadline. */
  private signal(): AbortSignal {
    const remaining = Math.max(0, this.deadline - Date.now());
    return AbortSignal.timeout(Math.min(LIMITS.perRequestTimeoutMs, remaining) || 1);
  }

  /**
   * Fetch one URL, re-running full guard admission on every redirect hop.
   * Never throws for network reasons; a failure becomes status 0.
   */
  async get(target: string, opts?: { guarded?: boolean }): Promise<Fetched> {
    const dead: Fetched = {
      status: 0,
      finalUrl: target,
      contentType: "",
      headers: {},
      body: null,
    };
    let current = target;

    for (let hop = 0; hop <= LIMITS.maxRedirects; hop++) {
      if (!this.budgetLeft()) {
        this.notes.push("crawl budget exhausted");
        return dead;
      }

      // Admission. Syntax is re-checked on every hop; the DNS half is done once
      // per hostname per crawl and then cached.
      //
      // Caching is safe and necessary. Necessary because each DoH lookup costs
      // two subrequests, and the free plan allows 50 per request: paying that
      // on all ~12 same-origin fetches starved the 404 probe and made the
      // report claim "no 404 page" for sites that have one. Safe because a
      // hostname's records could change between any two lookups anyway, so
      // re-resolving the SAME host mid-crawl buys nothing. What matters is that
      // every DISTINCT host is validated, and a redirect to a new host still
      // falls through to a full check below.
      if (hop > 0 || opts?.guarded !== true) {
        let host: string;
        try {
          host = new URL(current).hostname.toLowerCase();
        } catch {
          return dead;
        }
        if (!this.admittedHosts.has(host)) {
          const verdict = await admitUrl(current, this.signal());
          this.subrequests += 2; // the DoH A + AAAA lookups
          if (!verdict.ok) {
            if (hop > 0) throw new GuardError(`redirect blocked: ${verdict.reason}`);
            return dead;
          }
          this.admittedHosts.add(host);
        } else {
          // still enforce scheme, port, credential and literal-address rules
          const syntax = checkUrlSyntax(current);
          if (!syntax.ok) {
            if (hop > 0) throw new GuardError(`redirect blocked: ${syntax.reason}`);
            return dead;
          }
        }
      }

      this.subrequests++;
      let res: Response;
      try {
        res = await fetch(current, {
          headers: { "User-Agent": USER_AGENT, accept: "text/html,text/plain,application/xml,*/*" },
          redirect: "manual",
          signal: this.signal(),
        });
      } catch (err) {
        this.notes.push(
          `fetch failed: ${current} (${err instanceof Error ? err.message : String(err)})`,
        );
        return dead;
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return dead;
        let next: string;
        try {
          next = new URL(location, current).href;
        } catch {
          return dead;
        }
        // Syntactic rejection here produces a clear message instead of a 0.
        const syntax = checkUrlSyntax(next);
        if (!syntax.ok) throw new GuardError(`redirect blocked: ${syntax.reason}`);
        current = next;
        continue;
      }

      const headers: Record<string, string> = {};
      res.headers.forEach((value, name) => {
        headers[name] = value;
      });

      // budgetLeft() guarantees at least minBytesForFetch here, so a body is
      // never read with a near-zero cap. That mattered: a cap of ~0 used to
      // yield an empty string that still looked like a valid HTML page, which
      // then overwrote a good copy and produced a page of false "missing"
      // findings. An audit tool that invents failures is worse than no tool.
      const remainingBytes = Math.max(0, LIMITS.maxBytesTotal - this.bytes);
      const cap = Math.min(LIMITS.maxBytesPerResponse, remainingBytes);
      const { text, truncated } = await readCapped(res, cap);
      this.bytes += text.length;
      if (truncated) {
        this.truncated = true;
        this.notes.push(`response truncated at the size cap: ${current}`);
      }

      return {
        status: res.status,
        finalUrl: current,
        contentType: headers["content-type"] ?? "",
        headers,
        body: text,
      };
    }

    this.notes.push(`too many redirects: ${target}`);
    return dead;
  }
}

/** An HTML page we actually managed to read. An empty body is never a page. */
const isHtml = (r: Fetched): boolean => {
  if (typeof r.body !== "string" || r.body.trim() === "") return false;
  return (
    /text\/html|application\/xhtml\+xml/i.test(r.contentType) ||
    (r.contentType === "" && /<html[\s>]/i.test(r.body))
  );
};

/**
 * Only treat a body as a sitemap if it actually parses as sitemap XML.
 * `sitemap.xml.gz` is served as application/xml but is gzip bytes; decoding it
 * as UTF-8 yields replacement characters, and scraping <loc> out of that gives
 * garbage URLs while burning the byte budget.
 */
const looksLikeSitemap = (body: string): boolean =>
  /<(?:urlset|sitemapindex)[\s>]/i.test(body);

/** A URL we cannot decompress, so there is no point spending budget on it. */
const isCompressed = (href: string): boolean => /\.gz(\?|$)/i.test(href);

const parseLocs = (xml: string): string[] =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]!);

function parseLinks(html: string, origin: string, base: string): string[] {
  const out: string[] = [];
  const noScript = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  for (const m of noScript.matchAll(/<a\b[^>]*?\shref="([^"]+)"/gi)) {
    const raw = m[1]!;
    if (/^(mailto:|tel:|sms:|data:|javascript:|#)/i.test(raw)) continue;
    try {
      const u = new URL(raw, base);
      if (u.origin === origin) out.push(u.href);
    } catch {
      /* malformed href */
    }
  }
  return out;
}

/**
 * Crawl a target that has ALREADY passed `admitUrl`, and shape the result into
 * the audit engine's file map.
 */
export async function crawlSite(admitted: URL): Promise<CrawlResult> {
  const session = new Session();
  const files: Record<string, string | null> = {};
  const fetched: string[] = [];

  // 1. the start page (already admitted by the caller, so skip a duplicate DoH)
  const start = await session.get(admitted.href, { guarded: true });
  if (start.status === 0) {
    throw new GuardError("could not fetch that URL");
  }
  files["_headers"] = synthesizeHeaders(start.headers);

  const finalUrl = start.finalUrl;
  const finalOrigin = new URL(finalUrl).origin;

  if (!isHtml(start) || typeof start.body !== "string") {
    throw new GuardError(
      `that URL returned ${start.contentType || "no content type"} (HTTP ${start.status}), not an HTML page`,
    );
  }
  {
    const path = new URL(finalUrl).pathname;
    files[pathToKey(path)] = start.body;
    fetched.push(path);
  }

  // 2. origin-level presence files. A non-200 is left OUT of the map on
  //    purpose so the engine's presence checks fire.
  const originFile = async (name: string, key: string): Promise<Fetched> => {
    const r = await session.get(`${finalOrigin}/${name}`);
    if (r.status === 200 && typeof r.body === "string") files[key] = r.body;
    return r;
  };

  const robots = await originFile("robots.txt", "robots.txt");
  await originFile("llms.txt", "llms.txt");

  const sitemapBodies: string[] = [];
  const rootSitemap = await originFile("sitemap.xml", "sitemap.xml");
  if (rootSitemap.status === 200 && looksLikeSitemap(rootSitemap.body ?? "")) {
    sitemapBodies.push(rootSitemap.body!);
  }
  if (robots.status === 200 && typeof robots.body === "string") {
    for (const m of [...robots.body.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim)].slice(0, 2)) {
      try {
        const u = new URL(m[1]!);
        if (u.origin !== finalOrigin || isCompressed(u.href)) continue;
        const r = await session.get(u.href);
        if (r.status === 200 && looksLikeSitemap(r.body ?? "")) sitemapBodies.push(r.body!);
      } catch {
        /* malformed sitemap URL */
      }
    }
  }

  // 3. flatten sitemap indexes (at most 2 children, to stay inside the budget)
  const locUrls: string[] = [];
  for (const body of sitemapBodies) {
    if (/<sitemapindex[\s>]/i.test(body)) {
      for (const child of parseLocs(body).filter((c) => !isCompressed(c)).slice(0, 2)) {
        try {
          const u = new URL(child);
          if (u.origin !== finalOrigin) continue;
          const r = await session.get(u.href);
          if (r.status === 200 && looksLikeSitemap(r.body ?? "")) locUrls.push(...parseLocs(r.body!));
        } catch {
          /* ignore */
        }
      }
    } else {
      locUrls.push(...parseLocs(body));
    }
  }

  // 4. deterministic crawl set: sitemap locs + start-page links, same-origin
  const seen = new Set<string>([new URL(finalUrl).pathname]);
  const queue: string[] = [];
  const enqueue = (href: string): void => {
    try {
      const u = new URL(href);
      if (u.origin !== finalOrigin) return;
      if (seen.has(u.pathname)) return;
      seen.add(u.pathname);
      queue.push(u.href);
    } catch {
      /* ignore */
    }
  };
  for (const loc of locUrls) enqueue(loc);
  for (const link of parseLinks(start.body, finalOrigin, finalUrl)) enqueue(link);

  const remaining = Math.max(0, LIMITS.maxPages - fetched.length);
  if (queue.length > remaining) {
    session.notes.push(
      `crawl capped at ${LIMITS.maxPages} pages (${seen.size} URLs discovered)`,
    );
  }
  // sort before capping so the same site always yields the same page set
  const toFetch = [...queue]
    .sort((a, b) => {
      const pa = new URL(a).pathname;
      const pb = new URL(b).pathname;
      return pa < pb ? -1 : pa > pb ? 1 : 0;
    })
    .slice(0, remaining);

  // sequential: concurrency buys nothing against a 10ms CPU budget and makes
  // the subrequest accounting exact.
  for (const url of toFetch) {
    if (!session.budgetLeft()) break;
    const r = await session.get(url);
    if (r.status === 0 || !isHtml(r) || typeof r.body !== "string") continue;
    const path = new URL(r.finalUrl).pathname;
    const key = pathToKey(path);
    // Never overwrite a page already in the map. A redirect can land a crawled
    // URL back on a page we already read; replacing the good copy with a
    // second, possibly truncated one manufactures false findings.
    if (key in files) continue;
    files[key] = r.body;
    fetched.push(path);
  }

  // 5. 404 behavior probe
  if (session.budgetLeft()) {
    const probe = await session.get(`${finalOrigin}/__site_spec_probe_404__`);
    if (probe.status === 404 && isHtml(probe) && typeof probe.body === "string") {
      files["404.html"] = probe.body;
    } else if (probe.status === 200 && isHtml(probe)) {
      session.notes.push("soft 404: unknown paths return HTTP 200 instead of 404");
    }
  }

  return {
    files,
    meta: {
      origin: finalOrigin,
      startUrl: admitted.href,
      finalUrl,
      fetched,
      notes: session.notes,
      subrequests: session.subrequests,
      truncated: session.truncated,
    },
  };
}
