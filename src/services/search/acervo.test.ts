import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ criarClienteAdmin: () => null }));

import { acervoProvider, linhaParaDocumento } from "@/services/search/acervo";

const LINHA = {
  id: "gutenberg_1",
  fonte: "gutenberg",
  titulo: "Dom Casmurro",
  autores: ["Machado de Assis"],
  descricao: "Romance",
  data_publicacao: "1899",
  url_pagina: null,
  doi: null,
  citacoes: null,
  assuntos: ["Literatura"],
  idioma: "pt",
  tipo: "book",
  storage_path: "drive:abc",
};

describe("linhaParaDocumento", () => {
  it("mapeia linha arquivada com caminho interno", () => {
    const doc = linhaParaDocumento(LINHA);
    expect(doc?.id).toBe("gutenberg_1");
    expect(doc?.fonte).toBe("gutenberg");
    expect(doc?.urlPdf).toBe("/api/arquivo/gutenberg_1/bytes");
    expect(doc?.disponivelEm).toEqual([{ fonte: "gutenberg", id: "gutenberg_1" }]);
  });

  it("rejeita sem id, título ou arquivo", () => {
    expect(linhaParaDocumento({ ...LINHA, titulo: 5 })).toBeNull();
    expect(linhaParaDocumento({ ...LINHA, storage_path: null })).toBeNull();
  });
});

describe("acervoProvider", () => {
  it("sem acervo configurado retorna vazio e nulo", async () => {
    await expect(acervoProvider.buscar("x", 10)).resolves.toEqual([]);
    await expect(acervoProvider.buscarPorId("1")).resolves.toBeNull();
  });
});
