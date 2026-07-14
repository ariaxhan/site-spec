import { describe, it, expect } from "vitest";
import { escapeHtml, escapeAttr, safeUrl, escapeJsonLd } from "../src/ui/escape";

describe("escapeHtml", () => {
  it("neutralizes a script tag", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });
});

describe("escapeAttr", () => {
  it("breaks out-of-attribute attempts", () => {
    expect(escapeAttr('" onerror="alert(1)')).toBe("&quot; onerror=&quot;alert(1)");
  });
});

describe("safeUrl", () => {
  it("allows http, https, tel, mailto", () => {
    expect(safeUrl("https://example.com")).toBe("https://example.com");
    expect(safeUrl("tel:+14085550142")).toBe("tel:+14085550142");
    expect(safeUrl("mailto:a@b.com")).toBe("mailto:a@b.com");
  });

  it("allows relative refs", () => {
    expect(safeUrl("#menu")).toBe("#menu");
    expect(safeUrl("/about")).toBe("/about");
  });

  it("collapses javascript: and data: to #", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("#");
    expect(safeUrl("JavaScript:alert(1)")).toBe("#");
    expect(safeUrl("data:text/html,<script>")).toBe("#");
    expect(safeUrl("  javascript:alert(1)  ")).toBe("#");
  });
});

describe("escapeJsonLd", () => {
  it("prevents </script> breakout", () => {
    const out = escapeJsonLd({ name: "</script><script>evil" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
  });
});
