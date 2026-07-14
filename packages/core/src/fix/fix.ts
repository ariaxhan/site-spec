import type { AuditReport } from "../audit/audit";

/**
 * Fix mode, the repair half of the auditor. Pure: consumes an AuditReport plus
 * the same file map the audit ran against, and returns a corrected file map
 * with a per-action log. It NEVER touches the filesystem or network, the CLI
 * caller is responsible for reading the map in and writing the result out.
 *
 * Three action classes:
 *   fixed      mechanical, safe, no business facts needed (applied automatically)
 *   scaffolded a TODO stub the human completes with real facts
 *   manual     no safe automatic fix, the human is told exactly what to do
 *
 * Determinism: findings are processed in report order (already deterministic),
 * so the same input yields identical `files` and `actions`.
 */

export type FixStatus = "fixed" | "scaffolded" | "manual";

export interface FixAction {
  /** the audit check this addresses */
  checkId: string;
  /** file the action touches (may be a new file like "robots.txt") */
  file: string;
  /** fixed = applied automatically; scaffolded = wrote a TODO stub needing real
   *  facts; manual = cannot safely auto-fix, human must act */
  status: FixStatus;
  /** one-line, human-readable: what was done or what the human must do */
  detail: string;
}

export interface FixResult {
  /** the corrected file map (originals + patched + newly-created) */
  files: Record<string, string | null>;
  actions: FixAction[];
}

export interface FixInput {
  files: Record<string, string | null>;
  report: AuditReport;
  /** file-map key (e.g. "about/index.html") → absolute URL, supplied in
   *  live-crawl mode so URL-dependent fixers (canonical, og:url) can act;
   *  absent in dir mode. */
  pageUrls?: Record<string, string>;
}

