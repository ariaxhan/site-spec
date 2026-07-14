/**
 * Live-URL crawler: fetch a site over the network and shape it into the audit
 * file map the pure engine (auditFiles) consumes. All network I/O lives here;
 * the exported pure helpers (pathToKey, synthesizeHeaders) are unit-testable
 * offline. Dependency-free: Node global fetch + node:* only.
 */

const USER_AGENT = "site-spec-audit/0.2 (+https://github.com/ariaxhan/site-spec)";
const TIMEOUT_MS = 10_000;

/**
 * Map a URL pathname to a file-map key the engine treats as a page.
 *   "/"                → "index.html"
 *   "/foo.html"        → "foo.html"        (strip leading slash)
 *   "/foo/bar"         → "foo/bar/index.html" (extension-less dir)
 *   "/a.pdf"           → "a.pdf"           (non-html extension, as-is)
 * Pure + deterministic.
 */
export function pathToKey(pathname: string): string {
  const clean = pathname.split(/[?#]/)[0] ?? "";
  if (clean === "" || clean === "/") return "index.html";
  const stripped = clean.replace(/^\/+/, "");
  if (/\.html?$/i.test(stripped)) return stripped;
  // last segment carries the extension test
  const last = stripped.split("/").pop() ?? "";
  if (/\.[a-z0-9]+$/i.test(last)) return stripped; // non-html extension, as-is
  return `${stripped.replace(/\/+$/, "")}/index.html`;
}

/**
 * Turn HTTP response headers into a Cloudflare/Netlify-style `_headers` body so
 * the engine's header checks run against the REAL response. Pure.
 */
export function synthesizeHeaders(headers: Record<string, string>): string {
  let out = "/*\n";
  for (const [name, value] of Object.entries(headers)) {
    out += `  ${name}: ${value}\n`;
  }
  return out;
}

interface FetchResult {
  status: number;
  finalUrl: string;
  contentType: string;
  headers: Record<string, string>;
  body: string | null;
}

/** Fetch a URL as text, never throwing: network/timeout errors become status 0. */
async function fetchText(url: string, errors: string[]): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
    });
    const headers: Record<string, string> = {};
    res.headers.forEach((value, name) => {
      headers[name] = value;
    });
    const contentType = headers["content-type"] ?? "";
    const body = await res.text().catch(() => null);
    return { status: res.status, finalUrl: res.url || url, contentType, headers, body };
  } catch (err) {
    errors.push(`fetch failed: ${url} (${err instanceof Error ? err.message : String(err)})`);
    return { status: 0, finalUrl: url, contentType: "", headers: {}, body: null };
  } finally {
    clearTimeout(timer);
  }
}

const isHtml = (r: FetchResult): boolean =>
  /text\/html|application\/xhtml\+xml/i.test(r.contentType) ||
  (r.contentType === "" && typeof r.body === "string" && /<html[\s>]/i.test(r.body));

/** Parse <loc> entries from a sitemap/sitemapindex body. */
function parseLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]!);
}

/** Same-origin internal <a href> pathnames from an HTML page. */
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
      /* ignore malformed href */
    }
  }
  return out;
}

