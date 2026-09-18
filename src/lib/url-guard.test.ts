import { describe, expect, it } from "vitest";
import { assertPublicHttpsUrl, UrlGuardError } from "@/lib/url-guard";

async function codigoDe(rawUrl: string): Promise<string> {
  try {
    await assertPublicHttpsUrl(rawUrl);
    return "ALLOWED";
  } catch (error) {
    expect(error).toBeInstanceOf(UrlGuardError);
    return (error as UrlGuardError).code;
  }
}

describe("assertPublicHttpsUrl", () => {
  it("rejeita protocolo não-https", async () => {
    await expect(codigoDe("http://localhost")).resolves.toBe("INVALID_URL");
  });

  it("rejeita credenciais na URL", async () => {
    await expect(codigoDe("https://user:pass@example.com/x.pdf")).resolves.toBe("INVALID_URL");
  });

  it("rejeita porta diferente de 443", async () => {
    await expect(codigoDe("https://example.com:8443/x.pdf")).resolves.toBe("INVALID_URL");
  });

  it("bloqueia localhost e sufixos internos", async () => {
    await expect(codigoDe("https://localhost/x.pdf")).resolves.toBe("DESTINATION_BLOCKED");
    await expect(codigoDe("https://servidor.internal/x.pdf")).resolves.toBe("DESTINATION_BLOCKED");
    await expect(codigoDe("https://servidor.local/x.pdf")).resolves.toBe("DESTINATION_BLOCKED");
  });

  it("bloqueia IPs literais privados", async () => {
    await expect(codigoDe("https://127.0.0.1/x.pdf")).resolves.toBe("DESTINATION_BLOCKED");
    await expect(codigoDe("https://10.0.0.1/x.pdf")).resolves.toBe("DESTINATION_BLOCKED");
    await expect(codigoDe("https://192.168.1.1/x.pdf")).resolves.toBe("DESTINATION_BLOCKED");
    await expect(codigoDe("https://169.254.169.254/x.pdf")).resolves.toBe("DESTINATION_BLOCKED");
    await expect(codigoDe("https://[::1]/x.pdf")).resolves.toBe("DESTINATION_BLOCKED");
    await expect(codigoDe("https://[fc00::1]/x.pdf")).resolves.toBe("DESTINATION_BLOCKED");
  });

  it("permite IP público literal sem DNS", async () => {
    const resultado = await assertPublicHttpsUrl("https://8.8.8.8/x.pdf");
    expect(resultado.addresses).toEqual([{ address: "8.8.8.8", family: 4 }]);
  });
});