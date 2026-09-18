import { describe, expect, it } from "vitest";
import { limparLista, normalizarArxivId, normalizarContagem, normalizarDoi, normalizarIdioma } from "@/services/search/normalizar";

describe("normalizarDoi", () => {
  it("extrai o núcleo de URLs e prefixos", () => {
    expect(normalizarDoi("https://doi.org/10.1088/0953-8984/21/39/395502")).toBe("10.1088/0953-8984/21/39/395502");
    expect(normalizarDoi("doi:10.3390/fi16110412")).toBe("10.3390/fi16110412");
    expect(normalizarDoi("10.3390/FI16110412")).toBe("10.3390/fi16110412");
  });

  it("rejeita nulo, vazio e formatos inválidos", () => {
    expect(normalizarDoi(null)).toBeNull();
    expect(normalizarDoi("")).toBeNull();
    expect(normalizarDoi("não-é-doi")).toBeNull();
    expect(normalizarDoi("https://example.com/10.1/x")).toBeNull();
  });
});

describe("normalizarIdioma", () => {
  it("padroniza códigos", () => {
    expect(normalizarIdioma("EN")).toBe("en");
    expect(normalizarIdioma("pt-BR")).toBe("pt-br");
    expect(normalizarIdioma(null)).toBeNull();
    expect(normalizarIdioma("xx!")).toBeNull();
  });
});

describe("limparLista", () => {
  it("remove vazios e duplicados, respeita o teto", () => {
    expect(limparLista(["IA", null, " ia ", "", "Redes", undefined], 2)).toEqual(["IA", "Redes"]);
  });
});

describe("normalizarContagem", () => {
  it("aceita inteiros não negativos", () => {
    expect(normalizarContagem(29364)).toBe(29364);
    expect(normalizarContagem(0)).toBe(0);
    expect(normalizarContagem(-1)).toBeNull();
    expect(normalizarContagem(1.5)).toBeNull();
    expect(normalizarContagem(null)).toBeNull();
  });
});

describe("normalizarArxivId", () => {
  it("canoniza sem versão e com URLs", () => {
    expect(normalizarArxivId("2211.02350v1")).toBe("2211.02350");
    expect(normalizarArxivId("https://arxiv.org/abs/2211.02350v2")).toBe("2211.02350");
    expect(normalizarArxivId("hep-ex/0307015v1")).toBe("hep-ex/0307015");
    expect(normalizarArxivId(null)).toBeNull();
    expect(normalizarArxivId("não-é-id")).toBeNull();
  });
});
