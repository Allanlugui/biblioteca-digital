import { config } from "@/lib/config";

export class ProviderError extends Error {
  readonly fonte: string;
  readonly status?: number;

  constructor(fonte: string, message: string, status?: number) {
    super(message);
    this.name = "ProviderError";
    this.fonte = fonte;
    this.status = status;
  }
}

export function userAgent(): string {
  const mailto = config.openalexMailto;
  return mailto ? `biblioteca-digital/0.1 (mailto:${mailto})` : "biblioteca-digital/0.1";
}

export function withTimeout(externo?: AbortSignal): {
  signal: AbortSignal;
  cancelar: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new Error("timeout")),
    config.searchTimeoutMs,
  );
  const onAbort = () => {
    clearTimeout(timeoutId);
    if (externo && !controller.signal.aborted) {
      controller.abort(externo.reason);
    }
  };
  if (externo) {
    if (externo.aborted) {
      onAbort();
    } else {
      externo.addEventListener("abort", onAbort, { once: true });
    }
  }
  return {
    signal: controller.signal,
    cancelar: () => {
      clearTimeout(timeoutId);
      externo?.removeEventListener("abort", onAbort);
    },
  };
}

export async function fetchTexto(
  url: string,
  fonte: string,
  signal?: AbortSignal,
  cabecalhos?: Record<string, string>,
): Promise<string> {
  const { signal: scoped, cancelar } = withTimeout(signal);
  try {
    const response = await fetch(url, {
      signal: scoped,
      headers: {
        "User-Agent": userAgent(),
        Accept: "application/json, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
        ...cabecalhos,
      },
    });
    const texto = await response.text();
    if (!response.ok) {
      throw new ProviderError(fonte, `A fonte respondeu HTTP ${response.status}.`, response.status);
    }
    return texto;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (scoped.aborted) {
      throw new ProviderError(fonte, "Tempo de espera pela fonte excedido.");
    }
    throw new ProviderError(fonte, "Falha ao acessar a fonte.");
  } finally {
    cancelar();
  }
}

export function somenteHttp(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("https://")) return url;
  if (url.startsWith("http://")) return url;
  return null;
}

export function paraHttps(url: string | null | undefined): string | null {
  const http = somenteHttp(url);
  if (!http) return null;
  return http.startsWith("http://") ? `https://${http.slice("http://".length)}` : http;
}