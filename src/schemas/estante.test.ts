import { describe, expect, it } from "vitest";
import { estantePostSchema, progressoGetSchema, progressoPutSchema } from "@/schemas/estante";
import { normalizarTermo } from "@/services/historico";

describe("normalizarTermo", () => {
  it("padroniza caixa e espaços", () => {
    expect(normalizarTermo("  Quantum   COMPUTING ")).toBe("quantum computing");
  });
});

describe("estantePostSchema", () => {
  it("aceita id válido e rejeita vazio", () => {
    expect(estantePostSchema.safeParse({ id: "arxiv_1234.5678" }).success).toBe(true);
    expect(estantePostSchema.safeParse({ id: "http://x" }).success).toBe(false);
    expect(estantePostSchema.safeParse({}).success).toBe(false);
  });
});

describe("progressoPutSchema", () => {
  it("aceita página válida e rejeita fora dos limites", () => {
    expect(progressoPutSchema.safeParse({ documento: "arxiv_1", pagina: 12, total: 20 }).success).toBe(true);
    expect(progressoPutSchema.safeParse({ documento: "arxiv_1", pagina: 0 }).success).toBe(false);
    expect(progressoGetSchema.safeParse({ documento: "x/y" }).success).toBe(false);
  });
});
