import { z } from "zod";
import { config } from "@/lib/config";
import type { Documento } from "@/types";
import { fetchTexto, paraHttps, ProviderError, somenteHttp } from "./http";
import type { SearchProvider } from "./types";

const BASE = "https://api.semanticscholar.org/graph/v1";
const CAMPOS = "title,abstract,authors,year,publicationDate,openAccessPdf,externalIds,url";

const autorSchema = z.object({
  name: z.string().nullish(),
});

const pdfAbertoSchema = z.object({
  url: z.string().nullish(),
  status: z.string().nullish(),
});

const artigoSchema = z.object({
  paperId: z.string(),
  title: z.string().nullish(),
  abstract: z.string().nullish(),
  year: z.number().int().nullish(),
  publicationDate: z.string().nullish(),
  authors: z.array(autorSchema).nullish(),
  openAccessPdf: pdfAbertoSchema.nullish(),
  url: z.string().nullish(),
});

type Artigo = z.infer<typeof artigoSchema>;

const respostaBuscaSchema = z.object({
  data: z.array(artigoSchema).nullish(),
});

function normalizarTexto(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const normalizado = valor.replace(/\s+/g, " ").trim();
  return normalizado || null;
}

function dataPublicacao(publicationDate: string | null | undefined, year: number | null | undefined): string | null {
  if (publicationDate && /^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) return publicationDate;
  if (Number.isInteger(year)) return String(year);
  return null;
}

function mapear(artigo: Artigo): Documento | null {
  if (!/^[0-9a-f]{40}$/i.test(artigo.paperId)) return null;
  const titulo = normalizarTexto(artigo.title);
  if (!titulo) return null;

  const autores = (artigo.authors ?? [])
    .map((autor) => normalizarTexto(autor.name))
    .filter((nome): nome is string => nome !== null);

  // urlPdf sempre em https: o proxy e o download exigem https (guard anti-SSRF).
  const urlPdf = paraHttps(artigo.openAccessPdf?.url);
  const urlPagina =
    somenteHttp(artigo.url) ?? `https://www.semanticscholar.org/paper/${artigo.paperId}`;

  return {
    id: `semantic-scholar_${artigo.paperId}`,
    titulo,
    autores,
    fonte: "semantic-scholar",
    urlPdf,
    urlPagina,
    descricao: normalizarTexto(artigo.abstract),
    dataPublicacao: dataPublicacao(artigo.publicationDate, artigo.year),
    tamanhoBytes: null,
  };
}

function cabecalhos(): Record<string, string> | undefined {
  return config.semanticScholarApiKey ? { "x-api-key": config.semanticScholarApiKey } : undefined;
}

export const semanticScholarProvider: SearchProvider = {
  fonte: "semantic-scholar",

  async buscar(termo: string, limite: number, signal?: AbortSignal): Promise<Documento[]> {
    const url = `${BASE}/paper/search?query=${encodeURIComponent(termo)}&limit=${Math.min(Math.max(limite, 1), 100)}&fields=${CAMPOS}`;
    const texto = await fetchTexto(url, "semantic-scholar", signal, cabecalhos());
    const parsed = respostaBuscaSchema.safeParse(JSON.parse(texto));
    if (!parsed.success) {
      throw new ProviderError("semantic-scholar", "Resposta da fonte em formato inesperado.");
    }
    return (parsed.data.data ?? []).map(mapear).filter((doc): doc is Documento => doc !== null);
  },

  async buscarPorId(externalId: string, signal?: AbortSignal): Promise<Documento | null> {
    if (!/^[0-9a-f]{40}$/i.test(externalId)) return null;
    const url = `${BASE}/paper/${encodeURIComponent(externalId)}?fields=${CAMPOS}`;
    let texto: string;
    try {
      texto = await fetchTexto(url, "semantic-scholar", signal, cabecalhos());
    } catch (error) {
      if (error instanceof ProviderError && error.status === 404) return null;
      throw error;
    }
    const parsed = artigoSchema.safeParse(JSON.parse(texto));
    if (!parsed.success) {
      throw new ProviderError("semantic-scholar", "Resposta da fonte em formato inesperado.");
    }
    return mapear(parsed.data);
  },
};
