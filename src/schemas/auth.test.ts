import { describe, expect, it } from "vitest";
import { cadastroSchema, loginSchema, recuperarSchema, redefinirSchema } from "@/schemas/auth";

describe("loginSchema", () => {
  it("aceita credenciais válidas", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", senha: "123456" }).success).toBe(true);
  });

  it("rejeita e-mail inválido e senha curta", () => {
    expect(loginSchema.safeParse({ email: "x", senha: "123456" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", senha: "123" }).success).toBe(false);
  });
});

describe("cadastroSchema", () => {
  it("exige confirmação igual", () => {
    const base = { nome: "Ada", email: "a@b.com", senha: "123456" };
    expect(cadastroSchema.safeParse({ ...base, confirmar: "123456" }).success).toBe(true);
    const parsed = cadastroSchema.safeParse({ ...base, confirmar: "outra" });
    expect(parsed.success).toBe(false);
  });
});

describe("recuperarSchema e redefinirSchema", () => {
  it("validam e-mail e confirmação", () => {
    expect(recuperarSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(recuperarSchema.safeParse({ email: "x" }).success).toBe(false);
    expect(redefinirSchema.safeParse({ senha: "123456", confirmar: "123456" }).success).toBe(true);
    expect(redefinirSchema.safeParse({ senha: "123456", confirmar: "x" }).success).toBe(false);
  });
});
