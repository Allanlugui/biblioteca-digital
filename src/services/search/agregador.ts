import { config } from "@/lib/config";
import type { Documento, ResultadoBusca } from "@/types";
import { arxivProvider } from "./arxiv";
import { doajProvider } from "./doaj";
import { openalexProvider } from "./openalex";
import type { SearchProvider } from "./types";

const providers: SearchProvider[] = [openalexProvider, arxivProvider, doajProvider];

type EntradaCache = {
  expiraEm: number;
  resultado: ResultadoBusca;
};

const cache = new Map<string, EntradaCache>();
const MAX_ENTRADAS_CACHE = 200;

export function normalizarTitulo(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

export function deduplicar(documentos: Documento[]): Documento[] {
  const vistos = new Set<string>();
  const unicos: Documento[] = [];
  for (const doc of documentos) {
    const chaveTitulo = normalizarTitulo(doc.titulo);
    const chave = chaveTitulo || `id:${doc.id}`;
    const chavePdf = doc.urlPdf ? `pdf:${normalizarUrl(doc.urlPdf)}` : null;
    if (vistos.has(chave) || (chavePdf !== null && vistos.has(chavePdf))) {
      continue;
    }
    vistos.add(chave);
    if (chavePdf !== null) vistos.add(chavePdf);
    unicos.push(doc);
  }
  return unicos;
}

function termosConsulta(consulta: string): string[] {
  return normalizarTitulo(consulta)
    .split(" ")
    .filter((termo) => termo.length > 2);
}

function pontuar(doc: Documento, termos: string[]): number {
  let pontos = doc.urlPdf ? 2 : 0;
  const titulo = normalizarTitulo(doc.titulo);
  for (const termo of termos) {
    if (titulo.includes(termo)) pontos += 1;
  }
  return pontos;
}

export function ordenar(documentos: Documento[], consulta: string): Documento[] {
  const termos = termosConsulta(consulta);
  return documentos
    .map((doc, indice) => ({ doc, pontos: pontuar(doc, termos), indice }))
    .sort((a, b) => b.pontos - a.pontos || a.indice - b.indice)
    .map(({ doc }) => doc);
}

function chaveCache(consulta: string, limite: number): string {
  return `${consulta.trim().toLowerCase()}|${limite}`;
}

export async function executarBusca(consulta: string, limite: number): Promise<ResultadoBusca> {
  const chave = chaveCache(consulta, limite);
  const agora = Date.now();
  const emCache = cache.get(chave);
  if (emCache && emCache.expiraEm > agora) {
    return emCache.resultado;
  }

  const resultados = await Promise.allSettled(
    providers.map((provider) => provider.buscar(consulta, limite)),
  );

  const documentos: Documento[] = [];
  resultados.forEach((resultadoParcial, indice) => {
    if (resultadoParcial.status === "fulfilled") {
      documentos.push(...resultadoParcial.value);
    } else {
      const motivo =
        resultadoParcial.reason instanceof Error
          ? resultadoParcial.reason.message
          : resultadoParcial.reason;
      console.warn(`[busca] provider ${providers[indice]?.fonte} falhou:`, motivo);
    }
  });

  const unicos = ordenar(deduplicar(documentos), consulta).slice(0, limite);
  const resultado: ResultadoBusca = {
    consulta,
    total: unicos.length,
    documentos: unicos,
  };

  cache.set(chave, { expiraEm: agora + config.searchCacheTtlMs, resultado });
  if (cache.size > MAX_ENTRADAS_CACHE) {
    const maisAntiga = cache.keys().next();
    if (!maisAntiga.done) cache.delete(maisAntiga.value);
  }

  return resultado;
}