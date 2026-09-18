import { beforeEach, describe, expect, it } from "vitest";
import {
  checkRateLimit,
  MemoryRateLimitStore,
  rateLimitHeaders,
  setRateLimitStore,
} from "@/lib/rate-limit";

const LIMITE = 30;

beforeEach(() => {
  setRateLimitStore(new MemoryRateLimitStore());
});

describe("checkRateLimit", () => {
  it("permite até o limite e bloqueia em seguida", () => {
    const agora = 1_000_000;
    let ultimo = checkRateLimit("ip|/api/busca", agora);
    for (let i = 1; i < LIMITE; i++) {
      ultimo = checkRateLimit("ip|/api/busca", agora);
      expect(ultimo.allowed).toBe(true);
    }
    expect(ultimo.remaining).toBe(0);
    const bloqueado = checkRateLimit("ip|/api/busca", agora);
    expect(bloqueado.allowed).toBe(false);
    expect(bloqueado.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isola chaves diferentes", () => {
    const agora = 2_000_000;
    for (let i = 0; i < LIMITE; i++) {
      checkRateLimit("ip|/api/busca", agora);
    }
    expect(checkRateLimit("ip|/api/busca", agora).allowed).toBe(false);
    expect(checkRateLimit("ip|/api/proxy", agora).allowed).toBe(true);
  });

  it("reinicia a janela após expirar", () => {
    const agora = 3_000_000;
    for (let i = 0; i <= LIMITE; i++) {
      checkRateLimit("ip|/api/busca", agora);
    }
    expect(checkRateLimit("ip|/api/busca", agora).allowed).toBe(false);
    expect(checkRateLimit("ip|/api/busca", agora + 60_001).allowed).toBe(true);
  });
});

describe("rateLimitHeaders", () => {
  it("inclui Retry-After apenas quando bloqueado", () => {
    expect(rateLimitHeaders({ allowed: true, limit: 30, remaining: 5, retryAfterSeconds: 0 }))
      .toEqual({ "X-RateLimit-Limit": "30", "X-RateLimit-Remaining": "5" });
    expect(
      rateLimitHeaders({ allowed: false, limit: 30, remaining: 0, retryAfterSeconds: 42 })[
        "Retry-After"
      ],
    ).toBe("42");
  });
});