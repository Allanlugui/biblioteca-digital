import type { Fonte } from "@/types";

export const nomesFontes: Record<Fonte, string> = {
  openalex: "OpenAlex",
  arxiv: "arXiv",
  doaj: "DOAJ",
  "google-books": "Google Books",
  "semantic-scholar": "Semantic Scholar",
  web: "Web",
};

export function formatarData(valor: string | null): string {
  if (!valor) return "Data não informada";
  const partes = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(valor);
  if (!partes) return "Data não informada";
  const [, ano, mes, dia] = partes;
  if (!mes) return ano;
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const nome = meses[Number(mes) - 1];
  if (!nome) return "Data não informada";
  return dia ? `${Number(dia)} de ${nome} de ${ano}` : `${nome} de ${ano}`;
}

export function linkExternoSeguro(valor: string | null): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