// ---- small pure helpers ----------------------------------------------------

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeAttr = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Insert a block of markup just before </head> (or after <head>, or at top). */
function insertIntoHead(html: string, block: string): string {
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${block}\n</head>`);
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/(<head\b[^>]*>)/i, `$1\n${block}`);
  return `${block}\n${html}`;
}

const getTitle = (html: string): string =>
  /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? "";

const getDescription = (html: string): string =>
  /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html)?.[1]?.trim() ?? "";

const isTodo = (s: string): boolean => s === "" || /^TODO:/i.test(s);

/** ".../index.html" → dir loc; "foo.html" → "/foo.html"; "index.html" → "/". */
function keyToLoc(key: string, pageUrls: Record<string, string>): string {
  const url = pageUrls[key];
  if (url) return url;
  let p = `/${key}`.replace(/\/index\.html$/i, "/");
  if (p === "") p = "/";
  return p;
}

/** Content pages worth listing (html, excluding 404), sorted. */
function contentPages(files: Record<string, string | null>): string[] {
  return Object.keys(files)
    .filter((k) => k.endsWith(".html") && k !== "404.html" && !k.endsWith("/404.html"))
    .sort();
}

// ---- robots.txt fixers -----------------------------------------------------

/** Remove the `User-agent: <token>` line and its directive block. */
function removeRobotsBlock(content: string, token: string): string {
  const lines = content.split("\n");
  const out: string[] = [];
  const uaLine = new RegExp(`^\\s*user-agent:\\s*${escapeRegex(token)}\\s*$`, "i");
  let i = 0;
  while (i < lines.length) {
    if (uaLine.test(lines[i]!)) {
      i++;
      while (i < lines.length && lines[i]!.trim() !== "" && !/^\s*user-agent:/i.test(lines[i]!)) i++;
      if (i < lines.length && lines[i]!.trim() === "") i++; // drop one trailing separator
      continue;
    }
    out.push(lines[i]!);
    i++;
  }
  return out.join("\n");
}

/** In the named agent's block, flip `Disallow: /` to `Allow: /`. */
function allowRobotsBot(content: string, bot: string): string {
  const lines = content.split("\n");
  const uaLine = new RegExp(`^\\s*user-agent:\\s*${escapeRegex(bot)}\\s*$`, "i");
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*user-agent:/i.test(lines[i]!)) {
      inBlock = uaLine.test(lines[i]!);
      continue;
    }
    if (inBlock && /^\s*disallow:\s*\/\s*$/i.test(lines[i]!)) {
      lines[i] = lines[i]!.replace(/disallow/i, "Allow");
    }
  }
  return lines.join("\n");
}

// ---- _headers fixers -------------------------------------------------------

/** Drop `interest-cohort=()` from every Permissions-Policy line. */
function dropInterestCohort(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      if (!/permissions-policy:/i.test(line)) return line;
      const m = /^(\s*permissions-policy:\s*)(.*)$/i.exec(line);
      if (!m) return line;
      const tokens = m[2]!
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t && !/^interest-cohort=\(\)$/i.test(t));
      return tokens.length ? `${m[1]}${tokens.join(", ")}` : null;
    })
    .filter((line): line is string => line !== null)
    .join("\n");
}

/** Force X-XSS-Protection to 0 (the safe, modern value). */
function disableXssAuditor(content: string): string {
  return content.replace(/^(\s*x-xss-protection:\s*).*$/gim, "$10");
}

/** Strip the `preload` token from Strict-Transport-Security. */
function stripHstsPreload(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      if (!/strict-transport-security:/i.test(line)) return line;
      return line.replace(/\s*;?\s*preload\b/gi, "").replace(/;\s*$/, "");
    })
    .join("\n");
}

/** Remove the `X-Robots-Tag: noindex` line from _headers. */
function removeXRobotsNoindex(content: string): string {
  return content
    .split("\n")
    .filter((line) => !/^\s*x-robots-tag:\s*noindex\s*$/i.test(line))
    .join("\n");
}

/** Append HTML + static-asset Cache-Control rules. */
function appendCacheRules(content: string): string {
  const block =
    "\n/*.html\n  Cache-Control: max-age=0, must-revalidate\n" +
    "\n/assets/*\n  Cache-Control: max-age=31536000, immutable\n";
  return content.replace(/\n+$/, "") + "\n" + block;
}

// ---- page fixers -----------------------------------------------------------

/** Remove `noindex` from every `<meta name="robots">`; delete tag if emptied. */
function removeMetaNoindex(html: string): string {
  return html.replace(/<meta\b[^>]*\bname="robots"[^>]*>/gi, (tag) => {
    const cm = /content="([^"]*)"/i.exec(tag);
    if (!cm) return tag;
    const tokens = cm[1]!
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !/^noindex$/i.test(t));
    if (tokens.length === 0) return "";
    return tag.replace(/content="[^"]*"/i, `content="${tokens.join(", ")}"`);
  });
}

/** Reset a zoom-locking viewport to the accessible default. */
function fixViewport(html: string): string {
  return html.replace(
    /(<meta\s+name="viewport"\s+content=")[^"]*(")/i,
    "$1width=device-width, initial-scale=1$2",
  );
}

/** Downgrade a large-image Twitter card with no image to a plain summary. */
function downgradeTwitterCard(html: string): string {
  return html.replace(/content="summary_large_image"/gi, 'content="summary"');
}

/** Strip aggregateRating/review from JSON-LD nodes; keep the block valid. */
function scrubSelfServingRating(html: string): string {
  return html.replace(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    (full, inner: string) => {
      let data: unknown;
      try {
        data = JSON.parse(inner);
      } catch {
        return full;
      }
      let changed = false;
      const scrub = (node: unknown): void => {
        if (node && typeof node === "object" && !Array.isArray(node)) {
          const rec = node as Record<string, unknown>;
          if ("aggregateRating" in rec) {
            delete rec["aggregateRating"];
            changed = true;
          }
          if ("review" in rec) {
            delete rec["review"];
            changed = true;
          }
        }
      };
      const graph =
        data && typeof data === "object" ? (data as Record<string, unknown>)["@graph"] : undefined;
      if (Array.isArray(graph)) graph.forEach(scrub);
      else scrub(data);
      if (!changed) return full;
      return `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`;
    },
  );
}

// ---- whole-file generators -------------------------------------------------

function makeRobots(files: Record<string, string | null>, pageUrls: Record<string, string>): string {
  let out = "User-agent: *\nAllow: /\n";
  if ("sitemap.xml" in files) {
    const origin = originOf(pageUrls);
    out += `\nSitemap: ${origin ? `${origin}/sitemap.xml` : "/sitemap.xml"}\n`;
  }
  return out;
}

function makeSitemap(
  files: Record<string, string | null>,
  pageUrls: Record<string, string>,
): string {
  const urls = contentPages(files)
    .map((k) => `  <url><loc>${escapeAttr(keyToLoc(k, pageUrls))}</loc></url>`)
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n</urlset>\n`
  );
}

