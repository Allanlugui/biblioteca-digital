import { describe, expect, it } from "vitest";
import { interpretarBusca } from "@/lib/linguagem-natural";

describe("interpretarBusca", () => {
  it("extrai 'depois de YYYY'", () => {
    const r = interpretarBusca("inteligência artificial depois de 2023");
    expect(r.consulta).toBe("inteligência artificial");
    expect(r.anoDe).toBe(2024);
    expect(r.anoAte).toBeUndefined();
    expect(r.descricao).toContain("depois de 2023");
  });

  it("extrai intervalo 'entre A e B'", () => {
    const r = interpretarBusca("vacinas entre 2020 e 2022");
    expect(r).toMatchObject({ consulta: "vacinas", anoDe: 2020, anoAte: 2022 });
  });

  it("extrai 'últimos N anos' relativo ao ano atual", () => {
    const atual = new Date().getFullYear();
    const r = interpretarBusca("clima últimos 5 anos");
    expect(r.anoDe).toBe(atual - 4);
    expect(r.anoAte).toBe(atual);
  });

  it("extrai 'desde' e 'antes de'", () => {
    expect(interpretarBusca("redes desde 2020").anoDe).toBe(2020);
    expect(interpretarBusca("redes antes de 2020").anoAte).toBe(2019);
  });

  it("ignora padrões inválidos e tema curto", () => {
    expect(interpretarBusca("computação quântica").descricao).toBeUndefined();
    expect(interpretarBusca("ia depois de 99").descricao).toBeUndefined();
    const curto = interpretarBusca("depois de 2023");
    expect(curto.descricao).toBeUndefined();
    expect(curto.consulta).toBe("depois de 2023");
  });
});
