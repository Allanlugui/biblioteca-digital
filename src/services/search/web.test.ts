import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "@/lib/config";

vi.mock("@/lib/supabase/admin", () => ({ criarClienteAdmin: () => null }));

import { idParaLink, webDisponivel, webProvider } from "@/services/search/web";

const CHAVES = { api: config.googleSearchApiKey, cx: config.googleSearchCx };

beforeEach(() => {
  config.googleSearchApiKey = "chave-teste";
  config.googleSearchCx = "cx-teste";
});

afterEach(() => {
  config.googleSearchApiKey = CHAVES.api;
  config.googleSearchCx = CHAVES.cx;
  vi.unstubAllGlobals();
});

const ITENS = [
  { title: "Guia PDF", link: "http://exemplo.org/guia.pdf", snippet: "Um guia", mime: "application/pdf", fileFormat: "PDF/Adobe Acrobat" },
  { title: "Página comum", link: "https://exemplo.org/artigo", snippet: "HTML", mime: "text/html", fileFormat: null },
  { title: null, link: "https://exemplo.org/outro.pdf", snippet: null, mime: null, fileFormat: null },
];

describe("webDisponivel", () => {
  it("verdadeiro com chave e cx", () => {
    expect(webDisponivel()).toBe(true);
  });
});

describe("webProvider", () => {
  it("inclui só PDFs, com id estável e https", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, text: async () => JSON.stringify({ items: ITENS }) })),
    );
    const docs = await webProvider.buscar("guia", 10);
    expect(docs).toHaveLength(1);
    expect(docs[0]?.id).toMatch(/^web_[0-9a-f]{32}$/);
    expect(docs[0]?.id).toBe(idParaLink("http://exemplo.org/guia.pdf"));
    expect(docs[0]?.fonte).toBe("web");
    expect(docs[0]?.urlPdf).toBe("https://exemplo.org/guia.pdf");
  });

  it("retorna vazio sem chave configurada", async () => {
    config.googleSearchApiKey = "";
    const spy = vi.fn(async () => ({ ok: true, text: async () => "{}" }));
    vi.stubGlobal("fetch", spy);
    await expect(webProvider.buscar("guia", 10)).resolves.toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("buscarPorId sem acervo retorna nulo", async () => {
    await expect(webProvider.buscarPorId("a".repeat(32))).resolves.toBeNull();
    await expect(webProvider.buscarPorId("invalido")).resolves.toBeNull();
  });
});
