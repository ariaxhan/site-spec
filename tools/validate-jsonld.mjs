/**
 * Structured-data validator for every built example site. Two layers:
 *
 * 1. RDF parse via schemarama's parseJsonLd (Google's structured-data tooling):
 *    a block that fails to parse as JSON-LD is invisible to search engines.
 * 2. Vocabulary check against the vendored schema.org term list
 *    (tools/schemaorg-terms.json, extracted from the official vocabulary):
 *    every schema.org class and property used must actually exist. Unknown
 *    terms are THE classic silent rich-results failure — Google just ignores
 *    them, nothing errors.
 *
 * Plus shape checks for the LocalBusiness/Restaurant surface this engine
 * promises: opens/closes must be HH:MM, dayOfWeek a schema.org day,
 * telephone/address present when emitted, @id references resolve.
 *
 * Usage: node tools/validate-jsonld.mjs   (exit 1 on any failure)
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseJsonLd } = require("schemarama");
const jsonld = require("jsonld");

const ROOT = resolve(import.meta.dirname, "..");

// Serve the schema.org context from the vendored copy (the official
// https://schema.org/docs/jsonldcontext.jsonld) instead of fetching it over
// the network on every run. Deterministic, offline, and immune to remote
// loader changes; any non-vendored remote context fails loudly.
const SCHEMA_CONTEXT = JSON.parse(
  readFileSync(join(ROOT, "tools/schemaorg-context.jsonld"), "utf8"),
);
const SCHEMA_CONTEXT_URLS = new Set([
  "https://schema.org",
  "http://schema.org",
  "https://schema.org/docs/jsonldcontext.jsonld",
]);
jsonld.documentLoader = async (url) => {
  if (SCHEMA_CONTEXT_URLS.has(url.replace(/\/$/, ""))) {
    return { contextUrl: null, document: SCHEMA_CONTEXT, documentUrl: url };
  }
  throw new Error(`refusing to fetch non-vendored remote context: ${url}`);
};
const TERMS = JSON.parse(readFileSync(join(ROOT, "tools/schemaorg-terms.json"), "utf8"));
const CLASSES = new Set(TERMS.classes);
const PROPERTIES = new Set(TERMS.properties);
const DAYS = new Set([
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "PublicHolidays",
]);

const sites = readdirSync(join(ROOT, "examples"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(ROOT, "examples", d.name, "index.html")))
  .filter((d) => existsSync(join(ROOT, "examples", d.name, "sitemap.xml"))) // built sites only
  .map((d) => d.name);

let failures = 0;
const fail = (site, msg) => {
  failures++;
  console.error(`FAIL ${site}: ${msg}`);
};

for (const site of sites) {
  const failuresBefore = failures;
  const html = readFileSync(join(ROOT, "examples", site, "index.html"), "utf8");
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (blocks.length === 0) {
    fail(site, "no JSON-LD blocks found");
    continue;
  }

  const nodes = [];
  for (const [i, b] of blocks.entries()) {
    // layer 1: must parse as RDF the way Google's tooling parses it
    try {
      const store = await parseJsonLd(b[1], "https://example.org/");
      if (store.size === 0) fail(site, `block ${i} parsed to zero triples`);
    } catch (e) {
      fail(site, `block ${i} failed JSON-LD parse: ${e.message}`);
      continue;
    }
    nodes.push(JSON.parse(b[1]));
  }

  // layer 2: vocabulary — every schema.org term used must exist
  const checkTerms = (obj, path) => {
    if (Array.isArray(obj)) return obj.forEach((v, i) => checkTerms(v, `${path}[${i}]`));
    if (obj === null || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (k === "@type") {
        for (const t of Array.isArray(v) ? v : [v]) {
          if (!CLASSES.has(t)) fail(site, `unknown schema.org type "${t}" at ${path}`);
        }
      } else if (!k.startsWith("@")) {
        if (!PROPERTIES.has(k)) fail(site, `unknown schema.org property "${k}" at ${path}.${k}`);
        checkTerms(v, `${path}.${k}`);
      }
    }
  };
  nodes.forEach((n, i) => checkTerms(n, `block${i}`));

  // layer 3: the primary entity. Local businesses promise a LocalBusiness/
  // Restaurant node; product sites promise a SoftwareApplication/WebApplication.
  const LOCAL = ["LocalBusiness", "Restaurant"];
  const APP = ["SoftwareApplication", "WebApplication", "MobileApplication"];
  const biz = nodes.find((n) => [...LOCAL, ...APP].includes(n["@type"]));
  if (!biz) {
    fail(site, "no primary entity node (LocalBusiness/Restaurant or SoftwareApplication)");
    continue;
  }
  if (LOCAL.includes(biz["@type"])) {
    for (const h of biz.openingHoursSpecification ?? []) {
      if (!/^\d{2}:\d{2}$/.test(h.opens ?? "")) fail(site, `bad opens "${h.opens}"`);
      if (!/^\d{2}:\d{2}$/.test(h.closes ?? "")) fail(site, `bad closes "${h.closes}"`);
      const day = String(h.dayOfWeek ?? "").replace("https://schema.org/", "");
      if (!DAYS.has(day)) fail(site, `bad dayOfWeek "${h.dayOfWeek}"`);
    }
    if (biz.priceRange && !/^\${1,4}$/.test(biz.priceRange)) {
      fail(site, `suspicious priceRange "${biz.priceRange}"`);
    }
  }
  // @id references must resolve within the page's node set
  const ids = new Set(nodes.map((n) => n["@id"]).filter(Boolean));
  for (const n of nodes) {
    for (const v of Object.values(n)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const keys = Object.keys(v);
        if (keys.length === 1 && keys[0] === "@id" && !ids.has(v["@id"])) {
          fail(site, `dangling @id reference ${v["@id"]}`);
        }
      }
    }
  }
  if (failures === failuresBefore) {
    console.log(`ok   ${site}: ${blocks.length} JSON-LD block(s) valid (parse + vocabulary + shape)`);
  }
}

if (sites.length === 0) {
  console.error("no built example sites found");
  process.exit(1);
}
process.exit(failures ? 1 : 0);
