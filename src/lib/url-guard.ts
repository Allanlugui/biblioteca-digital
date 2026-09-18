import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { config } from "./config";

export type VerifiedAddress = {
  address: string;
  family: 4 | 6;
};

export type GuardedUrl = {
  url: URL;
  addresses: VerifiedAddress[];
};

export type UrlGuardErrorCode = "INVALID_URL" | "DESTINATION_BLOCKED" | "RESOLUTION_FAILED";

export class UrlGuardError extends Error {
  readonly code: UrlGuardErrorCode;

  constructor(code: UrlGuardErrorCode, message: string) {
    super(message);
    this.name = "UrlGuardError";
    this.code = code;
  }
}

const BLOCKED_HOSTNAMES = new Set(["localhost"]);
const BLOCKED_SUFFIXES = [".local", ".localhost", ".internal", ".home.arpa", ".lan"];

const blockedNetwork = new BlockList();
// IPv4 — faixas privadas, reservadas e não-roteáveis (IANA).
blockedNetwork.addSubnet("0.0.0.0", 8, "ipv4");
blockedNetwork.addSubnet("10.0.0.0", 8, "ipv4");
blockedNetwork.addSubnet("100.64.0.0", 10, "ipv4");
blockedNetwork.addSubnet("127.0.0.0", 8, "ipv4");
blockedNetwork.addSubnet("169.254.0.0", 16, "ipv4");
blockedNetwork.addSubnet("172.16.0.0", 12, "ipv4");
blockedNetwork.addSubnet("192.0.0.0", 24, "ipv4");
blockedNetwork.addSubnet("192.0.2.0", 24, "ipv4");
blockedNetwork.addSubnet("192.88.99.0", 24, "ipv4");
blockedNetwork.addSubnet("192.168.0.0", 16, "ipv4");
blockedNetwork.addSubnet("198.18.0.0", 15, "ipv4");
blockedNetwork.addSubnet("198.51.100.0", 24, "ipv4");
blockedNetwork.addSubnet("203.0.113.0", 24, "ipv4");
blockedNetwork.addSubnet("224.0.0.0", 4, "ipv4");
blockedNetwork.addSubnet("240.0.0.0", 4, "ipv4");
blockedNetwork.addAddress("255.255.255.255", "ipv4");
// IPv6 — endereços especiais/não-rábeis. O Node mapeia ::ffff:x.y.z.w
// automaticamente para IPv4, portanto as faixas IPv4 também protegem a forma mapeada.
blockedNetwork.addAddress("::", "ipv6");
blockedNetwork.addAddress("::1", "ipv6");
blockedNetwork.addSubnet("64:ff9b::", 96, "ipv6");
blockedNetwork.addSubnet("100::", 64, "ipv6");
blockedNetwork.addSubnet("2001::", 32, "ipv6");
blockedNetwork.addSubnet("2001:10::", 28, "ipv6");
blockedNetwork.addSubnet("2002::", 16, "ipv6");
blockedNetwork.addSubnet("fc00::", 7, "ipv6");
blockedNetwork.addSubnet("fe80::", 10, "ipv6");
blockedNetwork.addSubnet("ff00::", 8, "ipv6");

function matchesBlockedShape(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  return BLOCKED_SUFFIXES.some((suffix) => lower === suffix || lower.endsWith(suffix));
}

function hostAllowedByPolicy(hostname: string): boolean {
  const suffixes = config.proxyAllowedHostSuffixes;
  if (suffixes.length === 0) return true;
  const lower = hostname.toLowerCase();
  return suffixes.some((suffix) => lower === suffix || lower.endsWith(`.${suffix}`));
}

function isPrivateAddress(address: string, family: "ipv4" | "ipv6"): boolean {
  return blockedNetwork.check(address, family);
}

export async function assertPublicHttpsUrl(rawUrl: string): Promise<GuardedUrl> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UrlGuardError("INVALID_URL", "A URL informada é inválida.");
  }

  if (url.protocol !== "https:") {
    throw new UrlGuardError("INVALID_URL", "Apenas URLs https são permitidas.");
  }
  if (url.username || url.password) {
    throw new UrlGuardError("INVALID_URL", "A URL não pode conter credenciais.");
  }
  if (url.port !== "" && url.port !== "443") {
    throw new UrlGuardError("INVALID_URL", "Apenas a porta 443 é permitida.");
  }

  const hostname = url.hostname;
  if (!hostname || matchesBlockedShape(hostname)) {
    throw new UrlGuardError("DESTINATION_BLOCKED", "O destino informado não é permitido.");
  }
  if (!hostAllowedByPolicy(hostname)) {
    throw new UrlGuardError("DESTINATION_BLOCKED", "O domínio informado não é permitido.");
  }

  const ipVersion = isIP(hostname);
  if (ipVersion !== 0) {
    const family: "ipv4" | "ipv6" = ipVersion === 6 ? "ipv6" : "ipv4";
    if (isPrivateAddress(hostname, family)) {
      throw new UrlGuardError("DESTINATION_BLOCKED", "O destino informado não é permitido.");
    }
    return { url, addresses: [{ address: hostname, family: ipVersion === 6 ? 6 : 4 }] };
  }

  let resolved;
  try {
    resolved = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UrlGuardError(
      "RESOLUTION_FAILED",
      "Não foi possível verificar o endereço do destino.",
    );
  }

  const addresses: VerifiedAddress[] = [];
  for (const entry of resolved) {
    const version = isIP(entry.address);
    if (version === 0) continue;
    const family: "ipv4" | "ipv6" = version === 6 ? "ipv6" : "ipv4";
    if (isPrivateAddress(entry.address, family)) {
      throw new UrlGuardError("DESTINATION_BLOCKED", "O destino informado não é permitido.");
    }
    addresses.push({ address: entry.address, family: version === 6 ? 6 : 4 });
  }

  if (addresses.length === 0) {
    throw new UrlGuardError(
      "RESOLUTION_FAILED",
      "Não foi possível verificar o endereço do destino.",
    );
  }

  return { url, addresses };
}