import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Documento, Fonte } from "@/types";
import type { SearchProvider } from "./types";

const FONTES_VALIDAS = new Set<string>(["openalex", "arxiv", "doaj", "google-books", "semantic-scholar", "web", "gutenberg"]);

function fonteDaLinha(valor: unknown): Fonte {
  return typeof valor === "string" && FONTES_VALIDAS.has(valor) ? (valor as Fonte) : "gutenberg";
}

function listaDeStrings(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((a): a is string => typeof a === "string") : [];
}

function textoOuNull(valor: unknown): string | null {
  return typeof valor === "string" && valor ? valor : null;
}

// O próprio acervo como fonte: busca textual no catálogo já arquivado.
// Instantâneo, sem rede externa; ranqueado primeiro por ser verificável.
export function linhaParaDocumento(linha: {
  id: unknown;
  fonte: unknown;
  titulo: unknown;
  autores: unknown;
  descricao: unknown;
  data_publicacao: unknown;
  url_pagina: unknown;
  doi: unknown;
  citacoes: unknown;
  assuntos: unknown;
  idioma: unknown;
  tipo: unknown;
  storage_path: unknown;
}): Documento | null {
  if (typeof linha.id !== "string" || typeof linha.titulo !== "string") return null;
  if (!linha.storage_path) return null;
  return {
    id: linha.id,
    titulo: linha.titulo,
    autores: listaDeStrings(linha.autores),
    fonte: fonteDaLinha(linha.fonte),
    // Caminho interno de leitura: o cliente resolve via /api/arquivo.
    urlPdf: `/api/arquivo/${encodeURIComponent(linha.id)}/bytes`,
    urlPagina: textoOuNull(linha.url_pagina),
    descricao: textoOuNull(linha.descricao),
    dataPublicacao: textoOuNull(linha.data_publicacao),
    tamanhoBytes: null,
    doi: textoOuNull(linha.doi),
    citacoes: typeof linha.citacoes === "number" ? linha.citacoes : null,
    assuntos: listaDeStrings(linha.assuntos),
    idioma: textoOuNull(linha.idioma),
    tipo: textoOuNull(linha.tipo),
    arxivId: null,
    disponivelEm: [{ fonte: fonteDaLinha(linha.fonte), id: linha.id }],
  };
}

const COLUNAS = "id, fonte, titulo, autores, descricao, data_publicacao, url_pagina, doi, citacoes, assuntos, idioma, tipo, storage_path";

export const acervoProvider: SearchProvider = {
  fonte: "gutenberg",

  async buscar(termo: string, limite: number): Promise<Documento[]> {
    try {
      const admin = criarClienteAdmin();
      if (!admin) return [];
      const limpo = termo.trim().slice(0, 120).replace(/[%_]/g, "");
      if (limpo.length < 2) return [];
      const { data, error } = await admin
        .from("documentos")
        .select(COLUNAS)
        .not("storage_path", "is", null)
        .or(`titulo.ilike.%${limpo}%,descricao.ilike.%${limpo}%`)
        .limit(Math.min(Math.max(limite, 1), 50));
      if (error || !data) return [];
      return data.map((l) => linhaParaDocumento(l)).filter((d): d is Documento => d !== null);
    } catch {
      return [];
    }
  },

  async buscarPorId(externalId: string): Promise<Documento | null> {
    try {
      const admin = criarClienteAdmin();
      if (!admin) return null;
      const { data, error } = await admin
        .from("documentos")
        .select(COLUNAS)
        .eq("id", `gutenberg_${externalId}`)
        .maybeSingle();
      if (error || !data) return null;
      return linhaParaDocumento(data);
    } catch {
      return null;
    }
  },
};