function makeLlms(
  files: Record<string, string | null>,
  pageUrls: Record<string, string>,
): string {
  let out =
    `# TODO: Site name\n\n` +
    `> TODO: one-sentence description of what this site is and who it serves.\n\n` +
    `## Pages\n\n`;
  for (const key of contentPages(files)) {
    const html = files[key];
    const title = typeof html === "string" ? getTitle(html) : "";
    const desc = typeof html === "string" ? getDescription(html) : "";
    const loc = keyToLoc(key, pageUrls);
    const label = title || "TODO: page title";
    out += `- [${label}](${loc})${desc ? `: ${desc}` : ": TODO: page summary"}\n`;
  }
  out +=
    `\n## TODO\n\n` +
    `- TODO: add real business facts (hours, location, contact, offerings).\n`;
  return out;
}

/** Any origin present in the pageUrls map, or "" if none known. */
function originOf(pageUrls: Record<string, string>): string {
  for (const url of Object.values(pageUrls)) {
    try {
      return new URL(url).origin;
    } catch {
      /* keep looking */
    }
  }
  return "";
}

const jsonLdSkeleton =
  `<script type="application/ld+json">\n` +
  `{\n` +
  `  "@context": "https://schema.org",\n` +
  `  "@type": "WebSite",\n` +
  `  "name": "TODO: site name",\n` +
  `  "url": "TODO: https://example.com",\n` +
  `  "publisher": {\n` +
  `    "@type": "Organization",\n` +
  `    "name": "TODO: organization name"\n` +
  `  }\n` +
  `}\n` +
  `</script>`;

// ---- driver ----------------------------------------------------------------

