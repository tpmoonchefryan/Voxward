import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export type OutboundDnsLookup = (hostname: string) => Promise<readonly { readonly address: string }[]>;

export interface OutboundUrlCheckOptions {
  readonly allowHttpLoopback?: boolean;
  readonly allowedHosts?: ReadonlySet<string>;
  readonly lookup?: OutboundDnsLookup;
  readonly resolveDns?: boolean;
}

export class OutboundUrlError extends Error {
  readonly code: "INVALID_ENDPOINT_URL" | "OUTBOUND_URL_FORBIDDEN" | "SSRF_BLOCKED";

  constructor(code: "INVALID_ENDPOINT_URL" | "OUTBOUND_URL_FORBIDDEN" | "SSRF_BLOCKED", message: string) {
    super(message);
    this.name = "OutboundUrlError";
    this.code = code;
  }
}

function normalizeHost(hostname: string): string {
  const lower = hostname.trim().toLowerCase();
  return lower.startsWith("[") && lower.endsWith("]") ? lower.slice(1, -1) : lower;
}

function parseIpv4Int(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    value = (value << 8) | n;
  }
  return value >>> 0;
}

function isBlockedIpv4(ip: string): boolean {
  const num = parseIpv4Int(ip);
  if (num === null) return true;
  const first = (num >>> 24) & 0xff;
  const second = (num >>> 16) & 0xff;
  if (first === 0) return true; // 0.0.0.0/8 "this network"
  if (first === 10) return true; // 10.0.0.0/8 RFC1918
  if (first === 100 && second >= 64 && second <= 127) return true; // 100.64.0.0/10 CGNAT
  if (first === 127) return true; // 127.0.0.0/8 loopback
  if (first === 169 && second === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
  if (first === 172 && second >= 16 && second <= 31) return true; // 172.16.0.0/12 RFC1918
  if (first === 192 && second === 0 && ((num >>> 8) & 0xff) === 0) return true; // 192.0.0.0/24
  if (first === 192 && second === 0 && ((num >>> 8) & 0xff) === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (first === 192 && second === 168) return true; // 192.168.0.0/16 RFC1918
  if (first === 198 && (second === 18 || second === 19)) return true; // 198.18.0.0/15 benchmark
  if (first >= 224) return true; // multicast & reserved
  return false;
}

function expandIpv6(ip: string): number[] | null {
  const zoneIdx = ip.indexOf("%");
  const clean = zoneIdx >= 0 ? ip.slice(0, zoneIdx) : ip;
  const mappedIdx = clean.lastIndexOf(":");
  let working = clean;
  if (mappedIdx >= 0 && clean.slice(mappedIdx + 1).includes(".")) {
    const v4 = parseIpv4Int(clean.slice(mappedIdx + 1));
    if (v4 === null) return null;
    const hi = ((v4 >>> 16) & 0xffff).toString(16);
    const lo = (v4 & 0xffff).toString(16);
    working = `${clean.slice(0, mappedIdx)}:${hi}:${lo}`;
  }
  const halves = working.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = halves.length === 2 ? 8 - (left.length + right.length) : 0;
  if (missing < 0 || (halves.length === 1 && left.length !== 8)) return null;
  const groups = [...left, ...Array<string>(missing).fill("0"), ...right];
  if (groups.length !== 8) return null;
  const words: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    words.push(Number.parseInt(g, 16));
  }
  return words;
}

function isBlockedIpv6(ip: string): boolean {
  const words = expandIpv6(ip);
  if (words === null) return true;
  const allZero = words.slice(0, 7).every((w) => w === 0);
  if (allZero && (words[7] === 0 || words[7] === 1)) return true; // :: / ::1
  // IPv4-mapped ::ffff:0:0/96 or IPv4-compatible ::/96
  if (words[0] === 0 && words[1] === 0 && words[2] === 0 && words[3] === 0 && words[4] === 0 && (words[5] === 0xffff || words[5] === 0)) {
    const v4 = `${words[6]! >>> 8}.${words[6]! & 0xff}.${words[7]! >>> 8}.${words[7]! & 0xff}`;
    return isBlockedIpv4(v4);
  }
  const first = words[0]!;
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 ULA
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

export function isPublicIpAddress(ip: string): boolean {
  const clean = normalizeHost(ip);
  const kind = isIP(clean);
  if (kind === 4) return !isBlockedIpv4(clean);
  if (kind === 6) return !isBlockedIpv6(clean);
  return false;
}

function isBlockedHostname(host: string): boolean {
  if (!host) return true;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }
  const kind = isIP(host);
  if (kind !== 0) {
    return !isPublicIpAddress(host);
  }
  return false;
}

/** Validates static syntax, scheme, embedded credentials, and non-public hosts for configured endpoints. */
export function assertValidEndpointUrlSync(rawUrl: string, options: OutboundUrlCheckOptions = {}): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new OutboundUrlError("INVALID_ENDPOINT_URL", "Endpoint URL is invalid");
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new OutboundUrlError("OUTBOUND_URL_FORBIDDEN", "Embedded URL credentials are forbidden");
  }
  const host = normalizeHost(parsed.hostname);
  const explicitlyAllowed = options.allowedHosts?.has(host) === true;
  if (parsed.protocol !== "https:") {
    const isLoopbackHttp =
      options.allowHttpLoopback === true &&
      parsed.protocol === "http:" &&
      (host === "127.0.0.1" || host === "localhost" || host === "::1");
    if (!isLoopbackHttp) {
      throw new OutboundUrlError("OUTBOUND_URL_FORBIDDEN", `Disallowed outbound scheme: ${parsed.protocol}`);
    }
  }
  if (!explicitlyAllowed && isBlockedHostname(host)) {
    throw new OutboundUrlError("SSRF_BLOCKED", `Blocked outbound destination host: ${host}`);
  }
  return parsed;
}

