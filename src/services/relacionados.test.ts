import { describe, expect, it } from "vitest";
import { consultaRelacionada } from "@/services/relacionados";
import type { Documento } from "@/types";

const DOC: Documento = {
  id: "arxiv_1",
  titulo: "Quantum computing with trapped ions",
  autores: [],
  fonte: "arxiv",
  urlPdf: null,
  urlPagina: null,
  descricao: null,
  dataPublicacao: null,
  tamanhoBytes: null,
  doi: null,
  citacoes: null,
  assuntos: ["Quantum Physics"],
  idioma: null,
  tipo: null,
  arxivId: null,
  disponivelEm: [],
};

describe("consultaRelacionada", () => {
  it("combina assuntos e palavras do título", () => {
    const consulta = consultaRelacionada(DOC);
    expect(consulta).toContain("quantum");
    expect(consulta).toContain("trapped");
    expect(consulta.split(" ").length).toBeLessThanOrEqual(8);
  });

  it("vazio quando não há termos", () => {
    expect(consultaRelacionada({ ...DOC, titulo: "De re", assuntos: [] })).toBe("");
  });
});
