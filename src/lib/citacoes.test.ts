import { describe, expect, it } from "vitest";
import { gerarCitacao } from "@/lib/citacoes";
import type { Documento } from "@/types";

const DOC: Documento = {
  id: "openalex_W1",
  titulo: "Computação quântica aplicada",
  autores: ["Ada Lovelace", "Alan Turing"],
  fonte: "openalex",
  urlPdf: "https://a/x.pdf",
  urlPagina: "https://openalex.org/W1",
  descricao: null,
  dataPublicacao: "2023-05-01",
  tamanhoBytes: null,
  doi: "10.1/abc",
  citacoes: null,
  assuntos: [],
  idioma: "pt",
  tipo: "article",
  arxivId: null,
  disponivelEm: [],
};

describe("gerarCitacao", () => {
  it("ABNT com sobrenome em caixa alta e DOI", () => {
    const citacao = gerarCitacao(DOC, "abnt");
    expect(citacao).toContain("LOVELACE, Ada");
    expect(citacao).toContain("TURING, Alan");
    expect(citacao).toContain("https://doi.org/10.1/abc");
    expect(citacao).toContain("2023");
  });

  it("APA com iniciais e ano entre parênteses", () => {
    const citacao = gerarCitacao(DOC, "apa");
    expect(citacao).toContain("Lovelace, A.");
    expect(citacao).toContain("(2023).");
  });

  it("MLA e Chicago com título entre aspas", () => {
    expect(gerarCitacao(DOC, "mla")).toContain("“Computação quântica aplicada.”");
    expect(gerarCitacao(DOC, "chicago")).toContain("2023. “Computação quântica aplicada.”");
  });

  it("BibTeX e RIS estruturados", () => {
    const bib = gerarCitacao(DOC, "bibtex");
    expect(bib).toMatch(/^@misc\{lovelace2023,$/m);
    expect(bib).toContain("author = {Lovelace, Ada and Turing, Alan}");
    const ris = gerarCitacao(DOC, "ris");
    expect(ris).toContain("TY  - JOUR");
    expect(ris).toContain("AU  - Lovelace, Ada");
    expect(ris).toContain("DO  - 10.1/abc");
    expect(ris).toContain("ER  - ");
  });

  it("sem autores nem data usa título e s.d.", () => {
    const doc: Documento = { ...DOC, autores: [], dataPublicacao: null, doi: null, urlPagina: null, urlPdf: null };
    expect(gerarCitacao(doc, "abnt")).toContain("s.d.");
    expect(gerarCitacao(doc, "apa")).toContain("(s.d.).");
  });
});
