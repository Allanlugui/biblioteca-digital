export type ServerConfig = {
  rateLimitMax: number;
  rateLimitWindowMs: number;
  proxyMaxSizeBytes: number;
  proxyTimeoutMs: number;
  proxyAllowedHostSuffixes: string[];
  searchTimeoutMs: number;
  searchCacheTtlMs: number;
  openalexMailto: string;
  semanticScholarApiKey: string;
  googleSearchApiKey: string;
  googleSearchCx: string;
  storageDriver: "drive" | "supabase";
  googleServiceAccountJson: string;
  googleDriveFolderId: string;
  googleOAuthClientId: string;
  googleOAuthClientSecret: string;
  googleOAuthRefreshToken: string;
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
  semanticScholarApiKey: process.env.SEMANTIC_SCHOLAR_API_KEY?.trim() ?? "",
  googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY?.trim() ?? "",
  googleSearchCx: process.env.GOOGLE_SEARCH_CX?.trim() ?? "",
  storageDriver: process.env.STORAGE_DRIVER?.trim().toLowerCase() === "drive" ? "drive" : "supabase",
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ?? "",
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() ?? "",
  googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? "",
  googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? "",
  googleOAuthRefreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim() ?? "",
};