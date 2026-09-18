import type { NextRequest } from "next/server";
import { config } from "./config";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export interface RateLimitStore {
  incrementar(chave: string, janelaMs: number, agora: number): RateLimitBucket;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly maxBuckets: number;

  constructor(maxBuckets = 10_000) {
    this.maxBuckets = maxBuckets;
  }

  incrementar(chave: string, janelaMs: number, agora: number): RateLimitBucket {
    if (this.buckets.size > this.maxBuckets) {
      for (const [bucketKey, bucket] of this.buckets) {
        if (bucket.resetAt <= agora) {
          this.buckets.delete(bucketKey);
        }
      }
      if (this.buckets.size > this.maxBuckets) {
        this.buckets.clear();
      }
    }

    let bucket = this.buckets.get(chave);
    if (!bucket || bucket.resetAt <= agora) {
      bucket = { count: 0, resetAt: agora + janelaMs };
      this.buckets.set(chave, bucket);
    }
    bucket.count += 1;
    return bucket;
  }
}

let store: RateLimitStore = new MemoryRateLimitStore();

export function setRateLimitStore(next: RateLimitStore): void {
  store = next;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  const windowMs = config.rateLimitWindowMs;
  const limit = config.rateLimitMax;
  const bucket = store.incrementar(key, windowMs, now);

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds:
      bucket.count > limit ? Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) : 0,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    ...(result.retryAfterSeconds > 0
      ? { "Retry-After": String(result.retryAfterSeconds) }
      : {}),
  };
}