import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import type { Documento } from "@/types";
import { fetchTexto, paraHttps, ProviderError } from "./http";
import { limparLista, normalizarDoi } from "./normalizar";
import type { SearchProvider } from "./types";

const BASE = "https://export.arxiv.org/api/query";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
  isArray: (tagName) => tagName === "entry" || tagName === "author" || tagName === "link" || tagName === "category",
});

const linkSchema = z.object({
  href: z.string().nullish(),
  rel: z.string().nullish(),
  title: z.string().nullish(),
  type: z.string().nullish(),
});

const autorSchema = z.object({
  name: z.string().nullish(),
});

const categoriaSchema = z.object({
  term: z.string().nullish(),
});

const entradaSchema = z.object({
  id: z.string().nullish(),
  title: z.string().nullish(),
  published: z.string().nullish(),
  updated: z.string().nullish(),
  author: z.array(autorSchema).nullish(),
  summary: z.string().nullish(),
  link: z.array(linkSchema).nullish(),
  category: z.array(categoriaSchema).nullish(),
  "arxiv:doi": z.string().nullish(),
});

type Entrada = z.infer<typeof entradaSchema>;

const feedSchema = z.object({
  feed: z
    .object({
      entry: z.array(entradaSchema).nullish(),
    })
    .nullish(),
});

const ID_NOVO = /^\d{4}\.\d{4,5}(v\d+)?$/;
const ID_ANTIGO = /^[a-z-]+\/\d{7}(v\d+)?$/;

function normalizarTexto(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const normalizado = valor.replace(/\s+/g, " ").trim();
  return normalizado || null;
}

function externalIdDeAbs(absUrl: string | null | undefined): string | null {
  if (!absUrl) return null;
  const marcador = "/abs/";
  const posicao = absUrl.indexOf(marcador);
  if (posicao === -1) return null;
  const id = absUrl.slice(posicao + marcador.length);
  return ID_NOVO.test(id) || ID_ANTIGO.test(id) ? id : null;
}

function sanitizarIdExterno(externalId: string): string {
  return externalId.replace(/\//g, "_");
}

export function reverterIdExterno(sanitizado: string): string {
  // Ids do arXiv nunca contêm "_" naturalmente, então "_" sempre veio de "/".
  return sanitizado.replace(/_/g, "/");
}

function mapear(entrada: Entrada): Documento | null {
  const externalId = externalIdDeAbs(entrada.id);
  const titulo = normalizarTexto(entrada.title);
  if (!externalId || !titulo) return null;

  const autores = (entrada.author ?? [])
    .map((autor) => normalizarTexto(autor.name))
    .filter((nome): nome is string => nome !== null);

  const links = entrada.link ?? [];
  const urlPdf = paraHttps(links.find((link) => link.title === "pdf")?.href ?? null);
  const urlPagina =
    paraHttps(links.find((link) => link.rel === "alternate")?.href ?? null) ??
    paraHttps(entrada.id ?? null);

  return {
    id: `arxiv_${sanitizarIdExterno(externalId)}`,
    titulo,
    autores,
    fonte: "arxiv",
    urlPdf,
    urlPagina,
    descricao: normalizarTexto(entrada.summary),
    dataPublicacao: entrada.published?.slice(0, 10) ?? null,
    tamanhoBytes: null,
    doi: normalizarDoi(entrada["arxiv:doi"]),
    citacoes: null,
    assuntos: limparLista((entrada.category ?? []).map((categoria) => categoria.term)),
    idioma: "en",
    tipo: "preprint",
  };
}

function analisarFeed(xml: string): Entrada[] {
  const parsed = feedSchema.safeParse(parser.parse(xml));
  if (!parsed.success || !parsed.data.feed?.entry) {
    throw new ProviderError("arxiv", "Resposta da fonte em formato inesperado.");
  }
  return parsed.data.feed.entry;
}

export const arxivProvider: SearchProvider = {
  fonte: "arxiv",

  async buscar(termo: string, limite: number, signal?: AbortSignal): Promise<Documento[]> {
    const url =
      `${BASE}?search_query=all:${encodeURIComponent(termo)}` +
      `&start=0&max_results=${limite}&sortBy=relevance&sortOrder=descending`;
    const xml = await fetchTexto(url, "arxiv", signal);
    return analisarFeed(xml)
      .map(mapear)
      .filter((doc): doc is Documento => doc !== null);
  },

  async buscarPorId(externalId: string, signal?: AbortSignal): Promise<Documento | null> {
    const revertido = reverterIdExterno(externalId);
    if (!ID_NOVO.test(revertido) && !ID_ANTIGO.test(revertido)) return null;
    const url = `${BASE}?id_list=${encodeURIComponent(revertido)}`;
    const xml = await fetchTexto(url, "arxiv", signal);
    const entradas = analisarFeed(xml);
    const entrada = entradas[0];
    return entrada ? mapear(entrada) : null;
  },
};