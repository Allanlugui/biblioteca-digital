import { describe, expect, it } from "vitest";
import { buscaQuerySchema } from "@/schemas/busca";
import { documentoIdSchema } from "@/schemas/documento";
import { proxyQuerySchema } from "@/schemas/proxy";

describe("buscaQuerySchema", () => {
  it("aceita termo válido e aplica limite padrão ausente", () => {
    const parsed = buscaQuerySchema.safeParse({ q: "quantum" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.q).toBe("quantum");
      expect(parsed.data.limite).toBeUndefined();
    }
  });

  it("rejeita termo curto, ausente ou longo demais", () => {
    expect(buscaQuerySchema.safeParse({ q: "a" }).success).toBe(false);
    expect(buscaQuerySchema.safeParse({ q: null }).success).toBe(false);
    expect(buscaQuerySchema.safeParse({ q: "x".repeat(201) }).success).toBe(false);
  });

  it("converte limite string e rejeita fora da faixa", () => {
    const parsed = buscaQuerySchema.safeParse({ q: "quantum", limite: "10" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.limite).toBe(10);
    expect(buscaQuerySchema.safeParse({ q: "quantum", limite: "0" }).success).toBe(false);
    expect(buscaQuerySchema.safeParse({ q: "quantum", limite: "51" }).success).toBe(false);
    expect(buscaQuerySchema.safeParse({ q: "quantum", limite: "abc" }).success).toBe(false);
  });

  it("converte soPdf explícito", () => {
    expect(buscaQuerySchema.safeParse({ q: "quantum", soPdf: "true" }).data?.soPdf).toBe(true);
    expect(buscaQuerySchema.safeParse({ q: "quantum", soPdf: "false" }).data?.soPdf).toBe(false);
    expect(buscaQuerySchema.safeParse({ q: "quantum" }).data?.soPdf).toBeUndefined();
  });

  it("aceita filtros válidos e aplica padrões ausentes", () => {
    const parsed = buscaQuerySchema.safeParse({
      q: "quantum",
      pagina: "2",
      anoDe: "2020",
      anoAte: "2024",
      fonte: ["openalex", "arxiv"],
      tipo: "article",
      soPdf: "true",
      ordem: "citados",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pagina).toBe(2);
      expect(parsed.data.fonte).toEqual(["openalex", "arxiv"]);
      expect(parsed.data.soPdf).toBe(true);
    }
    expect(buscaQuerySchema.safeParse({ q: "quantum" }).success).toBe(true);
  });

  it("rejeita filtros inválidos", () => {
    expect(buscaQuerySchema.safeParse({ q: "quantum", pagina: "0" }).success).toBe(false);
    expect(buscaQuerySchema.safeParse({ q: "quantum", anoDe: "20" }).success).toBe(false);
    expect(buscaQuerySchema.safeParse({ q: "quantum", anoDe: "2024", anoAte: "2020" }).success).toBe(false);
    expect(buscaQuerySchema.safeParse({ q: "quantum", fonte: "inexistente" }).success).toBe(false);
    expect(buscaQuerySchema.safeParse({ q: "quantum", ordem: "alfabetica" }).success).toBe(false);
  });
});

describe("documentoIdSchema", () => {
  it("aceita ids no formato fonte_externalId", () => {
    expect(documentoIdSchema.safeParse("arxiv_2211.02350v1").success).toBe(true);
    expect(documentoIdSchema.safeParse("openalex_W2781738013").success).toBe(true);
  });

  it("rejeita ids com caracteres inseguros", () => {
    expect(documentoIdSchema.safeParse("../../../etc/passwd").success).toBe(false);
    expect(documentoIdSchema.safeParse("id com espaço").success).toBe(false);
    expect(documentoIdSchema.safeParse("").success).toBe(false);
  });
});

describe("proxyQuerySchema", () => {
  it("aceita URL https válida", () => {
    expect(proxyQuerySchema.safeParse({ url: "https://arxiv.org/pdf/1706.03762v5" }).success).toBe(
      true,
    );
  });

  it("rejeita URL inválida ou ausente", () => {
    expect(proxyQuerySchema.safeParse({ url: "não-é-url" }).success).toBe(false);
    expect(proxyQuerySchema.safeParse({ url: null }).success).toBe(false);
  });
});