export async function fetchSite(
  input: string,
  opts?: { maxPages?: number },
): Promise<{
  files: Record<string, string | null>;
  meta: { origin: string; startUrl: string; fetched: string[]; errors: string[] };
}> {
  const maxPages = opts?.maxPages ?? 25;
  const withScheme = /^[a-z][\w+.-]*:\/\//i.test(input) ? input : `https://${input}`;
  const startUrl = new URL(withScheme);
  const origin = startUrl.origin;

  const files: Record<string, string | null> = {};
  const fetched: string[] = [];
  const errors: string[] = [];

  // 1. start page
  const start = await fetchText(startUrl.href, errors);
  if (start.status !== 0) {
    files["_headers"] = synthesizeHeaders(start.headers);
  }
  if (isHtml(start) && typeof start.body === "string") {
    const startPath = new URL(start.finalUrl).pathname;
    files[pathToKey(startPath)] = start.body;
    fetched.push(startPath);
  }

  // 2. origin-level presence files (non-200 → omit so presence checks fire)
  const originFile = async (name: string, key: string): Promise<FetchResult> => {
    const r = await fetchText(`${origin}/${name}`, errors);
    if (r.status === 200 && typeof r.body === "string") files[key] = r.body;
    return r;
  };
  const robots = await originFile("robots.txt", "robots.txt");
  await originFile("llms.txt", "llms.txt");
  const sitemapBodies: string[] = [];
  const rootSitemap = await originFile("sitemap.xml", "sitemap.xml");
  if (rootSitemap.status === 200 && typeof rootSitemap.body === "string") {
    sitemapBodies.push(rootSitemap.body);
  }
  // robots-declared Sitemap: directives (same-origin only)
  if (robots.status === 200 && typeof robots.body === "string") {
    for (const m of robots.body.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim)) {
      try {
        const u = new URL(m[1]!);
        if (u.origin !== origin) continue;
        const r = await fetchText(u.href, errors);
        if (r.status === 200 && typeof r.body === "string") sitemapBodies.push(r.body);
      } catch {
        /* ignore malformed sitemap URL */
      }
    }
  }

  // 3. resolve sitemapindexes (up to 3 child sitemaps, same-origin)
  const locUrls: string[] = [];
  for (const body of sitemapBodies) {
    if (/<sitemapindex[\s>]/i.test(body)) {
      const children = parseLocs(body).slice(0, 3);
      for (const child of children) {
        try {
          const u = new URL(child);
          if (u.origin !== origin) continue;
          const r = await fetchText(u.href, errors);
          if (r.status === 200 && typeof r.body === "string") locUrls.push(...parseLocs(r.body));
        } catch {
          /* ignore */
        }
      }
    } else {
      locUrls.push(...parseLocs(body));
    }
  }

  // 4. build crawl set: sitemap locs + start-page internal links, same-origin,
  //    deduped by pathname, start page already counted.
  const seen = new Set<string>();
  if (typeof start.body === "string") seen.add(new URL(start.finalUrl).pathname);
  const queue: string[] = [];
  const enqueue = (href: string) => {
    try {
      const u = new URL(href);
      if (u.origin !== origin) return;
      if (seen.has(u.pathname)) return;
      seen.add(u.pathname);
      queue.push(u.href);
    } catch {
      /* ignore */
    }
  };
  for (const loc of locUrls) enqueue(loc);
  if (isHtml(start) && typeof start.body === "string") {
    for (const link of parseLinks(start.body, origin, start.finalUrl)) enqueue(link);
  }

  const discovered = seen.size; // start + queued
  const remaining = Math.max(0, maxPages - fetched.length);
  if (queue.length > remaining) {
    errors.push(`crawl capped at ${maxPages} pages (${discovered} discovered)`);
  }
  const toFetch = queue.slice(0, remaining);

  // 5. fetch the crawl set with small concurrency (≤4 in flight)
  const CONCURRENCY = 4;
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < toFetch.length) {
      const url = toFetch[cursor++]!;
      const r = await fetchText(url, errors);
      if (r.status === 0) continue;
      if (!isHtml(r) || typeof r.body !== "string") continue;
      const path = new URL(r.finalUrl).pathname;
      files[pathToKey(path)] = r.body;
      fetched.push(path);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, toFetch.length) }, worker));

  // 6. 404 probe: a path that cannot exist
  const probe = await fetchText(`${origin}/__site_spec_probe_404__`, errors);
  if (probe.status === 404 && isHtml(probe) && typeof probe.body === "string") {
    files["404.html"] = probe.body;
  } else if (probe.status === 200 && isHtml(probe)) {
    errors.push("soft 404: unknown paths return 200");
  }

  return { files, meta: { origin, startUrl: startUrl.href, fetched, errors } };
}
