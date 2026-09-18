import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fail, formatZodErrors, ok } from "@/lib/api";

describe("ok", () => {
  it("retorna o envelope de sucesso com status 200", async () => {
    const resposta = ok({ consulta: "q" });
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ data: { consulta: "q" }, error: null });
  });
});

describe("fail", () => {
  it("retorna o envelope de erro com status e código", async () => {
    const resposta = fail("NOT_FOUND", "Documento não encontrado.", 404);
    expect(resposta.status).toBe(404);
    expect(await resposta.json()).toEqual({
      data: null,
      error: { code: "NOT_FOUND", message: "Documento não encontrado." },
    });
  });

  it("inclui details quando informado", async () => {
    const resposta = fail("VALIDATION_ERROR", "Inválido.", 400, { issues: [] });
    const corpo = (await resposta.json()) as {
      error: { details: unknown };
    };
    expect(corpo.error.details).toEqual({ issues: [] });
  });
});

describe("formatZodErrors", () => {
  it("resume issues com path e mensagem", () => {
    const parsed = z.object({ q: z.string().min(2) }).safeParse({ q: "a" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const formato = formatZodErrors(parsed.error) as {
      issues: { path: string; message: string }[];
    };
    expect(formato.issues).toHaveLength(1);
    expect(formato.issues[0]?.path).toBe("q");
    expect(typeof formato.issues[0]?.message).toBe("string");
  });
});