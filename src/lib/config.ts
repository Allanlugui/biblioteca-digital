export type ServerConfig = {
  rateLimitMax: number;
  rateLimitWindowMs: number;
  proxyMaxSizeBytes: number;
  proxyTimeoutMs: number;
  proxyAllowedHostSuffixes: string[];
  searchTimeoutMs: number;
  searchCacheTtlMs: number;
  openalexMailto: string;
};

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readList(name: string): string[] {
  const raw = process.env[name];
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export const config: ServerConfig = {
  rateLimitMax: readPositiveInt("RATE_LIMIT_MAX_REQUESTS", 30),
  rateLimitWindowMs: readPositiveInt("RATE_LIMIT_WINDOW_MS", 60_000),
  proxyMaxSizeBytes: readPositiveInt("PROXY_MAX_SIZE_BYTES", 50 * 1024 * 1024),
  proxyTimeoutMs: readPositiveInt("PROXY_TIMEOUT_MS", 30_000),
  proxyAllowedHostSuffixes: readList("PROXY_ALLOWED_HOST_SUFFIXES"),
  searchTimeoutMs: readPositiveInt("SEARCH_TIMEOUT_MS", 15_000),
  searchCacheTtlMs: readPositiveInt("SEARCH_CACHE_TTL_MS", 300_000),
  openalexMailto: process.env.OPENALEX_MAILTO?.trim() ?? "",
};