import { describe, it, expect } from "vitest";
import { auditFiles } from "../src/audit/audit";
import { fixFiles } from "../src/fix/fix";
import { renderAuditMarkdown } from "../src/audit/report-md";

/**
 * fix mode is pure: file map + report in, corrected map + action log out. These
 * tests drive it against a hand-built "external-style" page plus a robots.txt,
 * exactly the shapes a live crawl produces, entirely offline.
 */

const PAGE = `<!doctype html>
<html>
<head>
  <title>Rosalia's Kitchen</title>
  <meta name="description" content="Family-run Italian restaurant in Queens serving wood-fired pizza.">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Restaurant","name":"Rosalia's Kitchen","aggregateRating":{"@type":"AggregateRating","ratingValue":"5"},"review":[{"@type":"Review"}]}</script>
</head>
<body><h1>Rosalia's Kitchen</h1><p>Wood-fired pizza in Queens.</p></body>
</html>`;

const ROBOTS = `User-agent: *
Allow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-User
Disallow: /
`;

function buildFiles(): Record<string, string | null> {
  return { "index.html": PAGE, "robots.txt": ROBOTS };
}

describe("fixFiles: external-style page + robots.txt", () => {
  const files = buildFiles();
  const report = auditFiles({ files, mode: "generic", linkChecks: false });
  const pageUrls = { "index.html": "https://rosalias.example/" };
  const result = fixFiles({ files, report, pageUrls });
  const page = result.files["index.html"] as string;
  const robots = result.files["robots.txt"] as string;
  const byStatus = (s: string) => result.actions.filter((a) => a.status === s).map((a) => a.checkId);

  it("resets the zoom-locking viewport", () => {
    expect(page).toContain('content="width=device-width, initial-scale=1"');
    expect(page).not.toMatch(/user-scalable\s*=\s*no/i);
  });

  it("inserts a canonical from the known page URL", () => {
    expect(page).toContain('<link rel="canonical" href="https://rosalias.example/">');
  });

  it("scaffolds Open Graph tags from the existing title + description", () => {
    expect(page).toContain(`property="og:title" content="Rosalia's Kitchen"`);
    expect(page).toContain("property=\"og:description\"");
    expect(page).toContain('property="og:type" content="website"');
    expect(page).toContain('property="og:url" content="https://rosalias.example/"');
  });

  it("downgrades the imageless large-image twitter card", () => {
    expect(page).toContain('name="twitter:card" content="summary"');
    expect(page).not.toContain("summary_large_image");
  });

  it("strips self-serving aggregateRating/review from JSON-LD, keeping it valid JSON", () => {
    const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(page);
    const node = JSON.parse(m![1]!) as Record<string, unknown>;
    expect(node["aggregateRating"]).toBeUndefined();
    expect(node["review"]).toBeUndefined();
    expect(node["name"]).toBe("Rosalia's Kitchen");
  });

  it("removes the stale crawler block and unblocks the AI search agent in robots.txt", () => {
    expect(robots).not.toMatch(/anthropic-ai/);
    // the still-permissive first block and Claude-User remain, now Allowed
    expect(robots).toMatch(/User-agent:\s*Claude-User\s*\nAllow:\s*\//);
  });

  it("categorizes every action and is deterministic", () => {
    expect(byStatus("fixed")).toEqual(
      expect.arrayContaining([
        "audit/viewport-lock",
        "audit/canonical-missing",
        "audit/twitter-card-no-image",
        "audit/jsonld-self-serving-rating",
        "audit/robots-stale-token",
        "audit/robots-blocks-ai-search",
      ]),
    );
    // og derived from real title/desc → "fixed", not scaffolded
    expect(byStatus("fixed")).toContain("audit/og-missing");
    // second run on same input is byte-identical
    const again = fixFiles({ files: buildFiles(), report, pageUrls });
    expect(again.actions).toEqual(result.actions);
    expect(again.files).toEqual(result.files);
  });

  it("does not touch the file for manual-only findings", () => {
    const noJsonLd = { "index.html": "<html><head><title>t</title></head><body><h1>x</h1><img src='a.png'></body></html>" };
    const rep = auditFiles({ files: noJsonLd, mode: "generic", linkChecks: false });
    const res = fixFiles({ files: noJsonLd, report: rep });
    const imgAction = res.actions.find((a) => a.checkId === "audit/img-alt-missing");
    expect(imgAction?.status).toBe("manual");
  });
});

describe("fixFiles: dir mode downgrades URL-dependent fixers to manual", () => {
  it("canonical becomes manual when the page URL is unknown offline", () => {
    const files = buildFiles();
    const report = auditFiles({ files, mode: "generic", linkChecks: false });
    const result = fixFiles({ files, report }); // no pageUrls
    const canonical = result.actions.find((a) => a.checkId === "audit/canonical-missing");
    expect(canonical?.status).toBe("manual");
    expect(result.files["index.html"]).not.toContain("rel=\"canonical\"");
  });
});

describe("fixFiles: whole-file generation", () => {
  it("creates robots.txt + sitemap.xml when missing", () => {
    const files: Record<string, string | null> = {
      "index.html": "<html><head><title>t</title><meta name=\"description\" content=\"d that is long enough\"><link rel=\"canonical\" href=\"/\"><meta property=\"og:title\" content=\"t\"><script type=\"application/ld+json\">{}</script></head><body><h1>x</h1></body></html>",
      "sitemap.xml": "<urlset></urlset>",
    };
    const report = auditFiles({ files });
    const result = fixFiles({ files, report });
    const robots = result.actions.find((a) => a.checkId === "audit/robots-missing");
    expect(robots?.status).toBe("fixed");
    expect(result.files["robots.txt"]).toContain("User-agent: *");
    expect(result.files["robots.txt"]).toContain("Sitemap:");
  });
});

describe("renderAuditMarkdown", () => {
  it("renders a deterministic markdown report grouped by severity", () => {
    const files = buildFiles();
    const report = auditFiles({ files, mode: "generic", linkChecks: false });
    const md = renderAuditMarkdown(report, { target: "rosalias.example", title: "T" });
    expect(md.startsWith("# T\n")).toBe(true);
    expect(md).toContain("- target: rosalias.example");
    expect(md).toContain("- mode: generic");
    expect(md).toContain(`- errors: ${report.errors}`);
    expect(md).toMatch(/## (Errors|Warnings) \(\d+\)/);
    // deterministic
    expect(renderAuditMarkdown(report, { target: "rosalias.example", title: "T" })).toBe(md);
  });

  it("says 'No findings.' on a clean report", () => {
    const clean = { ok: true, mode: "generic" as const, errors: 0, warnings: 0, findings: [], pages: ["index.html"] };
    expect(renderAuditMarkdown(clean)).toContain("No findings.");
  });
});
