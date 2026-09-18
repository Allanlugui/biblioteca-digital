import { describe, expect, it } from "vitest";
import { colecaoIdSchema, colecaoItemPostSchema, colecaoPostSchema } from "@/schemas/colecao";

describe("colecaoPostSchema", () => {
  it("aceita nome válido e rejeita vazio ou longo", () => {
    expect(colecaoPostSchema.safeParse({ nome: " IA " }).success).toBe(true);
    expect(colecaoPostSchema.safeParse({ nome: "" }).success).toBe(false);
    expect(colecaoPostSchema.safeParse({ nome: "x".repeat(81) }).success).toBe(false);
    expect(colecaoPostSchema.safeParse({}).success).toBe(false);
  });
});

describe("colecaoIdSchema", () => {
  it("aceita uuid e rejeita outros formatos", () => {
    expect(colecaoIdSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
    expect(colecaoIdSchema.safeParse("abc").success).toBe(false);
  });
});

describe("colecaoItemPostSchema", () => {
  it("aceita documento válido", () => {
    expect(colecaoItemPostSchema.safeParse({ documento: "arxiv_1234.5678" }).success).toBe(true);
    expect(colecaoItemPostSchema.safeParse({ documento: "x/y" }).success).toBe(false);
  });
});
