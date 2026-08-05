/**
 * URL admission control for the hosted auditor.
 *
 * This module is the security boundary. The worker fetches URLs supplied by
 * anonymous strangers, so every target has to survive these checks BEFORE any
 * socket is opened, and again on every redirect hop.
 *
 * Threat model: SSRF. An attacker points the auditor at an address that is only
 * reachable from inside the network the fetcher runs in (loopback, RFC1918,
 * cloud metadata at 169.254.169.254) and reads the response back out of the
 * audit report. Blocking is done on the resolved IP, not just the hostname,
 * because `evil.test` can simply have an A record of 127.0.0.1.
 *
 * Pure except for `resolveHost`, which is isolated so the rest is unit-testable
 * with no network.
 */

export type GuardVerdict =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

/** Ports a public web page can legitimately live on. Anything else is a scan. */
const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);

/** Hostname suffixes that only ever resolve inside a private network. */
const BLOCKED_SUFFIXES = [
  ".local",
  ".localhost",
  ".internal",
  ".intranet",
  ".lan",
  ".corp",
  ".home",
  ".home.arpa",
  ".onion",
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "instance-data",
]);

/* -------------------------------------------------------------------------- */
/* IP literal handling                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Parse a dotted-decimal IPv4 string into 4 octets.
 * The WHATWG URL parser already normalizes decimal/octal/hex forms
 * (`http://2130706433` → `127.0.0.1`), but we re-parse defensively rather than
 * trusting that every runtime does so.
 */
export function parseIPv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    octets.push(n);
  }
  return octets;
}

/**
 * Is this IPv4 address outside the publicly routable unicast space?
 * Covers loopback, RFC1918 private, link-local (cloud metadata), CGNAT,
 * multicast, benchmarking, documentation and reserved ranges.
 */
export function isBlockedIPv4(octets: number[]): boolean {
  const [a = 0, b = 0, c = 0] = octets;

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 IETF
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (a === 192 && b === 88 && c === 99) return true; // 192.88.99.0/24 6to4 relay
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 TEST-NET-3
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved

  return false;
}

/** Expand an IPv6 literal (no brackets) into its 8 16-bit groups. */
export function parseIPv6(host: string): number[] | null {
  let s = host.trim().toLowerCase();
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  if (!s.includes(":")) return null;

  // An IPv4-mapped/embedded tail (::ffff:127.0.0.1) becomes two 16-bit groups.
  let tail: number[] = [];
  const lastColon = s.lastIndexOf(":");
  const maybeV4 = s.slice(lastColon + 1);
  if (maybeV4.includes(".")) {
    const v4 = parseIPv4(maybeV4);
    if (!v4) return null;
    tail = [((v4[0]! << 8) | v4[1]!) >>> 0, ((v4[2]! << 8) | v4[3]!) >>> 0];
    s = s.slice(0, lastColon + 1) + "0:0";
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;

  const toGroups = (chunk: string): number[] | null => {
    if (chunk === "") return [];
    const out: number[] = [];
    for (const g of chunk.split(":")) {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  };

  const head = toGroups(halves[0] ?? "");
  const back = halves.length === 2 ? toGroups(halves[1] ?? "") : null;
  if (head === null) return null;

  let groups: number[];
  if (halves.length === 2) {
    if (back === null) return null;
    const fill = 8 - head.length - back.length;
    if (fill < 0) return null;
    groups = [...head, ...Array<number>(fill).fill(0), ...back];
  } else {
    groups = head;
  }

  if (tail.length === 2) {
    // the "0:0" placeholder we appended is replaced by the real v4 groups
    groups = [...groups.slice(0, groups.length - 2), ...tail];
  }
  return groups.length === 8 ? groups : null;
}

/** Is this IPv6 address non-public (loopback, ULA, link-local, mapped-private)? */
export function isBlockedIPv6(groups: number[]): boolean {
  const [g0 = 0, g1 = 0, g5 = 0] = [groups[0], groups[1], groups[5]];

  const allZeroHead = groups.slice(0, 5).every((g) => g === 0);

  // ::  and ::1
  if (groups.every((g) => g === 0)) return true;
  if (allZeroHead && g5 === 0 && groups[6] === 0 && groups[7] === 1) return true;

  // ::ffff:a.b.c.d (IPv4-mapped) and 64:ff9b::/96 (NAT64): judge the embedded v4
  const embedded = (): number[] => [
    (groups[6]! >> 8) & 0xff,
    groups[6]! & 0xff,
    (groups[7]! >> 8) & 0xff,
    groups[7]! & 0xff,
  ];
  if (allZeroHead && g5 === 0xffff) return isBlockedIPv4(embedded());
  if (g0 === 0x64 && g1 === 0xff9b) return isBlockedIPv4(embedded());

  if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g0 & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return true; // 2001:db8::/32 documentation
  if (g0 === 0x0100 && g1 === 0) return true; // 100::/64 discard-only

  return false;
}

/** Block an address literal in any family. Returns a reason, or null if allowed. */
export function checkAddressLiteral(hostname: string): string | null {
  const v4 = parseIPv4(hostname);
  if (v4) {
    return isBlockedIPv4(v4)
      ? `blocked address ${hostname} (private, loopback, link-local or reserved range)`
      : null;
  }
  const v6 = parseIPv6(hostname);
  if (v6) {
    return isBlockedIPv6(v6)
      ? `blocked address ${hostname} (private, loopback, link-local or reserved range)`
      : null;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Syntactic admission (pure, no DNS)                                         */
/* -------------------------------------------------------------------------- */

/**
 * Validate a user-supplied target without touching the network.
 * `resolveAndCheck` must still run before the URL is fetched.
 */
export function checkUrlSyntax(input: string): GuardVerdict {
  const raw = input.trim();
  if (raw === "") return { ok: false, reason: "no URL supplied" };
  if (raw.length > 2000) return { ok: false, reason: "URL is too long" };

  // Only default a scheme when none is present. Never rewrite an explicit one,
  // otherwise "javascript:..." would silently become "https://javascript:...".
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  const candidate = hasScheme ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, reason: "not a valid URL" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: `scheme ${url.protocol} is not allowed (http and https only)` };
  }
  if (url.username !== "" || url.password !== "") {
    return { ok: false, reason: "credentials in the URL are not allowed" };
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    return { ok: false, reason: `port ${url.port} is not allowed` };
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "") return { ok: false, reason: "no hostname" };

  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: `blocked hostname ${host}` };
  }
  for (const suffix of BLOCKED_SUFFIXES) {
    if (host.endsWith(suffix)) {
      return { ok: false, reason: `blocked internal hostname suffix ${suffix}` };
    }
  }

  const literal = checkAddressLiteral(host);
  if (literal) return { ok: false, reason: literal };

  // A public site always has a dot in its name. A single-label host ("router",
  // "intranet") can only be an internal search-domain lookup.
  if (!host.includes(".") && parseIPv4(host) === null && parseIPv6(host) === null) {
    return { ok: false, reason: `"${host}" is not a public hostname` };
  }

  return { ok: true, url };
}

