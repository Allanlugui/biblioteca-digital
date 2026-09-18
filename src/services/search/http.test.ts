import { describe, expect, it } from "vitest";
import { paraHttps, somenteHttp } from "@/services/search/http";

describe("somenteHttp", () => {
  it("aceita http e https", () => {
    expect(somenteHttp("http://a/x.pdf")).toBe("http://a/x.pdf");
    expect(somenteHttp("https://a/x.pdf")).toBe("https://a/x.pdf");
  });

  it("rejeita nulo, vazio e outros schemes", () => {
    expect(somenteHttp(null)).toBeNull();
    expect(somenteHttp(undefined)).toBeNull();
    expect(somenteHttp("ftp://a/x.pdf")).toBeNull();
    expect(somenteHttp("javascript:alert(1)")).toBeNull();
  });
});

describe("paraHttps", () => {
  it("converte http em https preservando o restante", () => {
    expect(paraHttps("http://www.teses.usp.br/x.pdf")).toBe("https://www.teses.usp.br/x.pdf");
  });

  it("mantém https como está", () => {
    expect(paraHttps("https://a/x.pdf")).toBe("https://a/x.pdf");
  });

  it("rejeita nulo e schemes não-http", () => {
    expect(paraHttps(null)).toBeNull();
    expect(paraHttps("ftp://a/x.pdf")).toBeNull();
    expect(paraHttps("javascript:alert(1)")).toBeNull();
  });
});
