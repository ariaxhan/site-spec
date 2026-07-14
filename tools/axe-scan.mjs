/**
 * Accessibility validation for every built example site, via axe-core
 * (Deque's engine — the same checks behind Lighthouse a11y audits).
 * Scans at 375px and 1440px; any serious/critical violation fails the run,
 * moderate/minor are reported as warnings.
 *
 * Usage: node tools/axe-scan.mjs   (exit 1 on serious/critical violations)
 */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, extname, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
};

const server = createServer((req, res) => {
  let p = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(p)] ?? "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((ok) => server.listen(0, ok));
const port = server.address().port;

const sites = readdirSync(join(ROOT, "examples"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(ROOT, "examples", d.name, "sitemap.xml")))
  .map((d) => d.name);

const browser = await chromium.launch();
let gate = 0;

for (const site of sites) {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto(`http://localhost:${port}/examples/${site}/`, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const minor = results.violations.filter((v) => v.impact !== "serious" && v.impact !== "critical");
    gate += serious.length;
    const label = `${site}@${width}`;
    if (results.violations.length === 0) {
      console.log(`ok   ${label}: zero axe violations`);
    } else {
      for (const v of serious) {
        console.error(`FAIL ${label}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s))`);
        for (const n of v.nodes.slice(0, 3)) console.error(`       ${n.target.join(" ")}`);
      }
      for (const v of minor) {
        console.warn(`warn ${label}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s))`);
      }
    }
    await context.close();
  }
}

await browser.close();
server.close();
process.exit(gate ? 1 : 0);
