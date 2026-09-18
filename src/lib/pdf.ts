import { config } from "./config";
import { descobrirPdfUrl } from "./descoberta-pdf";
import { fetchPinned, PINNED_TIMEOUT_CODE } from "./pinned-fetch";
import { UrlGuardError } from "./url-guard";

export type PdfErrorCode =
  | "UPSTREAM_ERROR"
  | "INVALID_MEDIA_TYPE"
  | "FILE_TOO_LARGE"
  | "TIMEOUT";

export interface PdfErrorMapping {
  code: PdfErrorCode;
  message: string;
  status: number;
}

export class PdfError extends Error {
  readonly code: PdfErrorCode;

  constructor(code: PdfErrorCode, message: string) {
    super(message);
    this.name = "PdfError";
    this.code = code;
  }

  toFail(): PdfErrorMapping {
    const statusByCode: Record<PdfErrorCode, number> = {
      UPSTREAM_ERROR: 502,
      INVALID_MEDIA_TYPE: 502,
      FILE_TOO_LARGE: 413,
      TIMEOUT: 504,
    };
    return { code: this.code, message: this.message, status: statusByCode[this.code] };
  }
}

export type PdfDownload = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number | null;
  filename: string;
};

const PDF_MIME_TYPES = ["application/pdf", "application/x-pdf", "application/octet-stream"];

function isPdfContentType(contentType: string): boolean {
  const essence = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return PDF_MIME_TYPES.includes(essence);
}

function parseContentLength(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

export function streamPdfValidado(
  body: ReadableStream<Uint8Array>,
  maxSizeBytes: number,
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let received = 0;
  let pendente: Uint8Array[] = [];
  let pendenteLen = 0;
  let magicOk = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        let result;
        try {
          result = await reader.read();
        } catch {
          controller.error(
            new PdfError("UPSTREAM_ERROR", "Falha ao ler o conteúdo do arquivo de origem."),
          );
          return;
        }
        if (result.done) {
          if (!magicOk) {
            controller.error(
              new PdfError(
                "INVALID_MEDIA_TYPE",
                "O conteúdo retornado pela origem não é um PDF válido.",
              ),
            );
            return;
          }
          controller.close();
          return;
        }
        received += result.value.byteLength;
        if (received > maxSizeBytes) {
          reader.cancel().catch(() => undefined);
          controller.error(new PdfError("FILE_TOO_LARGE", "O arquivo excede o tamanho máximo permitido."));
          return;
        }
        if (!magicOk) {
          pendente.push(result.value);
          pendenteLen += result.value.byteLength;
          if (pendenteLen < PDF_MAGIC.length) continue;
          magicOk = true;
          const inicio = new Uint8Array(PDF_MAGIC.length);
          let copiados = 0;
          for (const chunk of pendente) {
            const falta = PDF_MAGIC.length - copiados;
            if (falta <= 0) break;
            inicio.set(chunk.subarray(0, falta), copiados);
            copiados += Math.min(falta, chunk.byteLength);
          }
          const valido = PDF_MAGIC.every((byte, indice) => inicio[indice] === byte);
          if (!valido) {
            reader.cancel().catch(() => undefined);
            controller.error(
              new PdfError(
                "INVALID_MEDIA_TYPE",
                "O conteúdo retornado pela origem não é um PDF válido.",
              ),
            );
            return;
          }
          for (const chunk of pendente) controller.enqueue(chunk);
          pendente = [];
          return;
        }
        controller.enqueue(result.value);
        return;
      }
    },
    cancel() {
      reader.cancel().catch(() => undefined);
    },
  });
}

function filenameFromUrl(url: string): string {
  try {
    const lastSegment = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    if (/\.pdf$/i.test(lastSegment)) {
      return lastSegment.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "documento.pdf";
    }
  } catch {
    // URL inválida não deve quebrar a geração do nome do arquivo.
  }
  return "documento.pdf";
}

export async function fetchPdf(url: string): Promise<PdfDownload> {  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new PdfError("TIMEOUT", "Tempo de espera pela origem excedido.")),
    config.proxyTimeoutMs,
  );

  try {
    let status: number;
    let headers: Headers;
    let rawBody: ReadableStream<Uint8Array> | null;
    try {
      ({ status, headers, body: rawBody } = await fetchPinned(url, {
        timeoutMs: config.proxyTimeoutMs,
        signal: controller.signal,
      }));
    } catch (error) {
      if (error instanceof PdfError) throw error;
      if (error instanceof UrlGuardError) {
        throw new PdfError("UPSTREAM_ERROR", "Destino do redirecionamento não é permitido.");
      }
      if ((error as NodeJS.ErrnoException)?.code === PINNED_TIMEOUT_CODE) {
        throw new PdfError("TIMEOUT", "Tempo de espera pela origem excedido.");
      }
      throw new PdfError("UPSTREAM_ERROR", "Falha ao acessar a origem do arquivo.");
    }

    if (status < 200 || status >= 300 || !rawBody) {
      throw new PdfError("UPSTREAM_ERROR", `A origem respondeu HTTP ${status}.`);
    }

    const contentType = headers.get("content-type") ?? "";
    if (!isPdfContentType(contentType)) {
      throw new PdfError("INVALID_MEDIA_TYPE", "O conteúdo retornado pela origem não é um PDF válido.");
    }

    const contentLength = parseContentLength(headers.get("content-length"));
    if (contentLength !== null && contentLength > config.proxyMaxSizeBytes) {
      throw new PdfError("FILE_TOO_LARGE", "O arquivo excede o tamanho máximo permitido.");
    }

    return {
      body: streamPdfValidado(rawBody, config.proxyMaxSizeBytes),
      contentType,
      contentLength,
      filename: filenameFromUrl(url),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Tenta o PDF direto; se a origem devolver página HTML, descobre o arquivo
// real (citation_pdf_url/âncora) e tenta uma vez. Mesmas validações no final.
export async function fetchPdfResiliente(url: string): Promise<PdfDownload> {
  try {
    return await fetchPdf(url);
  } catch (error) {
    if (!(error instanceof PdfError) || error.code !== "INVALID_MEDIA_TYPE") throw error;
    const descoberto = await descobrirPdfUrl(url);
    if (!descoberto) throw error;
    return fetchPdf(descoberto);
  }
}