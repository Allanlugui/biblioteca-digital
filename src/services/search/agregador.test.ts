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
    arxivId: null,
    disponivelEm: [],
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
  it("não funde só por título curto sem identificadores (anti falso positivo)", () => {
    const docs = [
      doc({ id: "openalex_W1", titulo: "Quantum Computing", urlPdf: "https://a/x.pdf" }),
      doc({ id: "arxiv_1", titulo: "quantum computing!", urlPdf: "https://b/y.pdf" }),
    ];
    expect(deduplicar(docs).map((d) => d.id)).toEqual(["openalex_W1", "arxiv_1"]);
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

  it("funde pelo DOI e soma as fontes, preenchendo falhas", () => {
    const docs = [
      doc({ id: "openalex_W1", fonte: "openalex", titulo: "Mesma Obra", doi: "10.1/abc", citacoes: 10, urlPdf: null }),
      doc({ id: "doaj_1", fonte: "doaj", titulo: "Mesma Obra", doi: "10.1/abc", citacoes: null, urlPdf: "https://a/x.pdf" }),
    ];
    const [unico] = deduplicar(docs);
    expect(deduplicar(docs)).toHaveLength(1);
    expect(unico?.disponivelEm.map((f) => f.fonte)).toEqual(["openalex", "doaj"]);
    expect(unico?.citacoes).toBe(10);
    expect(unico?.urlPdf).toBe("https://a/x.pdf");
    expect(unico?.doi).toBe("10.1/abc");
  });

  it("funde pelo arXivId entre OpenAlex e arXiv", () => {
    const docs = [
      doc({ id: "openalex_W1", titulo: "Paper Quântico", arxivId: "2211.02350" }),
      doc({ id: "arxiv_2211.02350v1", titulo: "Paper Quântico Diferente?", arxivId: "2211.02350" }),
    ];
    const resultado = deduplicar(docs);
    expect(resultado).toHaveLength(1);
    expect(resultado[0]?.disponivelEm).toHaveLength(2);
  });

  it("não funde títulos curtos ou sem autor/ano (anti falso positivo)", () => {
    const docs = [
      doc({ id: "a", titulo: "Quantum" }),
      doc({ id: "b", titulo: "Quantum" }),
    ];
    expect(deduplicar(docs)).toHaveLength(2);
  });

  it("funde pela camada conservadora título+autor+ano", () => {
    const titulo = "Uma investigação profunda sobre computação quântica aplicada";
    const docs = [
      doc({ id: "a", titulo, autores: ["Ada Lovelace"], dataPublicacao: "2023-05-01" }),
      doc({ id: "b", titulo: titulo.toUpperCase(), autores: ["ada lovelace"], dataPublicacao: "2023-11-20" }),
    ];
    expect(deduplicar(docs)).toHaveLength(1);
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