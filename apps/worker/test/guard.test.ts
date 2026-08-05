import { describe, expect, it } from "vitest";
import {
  checkAddressLiteral,
  checkUrlSyntax,
  isBlockedIPv4,
  isBlockedIPv6,
  parseIPv4,
  parseIPv6,
} from "../src/guard";

/** Convenience: the reason string for a rejected URL, or null if it was allowed. */
const reject = (input: string): string | null => {
  const v = checkUrlSyntax(input);
  return v.ok ? null : v.reason;
};

describe("parseIPv4", () => {
  it("parses dotted decimal", () => {
    expect(parseIPv4("127.0.0.1")).toEqual([127, 0, 0, 1]);
    expect(parseIPv4("8.8.8.8")).toEqual([8, 8, 8, 8]);
  });
  it("rejects non-addresses", () => {
    expect(parseIPv4("example.com")).toBeNull();
    expect(parseIPv4("999.0.0.1")).toBeNull();
    expect(parseIPv4("1.2.3")).toBeNull();
  });
});

describe("isBlockedIPv4", () => {
  const blocked = [
    "0.0.0.0",
    "10.0.0.1",
    "127.0.0.1",
    "127.1.2.3",
    "169.254.169.254", // AWS/GCP metadata
    "169.254.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "100.64.0.1", // CGNAT
    "192.0.0.1",
    "192.0.2.1",
    "192.88.99.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "255.255.255.255",
  ];
  for (const ip of blocked) {
    it(`blocks ${ip}`, () => {
      expect(isBlockedIPv4(parseIPv4(ip)!)).toBe(true);
    });
  }

  const allowed = ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.15.0.1", "172.32.0.1", "192.167.1.1"];
  for (const ip of allowed) {
    it(`allows public ${ip}`, () => {
      expect(isBlockedIPv4(parseIPv4(ip)!)).toBe(false);
    });
  }
});

describe("parseIPv6 / isBlockedIPv6", () => {
  it("expands compressed form", () => {
    expect(parseIPv6("::1")).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(parseIPv6("[::1]")).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
  });
  const blocked = [
    "::",
    "::1",
    "fc00::1", // unique local
    "fd12:3456::1",
    "fe80::1", // link-local
    "ff02::1", // multicast
    "2001:db8::1", // documentation
    "::ffff:127.0.0.1", // IPv4-mapped loopback
    "::ffff:169.254.169.254", // IPv4-mapped metadata
    "64:ff9b::127.0.0.1", // NAT64 loopback
  ];
  for (const ip of blocked) {
    it(`blocks ${ip}`, () => {
      const g = parseIPv6(ip);
      expect(g, `failed to parse ${ip}`).not.toBeNull();
      expect(isBlockedIPv6(g!)).toBe(true);
    });
  }
  it("allows a public v6 address", () => {
    expect(isBlockedIPv6(parseIPv6("2606:4700:4700::1111")!)).toBe(false);
  });
  it("allows an IPv4-mapped public address", () => {
    expect(isBlockedIPv6(parseIPv6("::ffff:8.8.8.8")!)).toBe(false);
  });
});

describe("checkAddressLiteral", () => {
  it("flags loopback and metadata", () => {
    expect(checkAddressLiteral("127.0.0.1")).toMatch(/blocked address/);
    expect(checkAddressLiteral("169.254.169.254")).toMatch(/blocked address/);
  });
  it("passes a public address and a hostname", () => {
    expect(checkAddressLiteral("8.8.8.8")).toBeNull();
    expect(checkAddressLiteral("example.com")).toBeNull();
  });
});

describe("checkUrlSyntax: SSRF targets", () => {
  // The two addresses named in the acceptance criteria.
  it("rejects http://127.0.0.1", () => {
    expect(reject("http://127.0.0.1")).toMatch(/blocked address/);
  });
  it("rejects http://169.254.169.254", () => {
    expect(reject("http://169.254.169.254")).toMatch(/blocked address/);
  });

  it("rejects localhost by name", () => {
    expect(reject("http://localhost")).toMatch(/blocked hostname/);
    expect(reject("http://localhost:8080/admin")).toMatch(/blocked hostname/);
  });

  it("rejects obfuscated loopback forms the URL parser normalizes", () => {
    // WHATWG normalizes each of these to 127.0.0.1 before we ever see it.
    for (const u of ["http://2130706433", "http://0177.0.0.1", "http://0x7f.0.0.1", "http://127.1"]) {
      expect(reject(u), u).toMatch(/blocked address/);
    }
  });

  it("rejects IPv6 loopback and metadata literals", () => {
    expect(reject("http://[::1]/")).toMatch(/blocked address/);
    expect(reject("http://[::ffff:169.254.169.254]/")).toMatch(/blocked address/);
    expect(reject("http://[fd00::1]/")).toMatch(/blocked address/);
  });

  it("rejects private ranges", () => {
    expect(reject("http://10.0.0.1")).toMatch(/blocked address/);
    expect(reject("http://192.168.0.1")).toMatch(/blocked address/);
    expect(reject("http://172.16.5.4")).toMatch(/blocked address/);
  });

  it("rejects internal hostname suffixes", () => {
    expect(reject("http://printer.local")).toMatch(/internal hostname suffix/);
    expect(reject("http://db.internal")).toMatch(/internal hostname suffix/);
    expect(reject("http://wiki.corp")).toMatch(/internal hostname suffix/);
  });

  it("rejects single-label hosts", () => {
    expect(reject("http://router")).toMatch(/not a public hostname/);
  });

  it("rejects non-http schemes", () => {
    expect(reject("file:///etc/passwd")).toMatch(/not allowed/);
    expect(reject("gopher://example.com")).toMatch(/not allowed/);
    expect(reject("ftp://example.com")).toMatch(/not allowed/);
    // must not be silently rewritten into https://javascript:...
    expect(reject("javascript:alert(1)")).toMatch(/not allowed|not a valid URL/);
  });

  it("rejects embedded credentials", () => {
    expect(reject("http://user:pw@example.com")).toMatch(/credentials/);
  });

  it("rejects odd ports used for internal port scanning", () => {
    expect(reject("http://example.com:22")).toMatch(/port 22 is not allowed/);
    expect(reject("http://example.com:6379")).toMatch(/port 6379 is not allowed/);
  });

  it("rejects junk", () => {
    expect(reject("")).toMatch(/no URL/);
    expect(reject("   ")).toMatch(/no URL/);
    expect(reject(`https://example.com/${"a".repeat(2100)}`)).toMatch(/too long/);
  });
});

describe("checkUrlSyntax: legitimate targets", () => {
  it("accepts a bare domain and defaults to https", () => {
    const v = checkUrlSyntax("example.com");
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.url.href).toBe("https://example.com/");
  });

  it("accepts explicit http and https, paths, ports and query strings", () => {
    for (const u of [
      "https://example.com",
      "http://example.com/page.html",
      "https://sub.example.co.uk/a/b?c=d",
      "https://example.com:8443/",
    ]) {
      expect(checkUrlSyntax(u).ok, u).toBe(true);
    }
  });

  it("accepts a public IP literal", () => {
    expect(checkUrlSyntax("http://8.8.8.8/").ok).toBe(true);
  });

  it("strips a trailing dot without breaking the check", () => {
    expect(checkUrlSyntax("https://example.com./").ok).toBe(true);
  });
});
