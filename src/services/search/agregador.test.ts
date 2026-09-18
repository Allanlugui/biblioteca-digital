import { describe, expect, it } from "vitest";
import { aplicarFiltros, deduplicar, normalizarTitulo, ordenar, ordenarPor } from "@/services/search/agregador";
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
    doi: null,
    citacoes: null,
    assuntos: [],
    idioma: null,
    tipo: null,
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

describe("aplicarFiltros", () => {
  const docs = [
    doc({ id: "a", titulo: "Antigo com PDF", urlPdf: "https://a/x.pdf", dataPublicacao: "2019-05-01", tipo: "article" }),
    doc({ id: "b", titulo: "Novo sem PDF", dataPublicacao: "2024-01-15", tipo: "preprint" }),
    doc({ id: "c", titulo: "Sem data com PDF", urlPdf: "https://a/y.pdf", tipo: "article" }),
  ];

  it("filtra por PDF, tipo e período", () => {
    expect(aplicarFiltros(docs, { soPdf: true }).map((d) => d.id)).toEqual(["a", "c"]);
    expect(aplicarFiltros(docs, { tipo: "preprint" }).map((d) => d.id)).toEqual(["b"]);
    expect(aplicarFiltros(docs, { anoDe: 2020 }).map((d) => d.id)).toEqual(["b"]);
    expect(aplicarFiltros(docs, { anoAte: 2020 }).map((d) => d.id)).toEqual(["a"]);
    expect(aplicarFiltros(docs, { soPdf: true, tipo: "article", anoDe: 2018, anoAte: 2020 }).map((d) => d.id)).toEqual(["a"]);
  });
});

describe("ordenarPor", () => {
  const docs = [
    doc({ id: "a", titulo: "Antigo citado", dataPublicacao: "2019-01-01", citacoes: 500 }),
    doc({ id: "b", titulo: "Novo pouco citado", dataPublicacao: "2024-06-01", citacoes: 3 }),
    doc({ id: "c", titulo: "Sem dados" }),
  ];

  it("ordena por recentes e citados, nulos por último", () => {
    expect(ordenarPor(docs, "q", "recentes").map((d) => d.id)).toEqual(["b", "a", "c"]);
    expect(ordenarPor(docs, "q", "citados").map((d) => d.id)).toEqual(["a", "b", "c"]);
    expect(ordenarPor(docs, "q", "relevancia")).toEqual(ordenar(docs, "q"));
  });
});