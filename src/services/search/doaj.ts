import { z } from "zod";
import type { Documento } from "@/types";
import { fetchTexto, paraHttps, ProviderError, somenteHttp } from "./http";
import { limparLista, normalizarDoi, normalizarIdioma } from "./normalizar";
import type { SearchProvider } from "./types";

const BASE = "https://doaj.org/api/search/articles";

const linkSchema = z.object({
  url: z.string().nullish(),
  content_type: z.string().nullish(),
  type: z.string().nullish(),
});

const autorSchema = z.object({
  name: z.string().nullish(),
});

const identificadorSchema = z.object({
  type: z.string().nullish(),
  id: z.string().nullish(),
});

const assuntoSchema = z.object({
  term: z.string().nullish(),
});

const periodicoSchema = z.object({
  language: z.array(z.string()).nullish(),
});

const bibjsonSchema = z.object({
  title: z.string().nullish(),
  author: z.array(autorSchema).nullish(),
  year: z.union([z.string(), z.number()]).nullish(),
  month: z.union([z.string(), z.number()]).nullish(),
  link: z.array(linkSchema).nullish(),
  identifier: z.array(identificadorSchema).nullish(),
  keywords: z.array(z.string()).nullish(),
  subject: z.array(assuntoSchema).nullish(),
  journal: periodicoSchema.nullish(),
});

const artigoSchema = z.object({
  id: z.string(),
  bibjson: bibjsonSchema.nullish(),
});

type Artigo = z.infer<typeof artigoSchema>;

const respostaBuscaSchema = z.object({
  results: z.array(artigoSchema).nullish(),
});

function escaparLucene(termo: string): string {
  return termo.replace(/([+\-=&|><!(){}[\]^"~*?:\\/])/g, "\\$1");
}

function normalizarTexto(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const normalizado = valor.replace(/\s+/g, " ").trim();
  return normalizado || null;
}

function dataPublicacao(ano: string | number | null | undefined, mes: string | number | null | undefined): string | null {
  if (ano === null || ano === undefined || ano === "") return null;
  const anoTexto = String(ano).trim();
  if (!/^\d{4}$/.test(anoTexto)) return null;
  if (mes === null || mes === undefined || mes === "") return anoTexto;
  const mesNumero = Number.parseInt(String(mes), 10);
  if (!Number.isInteger(mesNumero) || mesNumero < 1 || mesNumero > 12) return anoTexto;
  return `${anoTexto}-${String(mesNumero).padStart(2, "0")}`;
}

function mapear(artigo: Artigo): Documento | null {
  if (!/^[0-9a-f]{32}$/.test(artigo.id)) return null;
  const bibjson = artigo.bibjson;
  const titulo = normalizarTexto(bibjson?.title);
  if (!titulo) return null;

  const autores = (bibjson?.author ?? [])
    .map((autor) => normalizarTexto(autor.name))
    .filter((nome): nome is string => nome !== null);

  const links = bibjson?.link ?? [];
  // urlPdf sempre em https: o proxy e o download exigem https (guard anti-SSRF).
  const urlPdf =
    paraHttps(links.find((link) => link.content_type?.toUpperCase() === "PDF")?.url) ?? null;
  const urlPagina =
    somenteHttp(links.find((link) => link.type === "fulltext")?.url) ??
    somenteHttp(links.find((link) => link.type === "homepage")?.url) ??
    somenteHttp(links[0]?.url);

  const identificadores = bibjson?.identifier ?? [];
  const doi = normalizarDoi(identificadores.find((item) => item.type?.toLowerCase() === "doi")?.id);
  const assuntos = limparLista([
    ...(bibjson?.keywords ?? []),
    ...(bibjson?.subject ?? []).map((assunto) => assunto.term),
  ]);

  return {
    id: `doaj_${artigo.id}`,
    titulo,
    autores,
    fonte: "doaj",
    urlPdf,
    urlPagina,
    descricao: null,
    dataPublicacao: dataPublicacao(bibjson?.year, bibjson?.month),
    tamanhoBytes: null,
    doi,
    citacoes: null,
    assuntos,
    idioma: normalizarIdioma(bibjson?.journal?.language?.[0]),
    tipo: "article",
  };
}

export const doajProvider: SearchProvider = {
  fonte: "doaj",

  async buscar(termo: string, limite: number, signal?: AbortSignal): Promise<Documento[]> {
    const url = `${BASE}/${encodeURIComponent(escaparLucene(termo))}?page=1&pageSize=${limite}`;
    const texto = await fetchTexto(url, "doaj", signal);
    const parsed = respostaBuscaSchema.safeParse(JSON.parse(texto));
    if (!parsed.success) {
      throw new ProviderError("doaj", "Resposta da fonte em formato inesperado.");
    }
    return (parsed.data.results ?? [])
      .map(mapear)
      .filter((doc): doc is Documento => doc !== null);
  },

  async buscarPorId(externalId: string, signal?: AbortSignal): Promise<Documento | null> {
    if (!/^[0-9a-f]{32}$/.test(externalId)) return null;
    const url = `${BASE}/id:${encodeURIComponent(externalId)}`;
    let texto: string;
    try {
      texto = await fetchTexto(url, "doaj", signal);
    } catch (error) {
      if (error instanceof ProviderError && error.status === 404) return null;
      throw error;
    }
    const parsed = respostaBuscaSchema.safeParse(JSON.parse(texto));
    if (!parsed.success) {
      throw new ProviderError("doaj", "Resposta da fonte em formato inesperado.");
    }
    const artigo = (parsed.data.results ?? [])[0];
    return artigo ? mapear(artigo) : null;
  },
};