/** Normalizes an adapter endpoint into `origin + pathname` (no trailing slash) for secret binding. */
export function normalizeBoundEndpoint(rawUrl?: string | null, fallbackUrl?: string): string {
  const candidate = rawUrl?.trim() || fallbackUrl?.trim() || "";
  if (!candidate) return "";
  try {
    const u = new URL(candidate);
    const cleanPath = u.pathname.replace(/\/+$/, "");
    return `${u.origin}${cleanPath}`;
  } catch {
    return candidate.replace(/\/+$/, "");
  }
}

/** Validates an outbound URL including DNS resolution (unless bypassed for offline stub fetch). */
export async function assertSafeOutboundUrl(rawUrl: string, options: OutboundUrlCheckOptions = {}): Promise<URL> {
  const parsed = assertValidEndpointUrlSync(rawUrl, options);
  const host = normalizeHost(parsed.hostname);
  if (options.allowedHosts?.has(host) === true) {
    return parsed;
  }
  if (isIP(host) === 0 && (options.lookup !== undefined || options.resolveDns === true)) {
    const lookupFn: OutboundDnsLookup =
      options.lookup ?? ((h) => dnsLookup(h, { all: true, verbatim: true }));
    const records = await lookupFn(host);
    if (records.length === 0) {
      throw new OutboundUrlError("SSRF_BLOCKED", `DNS resolution returned no records for ${host}`);
    }
    for (const rec of records) {
      if (!isPublicIpAddress(rec.address)) {
        throw new OutboundUrlError("SSRF_BLOCKED", `DNS resolved ${host} to non-public address ${rec.address}`);
      }
    }
  }
  return parsed;
}

/** Performs an SSRF-checked fetch with `redirect: "error"`. */
export async function safeOutboundFetch(
  rawUrl: string,
  init: RequestInit,
  options: {
    readonly fetchImpl?: typeof fetch;
    readonly lookup?: OutboundDnsLookup;
    readonly allowedHosts?: ReadonlySet<string>;
  } = {},
): Promise<Response> {
  const fetchFn = options.fetchImpl ?? fetch;
  const resolveDns = options.lookup !== undefined || fetchFn === globalThis.fetch;
  const safeUrl = await assertSafeOutboundUrl(rawUrl, {
    lookup: options.lookup,
    allowedHosts: options.allowedHosts,
    resolveDns,
  });
  return fetchFn(safeUrl.toString(), {
    ...init,
    redirect: "error",
  });
}
