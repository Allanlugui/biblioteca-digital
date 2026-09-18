import { config } from "./config";
import { fetchPinned } from "./pinned-fetch";

// Descoberta de PDF em páginas de destino (landing pages de editoras/OJS).
// Muitos publicadores marcam o arquivo com <meta name="citation_pdf_url">;
// como fallback, procura links diretos para .pdf. Puro e testável.
export function extrairCandidatosPdf(html: string, base: string): string[] {
  const candidatos: string[] = [];
  const ver = (href: string | null | undefined) => {
    if (!href) return;
    try {
      const absoluta = new URL(href.trim(), base);
      if (absoluta.protocol !== "https:") return;
      const chave = absoluta.toString();
      if (!candidatos.includes(chave)) candidatos.push(chave);
    } catch {
      // href malformado: ignora e segue.
    }
  };

  // Meta citation_pdf_url (name ou property, qualquer ordem de atributos).
  const metaPdf = /<meta\s[^>]*?(?:name|property)\s*=\s*["']citation_pdf_url["'][^>]*?>/gi;
  for (const tag of html.match(metaPdf) ?? []) {
    ver(/content\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]);
  }
  // Âncoras de download: .pdf explícito, rotas /download/ (ex.: OJS) ou texto "PDF".
  // A validação real (MIME + magic bytes) acontece depois, no fetchPdf.
  const ancora = /<a\s[^>]*?href\s*=\s*["']([^"']+)["'][^>]*?>([\s\S]*?)<\/a\s*?>/gi;
  let m: RegExpExecArray | null;
  while ((m = ancora.exec(html)) !== null) {
    const href = m[1] ?? "";
    const texto = (m[2] ?? "").replace(/<[^>]*>/g, " ");
    if (/\.pdf($|[?#])/i.test(href) || /\/download\//i.test(href) || /pdf/i.test(texto)) {
      ver(href);
    }
  }

  return candidatos;
}

const MAX_HTML_BYTES = 2 * 1024 * 1024;

// Busca o PDF real por trás de uma página HTML. Devolve null quando não há.
export async function descobrirPdfUrl(paginaUrl: string, signal?: AbortSignal): Promise<string | null> {
  let status: number;
  let headers: Headers;
  let corpo: ReadableStream<Uint8Array> | null;
  try {
    ({ status, headers, body: corpo } = await fetchPinned(paginaUrl, {
      timeoutMs: config.proxyTimeoutMs,
      signal,
    }));
  } catch {
    return null;
  }
  if (status < 200 || status >= 300 || !corpo) return null;
  if (!(headers.get("content-type") ?? "").toLowerCase().includes("text/html")) return null;

  const reader = corpo.getReader();
  const chunks: Uint8Array[] = [];
  let recebido = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        recebido += value.byteLength;
        if (recebido > MAX_HTML_BYTES) return null;
        chunks.push(value);
      }
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
    void corpo.cancel().catch(() => undefined);
  }

  const total = chunks.reduce((soma, c) => soma + c.byteLength, 0);
  const unido = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    unido.set(c, pos);
    pos += c.byteLength;
  }
  const html = new TextDecoder("utf-8", { fatal: false }).decode(unido);
  const pagina = paginaUrl.toLowerCase();
  return extrairCandidatosPdf(html, paginaUrl).find((url) => url.toLowerCase() !== pagina) ?? null;
}
