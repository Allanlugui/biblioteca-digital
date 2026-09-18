import { z } from "zod";
import { config } from "@/lib/config";
import type { Documento } from "@/types";
import { fetchTexto, paraHttps, ProviderError, somenteHttp } from "./http";
import type { SearchProvider } from "./types";

const BASE = "https://api.openalex.org/works";
const CAMPOS = "id,display_name,doi,publication_date,authorships,open_access,best_oa_location";

const autoriaSchema = z.object({
  author: z
    .object({ display_name: z.string().nullish() })
    .nullish(),
});

const localizacaoSchema = z.object({
  pdf_url: z.string().nullish(),
  landing_page_url: z.string().nullish(),
});

const obraSchema = z.object({
  id: z.string(),
  display_name: z.string().nullish(),
  doi: z.string().nullish(),
  publication_date: z.string().nullish(),
  authorships: z.array(autoriaSchema).nullish(),
  open_access: z
    .object({ oa_url: z.string().nullish(), is_oa: z.boolean().nullish() })
    .nullish(),
  best_oa_location: localizacaoSchema.nullish(),
});

type Obra = z.infer<typeof obraSchema>;

const respostaBuscaSchema = z.object({
  results: z.array(obraSchema),
});

function externalIdDe(obra: Obra): string | null {
  const id = obra.id.replace("https://openalex.org/", "");
  return /^W\d+$/.test(id) ? id : null;
}

function mapear(obra: Obra): Documento | null {
  const externalId = externalIdDe(obra);
  const titulo = obra.display_name?.trim();
  if (!externalId || !titulo) return null;

  const autores = (obra.authorships ?? [])
    .map((autoria) => autoria.author?.display_name?.trim())
    .filter((nome): nome is string => Boolean(nome));

  // urlPdf sempre em https: o proxy e o download exigem https (guard anti-SSRF).
  const urlPdf = paraHttps(obra.best_oa_location?.pdf_url);
  const urlPagina =
    somenteHttp(obra.best_oa_location?.landing_page_url) ??
    somenteHttp(obra.doi) ??
    `https://openalex.org/${externalId}`;

  return {
    id: `openalex_${externalId}`,
    titulo,
    autores,
    fonte: "openalex",
    urlPdf,
    urlPagina,
    descricao: null,
    dataPublicacao: obra.publication_date ?? null,
    tamanhoBytes: null,
  };
}

function comMailto(url: string): string {
  return config.openalexMailto ? `${url}&mailto=${encodeURIComponent(config.openalexMailto)}` : url;
}

export const openalexProvider: SearchProvider = {
  fonte: "openalex",

  async buscar(termo: string, limite: number, signal?: AbortSignal): Promise<Documento[]> {
    const url = comMailto(
      `${BASE}?search=${encodeURIComponent(termo)}&per-page=${limite}&select=${CAMPOS}`,
    );
    const texto = await fetchTexto(url, "openalex", signal);
    const parsed = respostaBuscaSchema.safeParse(JSON.parse(texto));
    if (!parsed.success) {
      throw new ProviderError("openalex", "Resposta da fonte em formato inesperado.");
    }
    return parsed.data.results.map(mapear).filter((doc): doc is Documento => doc !== null);
  },

  async buscarPorId(externalId: string, signal?: AbortSignal): Promise<Documento | null> {
    if (!/^W\d+$/.test(externalId)) return null;
    const url = comMailto(`${BASE}/${encodeURIComponent(externalId)}?select=${CAMPOS}`);
    let texto: string;
    try {
      texto = await fetchTexto(url, "openalex", signal);
    } catch (error) {
      if (error instanceof ProviderError && error.status === 404) return null;
      throw error;
    }
    const parsed = obraSchema.safeParse(JSON.parse(texto));
    if (!parsed.success) {
      throw new ProviderError("openalex", "Resposta da fonte em formato inesperado.");
    }
    return mapear(parsed.data);
  },
};
