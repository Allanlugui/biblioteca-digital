import https from "node:https";
import { Readable } from "node:stream";
import { config } from "./config";
import { assertPublicHttpsUrl, type VerifiedAddress } from "./url-guard";

export type PinnedResponse = {
  status: number;
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
};

export const PINNED_TIMEOUT_CODE = "PINNED_TIMEOUT";

const MAX_REDIRECTS = 5;

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | { address: string; family: number }[],
  family: number,
) => void;

function lookupPinned(pinned: VerifiedAddress[]) {
  return (_hostname: string, options: unknown, callback: LookupCallback) => {
    const first = pinned[0];
    if (!first) {
      callback(
        Object.assign(new Error("sem endereço verificado"), { code: "ENOTFOUND" }),
        "",
        0,
      );
      return;
    }
    // O Node chama lookups customizados com `{ all: true }` — nesse modo o
    // callback deve receber um array de endereços, não um endereço único.
    const all =
      typeof options === "object" &&
      options !== null &&
      (options as { all?: boolean }).all === true;
    if (all) {
      callback(
        null,
        pinned.map((entry) => ({ address: entry.address, family: entry.family })),
        first.family,
      );
      return;
    }
    callback(null, first.address, first.family);
  };
}

function requestOnce(
  url: URL,
  pinned: VerifiedAddress[],
  timeoutMs: number,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<PinnedResponse> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new Error("abortado"));
      return;
    }
    const req = https.request(
      url,
      {
        method: "GET",
        lookup: lookupPinned(pinned),
        timeout: timeoutMs,
        headers,
      },
      (res) => {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(res.headers)) {
          if (Array.isArray(value)) {
            for (const item of value) responseHeaders.append(name, item);
          } else if (value !== undefined) {
            responseHeaders.append(name, value);
          }
        }
        resolve({
          status: res.statusCode ?? 0,
          headers: responseHeaders,
          body: Readable.toWeb(res) as ReadableStream<Uint8Array>,
        });
      },
    );
    req.on("timeout", () => {
      req.destroy(Object.assign(new Error("timeout"), { code: PINNED_TIMEOUT_CODE }));
    });
    req.on("error", reject);
    if (signal) {
      const onAbort = () => {
        req.destroy(signal.reason instanceof Error ? signal.reason : new Error("abortado"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
    }
    req.end();
  });
}

export async function fetchPinned(
  entrada: string,
  options?: {
    timeoutMs?: number;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
): Promise<PinnedResponse> {
  const timeoutMs = options?.timeoutMs ?? config.proxyTimeoutMs;
  const extraHeaders = options?.headers ?? {};
  let atual = entrada;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // Cada hop (incluindo redirects) passa pela verificação completa do guard,
    // que resolve o DNS e bloqueia destinos privados — e a conexão usa
    // somente o IP verificado (mitiga DNS rebinding/TOCTOU).
    const guarded = await assertPublicHttpsUrl(atual);
    const { status, headers, body } = await requestOnce(
      guarded.url,
      guarded.addresses,
      timeoutMs,
      { "User-Agent": "biblioteca-digital/0.1", ...extraHeaders },
      options?.signal,
    );

    if (status >= 300 && status < 400) {
      const location = headers.get("location");
      await body?.cancel().catch(() => undefined);
      if (!location) {
        throw new Error(`Redirecionamento sem destino (HTTP ${status}).`);
      }
      atual = new URL(location, guarded.url.toString()).toString();
      continue;
    }

    return { status, headers, body };
  }

  throw new Error("Excesso de redirecionamentos.");
}