import { describe, expect, it } from "vitest";
import { deduplicar, normalizarTitulo, ordenar } from "@/services/search/agregador";
import type { Documento } from "@/types";

function doc(parcial: Partial<Documento> & { id: string; titulo: string }): Documento {
  return {
    autores: [],
    fonte: "arxiv",
    urlPdf: null,
    urlPagina: null,
    descricao: null,
    dataPublicacao: null,
    tamanhoBytes: null,
    ...parcial,
  };
}

describe("normalizarTitulo", () => {
  it("remove acentos, pontuação e caixa", () => {
    expect(normalizarTitulo("Comunicação Quântica: uma Introdução!")).toBe(
      "comunicacao quantica uma introducao",
    );
  });
});

describe("deduplicar", () => {
  it("remove títulos equivalentes de fontes diferentes", () => {
    const docs = [
      doc({ id: "openalex_W1", titulo: "Quantum Computing", urlPdf: "https://a/x.pdf" }),
      doc({ id: "arxiv_1", titulo: "quantum computing!", urlPdf: "https://b/y.pdf" }),
    ];
    expect(deduplicar(docs).map((d) => d.id)).toEqual(["openalex_W1"]);
  });

  it("remove PDFs idênticos mesmo com títulos diferentes", () => {
    const docs = [
      doc({ id: "openalex_W1", titulo: "Título A", urlPdf: "https://a/x.pdf" }),
      doc({ id: "doaj_1", titulo: "Título B", urlPdf: "https://a/x.pdf" }),
    ];
    expect(deduplicar(docs).map((d) => d.id)).toEqual(["openalex_W1"]);
  });

  it("mantém documentos distintos", () => {
    const docs = [
      doc({ id: "openalex_W1", titulo: "Título A" }),
      doc({ id: "arxiv_1", titulo: "Título B" }),
    ];
    expect(deduplicar(docs)).toHaveLength(2);
  });
});

describe("ordenar", () => {
  it("prioriza PDF e termos da consulta no título", () => {
    const semPdf = doc({ id: "a", titulo: "quantum computing avançado" });
    const comPdf = doc({ id: "b", titulo: "outro assunto", urlPdf: "https://a/x.pdf" });
    const comPdfETermo = doc({
      id: "c",
      titulo: "quantum computing aplicado",
      urlPdf: "https://a/y.pdf",
    });
    expect(ordenar([semPdf, comPdf, comPdfETermo], "quantum").map((d) => d.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });
});