import { describe, expect, it } from "vitest";
import { lerCredencial } from "@/lib/armazenamento/google-auth";
import { selecionarBackend } from "@/lib/armazenamento/indice";
import { ehDrivePath, idDoDrivePath, nomeParaHash } from "@/lib/armazenamento/tipos";

describe("caminhos de armazenamento", () => {
  it("identifica refs do Drive e nomes por hash", () => {
    expect(ehDrivePath("drive:abc")).toBe(true);
    expect(ehDrivePath("pdfs/x.pdf")).toBe(false);
    expect(idDoDrivePath("drive:abc")).toBe("abc");
    expect(idDoDrivePath("pdfs/x.pdf")).toBeNull();
    expect(nomeParaHash("a".repeat(64))).toBe(`${"a".repeat(64)}.pdf`);
  });
});

describe("lerCredencial", () => {
  it("rejeita vazio e JSON inválido", () => {
    expect(lerCredencial(undefined)).toBeNull();
    expect(lerCredencial("")).toBeNull();
    expect(lerCredencial("{invalido")).toBeNull();
    expect(lerCredencial(JSON.stringify({ client_email: "a@b" }))).toBeNull();
    expect(
      lerCredencial(JSON.stringify({ client_email: "a@b", private_key: "k" })),
    ).toEqual({ client_email: "a@b", private_key: "k" });
  });
});

describe("selecionarBackend", () => {
  it("usa supabase por padrão e com override explícito", () => {
    expect(selecionarBackend().nome).toBe("supabase");
    expect(selecionarBackend("supabase").nome).toBe("supabase");
  });

  it("cai para supabase quando o Drive não está configurado", () => {
    // Sem credenciais no ambiente de teste, mesmo forçando drive.
    expect(selecionarBackend("drive").nome).toBe("supabase");
  });
});
