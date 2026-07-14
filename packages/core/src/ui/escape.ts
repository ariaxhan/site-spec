/**
 * §5 — context-aware escaping. HTML entities are safe ONLY in the HTML body.
 * Attributes, URLs, and JSON-LD each need their own encoder, chosen by output
 * position. These are the primitives' last line of defense and are never
 * bypassed except through a loud, audited escape hatch.
 */

const HTML_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Safe for HTML text content. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_MAP[c]!);
}

/** Safe for a double-quoted HTML attribute value. */
export function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_MAP[c]!);
}

const ALLOWED_SCHEMES = new Set(["http:", "https:", "tel:", "mailto:"]);

/**
 * URL scheme allowlist AFTER normalization. `javascript:` contains no
 * HTML-special chars, so entity encoding does nothing — the scheme must be
 * checked explicitly. Relative refs (#, /, ?) and bare paths are allowed.
 * Anything with a disallowed scheme collapses to "#". (§5, non-negotiable)
 */
export function safeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "#";
  if (/^[#/?]/.test(trimmed)) return trimmed;
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
  if (!schemeMatch) return trimmed; // no scheme → relative-ish, safe
  const scheme = schemeMatch[1]!.toLowerCase() + ":";
  return ALLOWED_SCHEMES.has(scheme) ? trimmed : "#";
}

/**
 * JSON-LD `</script>` breakout: JSON.stringify does NOT escape < > &, so a value
 * containing `</script>` would break out of the data block. Substitute the
 * unicode escapes. (§5)
 */
export function escapeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
