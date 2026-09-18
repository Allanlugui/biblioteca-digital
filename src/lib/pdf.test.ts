import { describe, expect, it } from "vitest";
import { PdfError, streamPdfValidado } from "@/lib/pdf";

function streamDe(chunks: number[][]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new Uint8Array(chunk));
      }
      controller.close();
    },
  });
}

async function lerTudo(
  stream: ReadableStream<Uint8Array>,
): Promise<{ bytes: number[] } | { erro: unknown }> {
  const reader = stream.getReader();
  const saida: number[] = [];
  try {
    for (;;) {
      const lido = await reader.read();
      if (lido.done) return { bytes: saida };
      saida.push(...lido.value);
    }
  } catch (erro) {
    return { erro };
  }
}

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34];

describe("streamPdfValidado", () => {
  it("aceita conteúdo com magic %PDF-", async () => {
    const resultado = await lerTudo(streamPdfValidado(streamDe([PDF]), 1024));
    expect("bytes" in resultado && resultado.bytes).toEqual(PDF);
  });

  it("aceita magic dividido entre chunks", async () => {
    const resultado = await lerTudo(
      streamPdfValidado(streamDe([[0x25, 0x50], [0x44, 0x46, 0x2d, 0x31]]), 1024),
    );
    expect("bytes" in resultado && resultado.bytes).toEqual([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  });

  it("rejeita HTML com INVALID_MEDIA_TYPE", async () => {
    const resultado = await lerTudo(streamPdfValidado(streamDe([[0x3c, 0x68, 0x74, 0x6d, 0x6c]]), 1024));
    expect("erro" in resultado).toBe(true);
    if ("erro" in resultado) {
      expect(resultado.erro).toBeInstanceOf(PdfError);
      expect((resultado.erro as PdfError).code).toBe("INVALID_MEDIA_TYPE");
      expect((resultado.erro as PdfError).toFail().status).toBe(502);
    }
  });

  it("rejeita stream vazio ou curto demais", async () => {
    const resultado = await lerTudo(streamPdfValidado(streamDe([[0x25, 0x50]]), 1024));
    expect("erro" in resultado).toBe(true);
    if ("erro" in resultado) {
      expect((resultado.erro as PdfError).code).toBe("INVALID_MEDIA_TYPE");
    }
  });

  it("corta stream acima do limite com FILE_TOO_LARGE", async () => {
    const resultado = await lerTudo(streamPdfValidado(streamDe([PDF, new Array(20).fill(0x41)]), 10));
    expect("erro" in resultado).toBe(true);
    if ("erro" in resultado) {
      expect((resultado.erro as PdfError).code).toBe("FILE_TOO_LARGE");
      expect((resultado.erro as PdfError).toFail().status).toBe(413);
    }
  });
});