export function fixFiles(input: FixInput): FixResult {
  const files: Record<string, string | null> = { ...input.files };
  const pageUrls = input.pageUrls ?? {};
  const actions: FixAction[] = [];

  const record = (checkId: string, file: string, status: FixStatus, detail: string): void => {
    actions.push({ checkId, file, status, detail });
  };

  for (const f of input.report.findings) {
    const page = f.file;

    switch (f.checkId) {
      // ---- auto-fix (fixed) ------------------------------------------------
      case "audit/robots-stale-token": {
        const token = /"([^"]+)"/.exec(f.message)?.[1] ?? "";
        const cur = files["robots.txt"];
        if (token && typeof cur === "string") {
          files["robots.txt"] = removeRobotsBlock(cur, token);
          record(f.checkId, "robots.txt", "fixed", `Removed deprecated crawler block "${token}".`);
        } else {
          record(f.checkId, "robots.txt", "manual", f.fix ?? f.message);
        }
        break;
      }
      case "audit/robots-blocks-ai-search": {
        const bot = /blocks (\S+?),/.exec(f.message)?.[1] ?? "";
        const cur = files["robots.txt"];
        if (bot && typeof cur === "string") {
          files["robots.txt"] = allowRobotsBot(cur, bot);
          record(f.checkId, "robots.txt", "fixed", `Allowed AI search/user agent ${bot} (was Disallow: /).`);
        } else {
          record(f.checkId, "robots.txt", "manual", f.fix ?? f.message);
        }
        break;
      }
      case "audit/robots-missing": {
        files["robots.txt"] = makeRobots(files, pageUrls);
        record(f.checkId, "robots.txt", "fixed", "Created a permissive robots.txt (User-agent: * / Allow: /).");
        break;
      }
      case "audit/headers-stale": {
        const cur = files["_headers"];
        if (typeof cur !== "string") {
          record(f.checkId, "_headers", "manual", f.fix ?? f.message);
          break;
        }
        if (/interest-cohort/i.test(f.message)) {
          files["_headers"] = dropInterestCohort(cur);
          record(f.checkId, "_headers", "fixed", "Dropped dead interest-cohort=() from Permissions-Policy.");
        } else {
          files["_headers"] = disableXssAuditor(cur);
          record(f.checkId, "_headers", "fixed", "Set X-XSS-Protection: 0 (disabled the removed legacy auditor).");
        }
        break;
      }
      case "audit/hsts-preload": {
        const cur = files["_headers"];
        if (typeof cur === "string") {
          files["_headers"] = stripHstsPreload(cur);
          record(f.checkId, "_headers", "fixed", "Stripped the preload token from Strict-Transport-Security.");
        } else {
          record(f.checkId, "_headers", "manual", f.fix ?? f.message);
        }
        break;
      }
      case "audit/cache-policy-missing": {
        const cur = files["_headers"];
        if (typeof cur === "string") {
          files["_headers"] = appendCacheRules(cur);
          record(f.checkId, "_headers", "fixed", "Appended Cache-Control rules (HTML no-store, assets immutable).");
        } else {
          record(f.checkId, "_headers", "manual", f.fix ?? f.message);
        }
        break;
      }
      case "audit/noindex": {
        if (page === "_headers") {
          const cur = files["_headers"];
          if (typeof cur === "string") {
            files["_headers"] = removeXRobotsNoindex(cur);
            record(f.checkId, "_headers", "fixed", "Removed X-Robots-Tag: noindex (whole site was hidden from search).");
          } else {
            record(f.checkId, "_headers", "manual", f.fix ?? f.message);
          }
        } else if (page && typeof files[page] === "string") {
          files[page] = removeMetaNoindex(files[page] as string);
          record(f.checkId, page, "fixed", "Removed accidental noindex from <meta name=\"robots\"> (page was hidden from search).");
        } else {
          record(f.checkId, page ?? "(site-wide)", "manual", f.fix ?? f.message);
        }
        break;
      }
      case "audit/canonical-missing": {
        if (!page || typeof files[page] !== "string") {
          record(f.checkId, page ?? "(site-wide)", "manual", f.fix ?? f.message);
          break;
        }
        const url = pageUrls[page];
        if (url) {
          files[page] = insertIntoHead(
            files[page] as string,
            `  <link rel="canonical" href="${escapeAttr(url)}">`,
          );
          record(f.checkId, page, "fixed", `Inserted <link rel="canonical" href="${url}">.`);
        } else {
          record(
            f.checkId,
            page,
            "manual",
            "Canonical URL is unknown offline (dir mode); add <link rel=\"canonical\"> with the page's public URL.",
          );
        }
        break;
      }
      case "audit/og-missing": {
        if (!page || typeof files[page] !== "string") {
          record(f.checkId, page ?? "(site-wide)", "manual", f.fix ?? f.message);
          break;
        }
        const html = files[page] as string;
        const title = getTitle(html);
        const desc = getDescription(html);
        const url = pageUrls[page];
        const derivable = !isTodo(title) && !isTodo(desc);
        const ogTitle = derivable ? title : "TODO: page title";
        const ogDesc = derivable ? desc : "TODO: 150–160 char summary";
        const lines = [
          `  <meta property="og:title" content="${escapeAttr(ogTitle)}">`,
          `  <meta property="og:description" content="${escapeAttr(ogDesc)}">`,
          `  <meta property="og:type" content="website">`,
          ...(url ? [`  <meta property="og:url" content="${escapeAttr(url)}">`] : []),
        ];
        files[page] = insertIntoHead(html, lines.join("\n"));
        if (derivable) {
          record(f.checkId, page, "fixed", "Added Open Graph card from the page's title + description.");
        } else {
          record(f.checkId, page, "scaffolded", "Added Open Graph tags with TODO values (no title/description to derive from).");
        }
        break;
      }
      case "audit/viewport-lock": {
        if (page && typeof files[page] === "string") {
          files[page] = fixViewport(files[page] as string);
          record(f.checkId, page, "fixed", "Reset viewport to width=device-width, initial-scale=1 (unblocked zoom).");
        } else {
          record(f.checkId, page ?? "(site-wide)", "manual", f.fix ?? f.message);
        }
        break;
      }
      case "audit/twitter-card-no-image": {
        if (page && typeof files[page] === "string") {
          files[page] = downgradeTwitterCard(files[page] as string);
          record(f.checkId, page, "fixed", "Downgraded twitter:card summary_large_image → summary.");
        } else {
          record(f.checkId, page ?? "(site-wide)", "manual", f.fix ?? f.message);
        }
        break;
      }
      case "audit/jsonld-self-serving-rating": {
        if (page && typeof files[page] === "string") {
          files[page] = scrubSelfServingRating(files[page] as string);
          record(f.checkId, page, "fixed", "Removed self-serving aggregateRating/review from JSON-LD.");
        } else {
          record(f.checkId, page ?? "(site-wide)", "manual", f.fix ?? f.message);
        }
        break;
      }
      case "audit/sitemap-missing": {
        files["sitemap.xml"] = makeSitemap(files, pageUrls);
        record(f.checkId, "sitemap.xml", "fixed", "Generated sitemap.xml from the pages present.");
        break;
      }

      // ---- scaffold --------------------------------------------------------
      case "audit/llms-missing": {
        files["llms.txt"] = makeLlms(files, pageUrls);
        record(f.checkId, "llms.txt", "scaffolded", "Scaffolded llms.txt from page titles/descriptions; fill the TODO facts.");
        break;
      }
      case "audit/jsonld-missing": {
        if (page && typeof files[page] === "string") {
          files[page] = insertIntoHead(files[page] as string, `  ${jsonLdSkeleton}`);
          record(f.checkId, page, "scaffolded", "Inserted a WebSite/Organization JSON-LD skeleton; replace the TODO values.");
        } else {
          record(f.checkId, page ?? "(site-wide)", "manual", f.fix ?? f.message);
        }
        break;
      }
      case "audit/description-missing": {
        if (page && typeof files[page] === "string") {
          files[page] = insertIntoHead(
            files[page] as string,
            `  <meta name="description" content="TODO: 150–160 char summary">`,
          );
          record(f.checkId, page, "scaffolded", "Inserted a TODO meta description; write a real 150–160 char summary.");
        } else {
          record(f.checkId, page ?? "(site-wide)", "manual", f.fix ?? f.message);
        }
        break;
      }
      case "audit/title-missing": {
        if (page && typeof files[page] === "string") {
          files[page] = insertIntoHead(files[page] as string, `  <title>TODO: page title</title>`);
          record(f.checkId, page, "scaffolded", "Inserted a TODO <title>; write a unique, descriptive title.");
        } else {
          record(f.checkId, page ?? "(site-wide)", "manual", f.fix ?? f.message);
        }
        break;
      }

      // ---- manual (no safe auto-fix) --------------------------------------
      default:
        record(f.checkId, page ?? "(site-wide)", "manual", f.fix ?? f.message);
        break;
    }
  }

  return { files, actions };
}
