import { afterEach, describe, expect, it, vi } from "vitest";
import { semanticScholarProvider } from "@/services/search/semanticscholar";

afterEach(() => {
  vi.unstubAllGlobals();
});

function respostaJson(data: unknown) {
  return { ok: true, text: async () => JSON.stringify(data) };
}

const ARTIGO = {
  paperId: "a".repeat(40),
  title: "Quantum Test",
  abstract: "Resumo do artigo",
  year: 2023,
  publicationDate: "2023-05-01",
  authors: [{ name: "Ada Lovelace" }],
  openAccessPdf: { url: "http://x.org/a.pdf", status: "GOLD" },
  url: "https://www.semanticscholar.org/paper/x",
};

describe("semanticScholarProvider", () => {
  it("mapeia a busca com upgrade https do PDF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respostaJson({ data: [ARTIGO] })),
    );
    const docs = await semanticScholarProvider.buscar("quantum", 10);
    expect(docs).toHaveLength(1);
    expect(docs[0]?.id).toBe(`semantic-scholar_${"a".repeat(40)}`);
    expect(docs[0]?.fonte).toBe("semantic-scholar");
    expect(docs[0]?.urlPdf).toBe("https://x.org/a.pdf");
    expect(docs[0]?.dataPublicacao).toBe("2023-05-01");
  });

  it("descarta entradas inválidas sem quebrar a busca", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respostaJson({ data: [{ paperId: "x", title: null }] })),
    );
    await expect(semanticScholarProvider.buscar("q", 5)).resolves.toEqual([]);
  });

  it("buscarPorId rejeita id fora do formato sem rede", async () => {
    const fetchSpy = vi.fn(async () => respostaJson({}));
    vi.stubGlobal("fetch", fetchSpy);
    await expect(semanticScholarProvider.buscarPorId("nao-hex")).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