/* -------------------------------------------------------------------------- */
/* DNS admission (the part that stops evil.test A 127.0.0.1)                  */
/* -------------------------------------------------------------------------- */

interface DohAnswer {
  data?: string;
  type?: number;
}

/**
 * Resolve a hostname over Cloudflare DNS-over-HTTPS and return every A/AAAA
 * record. Workers have no `dns` module, so DoH is the available resolver.
 */
async function resolveHost(host: string, signal: AbortSignal): Promise<string[]> {
  const addrs: string[] = [];
  for (const type of ["A", "AAAA"]) {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,
      { headers: { accept: "application/dns-json" }, signal },
    );
    if (!res.ok) continue;
    const body = (await res.json()) as { Answer?: DohAnswer[] };
    for (const a of body.Answer ?? []) {
      // type 1 = A, 28 = AAAA. CNAME answers (5) are chased by the resolver
      // itself, so the A/AAAA records in the same response are authoritative.
      if ((a.type === 1 || a.type === 28) && typeof a.data === "string") addrs.push(a.data);
    }
  }
  return addrs;
}

/**
 * Full admission check: syntax, then DNS, then every resolved address.
 * A hostname that resolves to no public address at all is rejected, so a
 * resolver failure fails closed rather than open.
 */
export async function admitUrl(input: string, signal: AbortSignal): Promise<GuardVerdict> {
  const syntax = checkUrlSyntax(input);
  if (!syntax.ok) return syntax;

  const host = syntax.url.hostname.toLowerCase().replace(/\.$/, "");

  // An address literal was already judged directly; no DNS to do.
  if (parseIPv4(host) !== null || parseIPv6(host) !== null) return syntax;

  let addrs: string[];
  try {
    addrs = await resolveHost(host, signal);
  } catch {
    return { ok: false, reason: `could not resolve ${host}` };
  }

  if (addrs.length === 0) return { ok: false, reason: `${host} has no public DNS records` };

  for (const addr of addrs) {
    const blocked = checkAddressLiteral(addr);
    if (blocked) {
      return { ok: false, reason: `${host} resolves to a blocked address (${addr})` };
    }
  }

  return syntax;
}
