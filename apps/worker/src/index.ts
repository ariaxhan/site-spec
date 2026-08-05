/**
 * site-spec hosted auditor.
 *
 * Turns the repo into a link: paste a URL, get the same deterministic audit the
 * CLI runs, without cloning anything. The audit engine itself (`auditFiles`) is
 * imported unchanged from @site-spec/core; this app only supplies the network
 * layer, the guards, and the rendering.
 *
 * Routes
 *   GET /            the form
 *   GET /audit?url=  run an audit (add &format=json for machine output)
 *   GET /health      liveness
 */

// Import the audit engine directly rather than through the package barrel: the
// barrel also re-exports the site compiler, which pulls in node:crypto and
// ~200KB of pack/theme code this Worker never runs.
import { auditFiles } from "@site-spec/core/audit";
import { admitUrl } from "./guard";
import { crawlSite, GuardError, LIMITS } from "./crawl";
import { renderError, renderHome, renderReport } from "./page";

/**
 * Rate limiting.
 *
 * This started as a per-IP sliding window in isolate memory, which measured as
 * theater: 12 rapid requests from one client all returned 200, because each
 * landed on a different isolate and every counter was fresh. The runtime's own
 * rate limiter is shared across isolates, so it actually holds.
 *
 * It is still not a defense against a distributed flood. The free plan's
 * 100k requests/day ceiling and the per-audit subrequest budget are the
 * backstops for that.
 */
const MAX_PER_WINDOW = 8;

interface RateLimiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  AUDIT_LIMITER?: RateLimiter;
}

/** Why the limiter did or did not block. Surfaced on /health so that a
 *  silently disabled limiter cannot masquerade as a working one. */
export type RateStatus = "ok" | "blocked" | "unbound" | "error";

async function rateCheck(env: Env, ip: string): Promise<RateStatus> {
  if (!env.AUDIT_LIMITER) return "unbound";
  try {
    const { success } = await env.AUDIT_LIMITER.limit({ key: ip });
    return success ? "ok" : "blocked";
  } catch {
    // A limiter failure must not take the whole endpoint down.
    return "error";
  }
}

const SECURITY_HEADERS: Record<string, string> = {
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  // The page ships one inline <style> and no scripts at all.
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

const html = (body: string, status = 200): Response =>
  new Response(body, { status, headers: SECURITY_HEADERS });

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }

    if (url.pathname === "/health") {
      const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
      return json({
        ok: true,
        rateLimiter: env.AUDIT_LIMITER ? "bound" : "unbound",
        // calls the limiter for real, so a silently broken limiter shows up
        rateVerdict: await rateCheck(env, `health:${ip}`),
      });
    }

    if (url.pathname === "/") return html(renderHome());

    if (url.pathname !== "/audit") {
      return html(renderError("No such page.", "", 404), 404);
    }

    const target = url.searchParams.get("url") ?? "";
    const wantsJson = url.searchParams.get("format") === "json";
    const fail = (msg: string, status: number): Response =>
      wantsJson
        ? json({ ok: false, error: msg, target }, status)
        : html(renderError(msg, target, status), status);

    if (target.trim() === "") return fail("Enter a URL to audit.", 400);

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const rate = await rateCheck(env, ip);
    if (rate === "blocked") {
      return fail(
        `Rate limit: ${MAX_PER_WINDOW} audits per minute. Wait a moment, or run the CLI locally with: npx site-spec audit --url ${target}`,
        429,
      );
    }

    // Admission control BEFORE any socket is opened to the target.
    const verdict = await admitUrl(target, AbortSignal.timeout(5_000));
    if (!verdict.ok) return fail(`Refused: ${verdict.reason}.`, 400);

    try {
      const { files, meta } = await crawlSite(verdict.url);
      // linkChecks off: a capped crawl cannot prove a file is absent from the
      // server, so presence-dependent checks would produce false errors.
      const report = auditFiles({ files, mode: "generic", linkChecks: false });

      if (wantsJson) {
        return json({
          ok: report.ok,
          target: meta.startUrl,
          finalUrl: meta.finalUrl,
          errors: report.errors,
          warnings: report.warnings,
          pages: report.pages,
          fetched: meta.fetched,
          notes: meta.notes,
          findings: report.findings,
          limits: LIMITS,
        });
      }
      return html(renderReport(report, meta, target));
    } catch (err) {
      if (err instanceof GuardError) return fail(err.message, 400);
      const msg = err instanceof Error ? err.message : String(err);
      return fail(`Audit failed: ${msg}`, 502);
    }
  },
};
