import { createHash } from "node:crypto";
import { z } from "zod";
import { config } from "@/lib/config";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Documento } from "@/types";
import { fetchTexto, paraHttps, ProviderError, somenteHttp } from "./http";
import type { SearchProvider } from "./types";

const BASE = "https://www.googleapis.com/customsearch/v1";

export function webDisponivel(): boolean {
  return config.googleSearchApiKey !== "" && config.googleSearchCx !== "";
}

const itemSchema = z.object({
  title: z.string().nullish(),
  link: z.string().nullish(),
  snippet: z.string().nullish(),
  mime: z.string().nullish(),
  fileFormat: z.string().nullish(),
});

const respostaBuscaSchema = z.object({
  items: z.array(itemSchema).nullish(),
});

type Item = z.infer<typeof itemSchema>;

function normalizarTexto(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const normalizado = valor.replace(/\s+/g, " ").trim();
  return normalizado || null;
}

// Só entra no acervo o que é PDF de verdade: mime, formato ou extensão.
function ehPdf(item: Item): boolean {
  const mime = item.mime?.toLowerCase() ?? "";
  if (mime.includes("application/pdf")) return true;
  const formato = item.fileFormat?.toLowerCase() ?? "";
  if (formato.includes("pdf")) return true;
  const link = item.link ?? "";
  return /\.pdf($|[?#])/i.test(link);
}

export function idParaLink(link: string): string {
  return `web_${createHash("sha256").update(link).digest("hex").slice(0, 32)}`;
}

function mapear(item: Item): Documento | null {
  const link = somenteHttp(item.link);
  const titulo = normalizarTexto(item.title);
  if (!link || !titulo || !ehPdf(item)) return null;
  return {
    id: idParaLink(link),
    titulo,
    autores: [],
    fonte: "web",
    urlPdf: paraHttps(link),
    urlPagina: link,
    descricao: normalizarTexto(item.snippet),
    dataPublicacao: null,
    tamanhoBytes: null,
    doi: null,
    citacoes: null,
    assuntos: [],
    idioma: null,
    tipo: null,
  };
}

async function persistir(documentos: Documento[]): Promise<void> {
  if (documentos.length === 0) return;
  try {
    const admin = criarClienteAdmin();
    if (!admin) return;
    await admin.from("documentos").upsert(
      documentos.map((doc) => ({
        id: doc.id,
        fonte: doc.fonte,
        titulo: doc.titulo,
        autores: doc.autores,
        descricao: doc.descricao,
        url_origem: doc.urlPdf ?? "",
        url_pagina: doc.urlPagina,
      })),
      { onConflict: "id", ignoreDuplicates: true },
    );
  } catch {
    // Melhor esforço: a busca não depende do registro.
  }
}

export const webProvider: SearchProvider = {
  fonte: "web",

  async buscar(termo: string, limite: number, signal?: AbortSignal, opcoes?: { inicio?: number }): Promise<Documento[]> {
    if (!webDisponivel()) return [];
    const numero = Math.min(Math.max(limite, 1), 10);
    // A API cobre até ~100 resultados (start 1-based).
    const inicio = Math.min(Math.max(opcoes?.inicio ?? 0, 0), 90);
    const url =
      `${BASE}?key=${encodeURIComponent(config.googleSearchApiKey)}` +
      `&cx=${encodeURIComponent(config.googleSearchCx)}` +
      `&q=${encodeURIComponent(`${termo} filetype:pdf`)}&num=${numero}&start=${inicio + 1}`;
    let texto: string;
    try {
      texto = await fetchTexto(url, "web", signal);
    } catch (error) {
      if (error instanceof ProviderError) {
        throw new ProviderError("web", "Busca web indisponível (verifique a chave e a cota).", error.status);
      }
      throw error;
    }
    const parsed = respostaBuscaSchema.safeParse(JSON.parse(texto));
    if (!parsed.success) {
      throw new ProviderError("web", "Resposta da fonte em formato inesperado.");
    }
    const documentos = (parsed.data.items ?? []).map(mapear).filter((doc): doc is Documento => doc !== null);
    await persistir(documentos);
    return documentos;
  },

  async buscarPorId(externalId: string, _signal?: AbortSignal): Promise<Documento | null> {
    if (!/^[0-9a-f]{32}$/.test(externalId)) return null;
    try {
      const admin = criarClienteAdmin();
      if (!admin) return null;
      const { data } = await admin
        .from("documentos")
        .select("id, fonte, titulo, autores, descricao, data_publicacao, url_origem, url_pagina, doi, citacoes, assuntos, idioma, tipo")
        .eq("id", `web_${externalId}`)
        .maybeSingle();
      if (!data || data.fonte !== "web") return null;
      return {
        id: data.id,
        titulo: data.titulo,
        autores: Array.isArray(data.autores) ? data.autores.filter((a): a is string => typeof a === "string") : [],
        fonte: "web",
        urlPdf: typeof data.url_origem === "string" && data.url_origem ? data.url_origem : null,
        urlPagina: typeof data.url_pagina === "string" ? data.url_pagina : null,
        descricao: typeof data.descricao === "string" ? data.descricao : null,
        dataPublicacao: typeof data.data_publicacao === "string" ? data.data_publicacao : null,
        tamanhoBytes: null,
        doi: typeof data.doi === "string" ? data.doi : null,
        citacoes: typeof data.citacoes === "number" ? data.citacoes : null,
        assuntos: Array.isArray(data.assuntos) ? data.assuntos.filter((a): a is string => typeof a === "string") : [],
        idioma: typeof data.idioma === "string" ? data.idioma : null,
        tipo: typeof data.tipo === "string" ? data.tipo : null,
      };
    } catch {
      return null;
    }
  },
};
