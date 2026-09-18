import { config } from "@/lib/config";
import type { Documento, FiltrosBusca, OrdemBusca, ResultadoBusca } from "@/types";
import { arxivProvider } from "./arxiv";
import { doajProvider } from "./doaj";
import { openalexProvider } from "./openalex";
import { semanticScholarProvider } from "./semanticscholar";
import { webDisponivel, webProvider } from "./web";
import type { SearchProvider, SearchProviderId } from "./types";

const TODOS: SearchProvider[] = [
  openalexProvider,
  arxivProvider,
  doajProvider,
  semanticScholarProvider,
  // Busca universal só com chave configurada; sem ela, as 4 fontes abertas seguem.
  ...(webDisponivel() ? [webProvider] : []),
];

// Teto por fonte: suficiente para filtrar e paginar sem sobrecarregar as APIs.
const MAX_POR_FONTE = 100;
const MARGEM_FILTROS = 20;

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

function anoDe(publicacao: string | null): number | null {
  const ano = publicacao ? /^\d{4}/.exec(publicacao)?.[0] : undefined;
  if (!ano) return null;
  const numero = Number.parseInt(ano, 10);
  return Number.isInteger(numero) ? numero : null;
}

export function aplicarFiltros(documentos: Documento[], filtros: FiltrosBusca): Documento[] {
  return documentos.filter((doc) => {
    if (filtros.soPdf && !doc.urlPdf) return false;
    if (filtros.tipo && doc.tipo?.toLowerCase() !== filtros.tipo.toLowerCase()) return false;
    if (filtros.anoDe !== undefined || filtros.anoAte !== undefined) {
      const ano = anoDe(doc.dataPublicacao);
      if (ano === null) return false;
      if (filtros.anoDe !== undefined && ano < filtros.anoDe) return false;
      if (filtros.anoAte !== undefined && ano > filtros.anoAte) return false;
    }
    return true;
  });
}

export function ordenarPor(documentos: Documento[], consulta: string, ordem: OrdemBusca): Documento[] {
  if (ordem === "recentes") {
    return [...documentos]
      .map((doc, indice) => ({ doc, indice }))
      .sort((a, b) => {
        const anoA = anoDe(a.doc.dataPublicacao) ?? -1;
        const anoB = anoDe(b.doc.dataPublicacao) ?? -1;
        return anoB - anoA || a.indice - b.indice;
      })
      .map(({ doc }) => doc);
  }
  if (ordem === "citados") {
    return [...documentos]
      .map((doc, indice) => ({ doc, indice }))
      .sort((a, b) => (b.doc.citacoes ?? -1) - (a.doc.citacoes ?? -1) || a.indice - b.indice)
      .map(({ doc }) => doc);
  }
  return ordenar(documentos, consulta);
}

function chaveCache(consulta: string, porPagina: number, pagina: number, filtros: FiltrosBusca): string {
  return [
    consulta.trim().toLowerCase(),
    porPagina,
    pagina,
    filtros.ordem ?? "relevancia",
    filtros.fontes?.join(",") ?? "todas",
    filtros.anoDe ?? "",
    filtros.anoAte ?? "",
    filtros.tipo ?? "",
    filtros.soPdf ? "pdf" : "",
  ].join("|");
}

export async function executarBusca(
  consulta: string,
  porPagina: number,
  pagina = 1,
  filtros: FiltrosBusca = {},
): Promise<ResultadoBusca> {
  const chave = chaveCache(consulta, porPagina, pagina, filtros);
  const agora = Date.now();
  const emCache = cache.get(chave);
  if (emCache && emCache.expiraEm > agora) {
    return emCache.resultado;
  }

  const providers = filtros.fontes ? TODOS.filter((p) => filtros.fontes?.includes(p.fonte)) : TODOS;
  // Busca além da página atual para que filtros e ordenação vejam material suficiente.
  const porFonte = Math.min(pagina * porPagina + MARGEM_FILTROS, MAX_POR_FONTE);
  const inicioFonte = Math.min((pagina - 1) * porPagina, MAX_POR_FONTE - 1);

  const resultados = await Promise.allSettled(
    providers.map((provider) => provider.buscar(consulta, porFonte, undefined, { inicio: inicioFonte })),
  );

  const documentos: Documento[] = [];
  const fontesIndisponiveis: SearchProviderId[] = [];
  resultados.forEach((resultadoParcial, indice) => {
    if (resultadoParcial.status === "fulfilled") {
      documentos.push(...resultadoParcial.value);
    } else {
      const fonte = providers[indice]?.fonte;
      if (fonte) fontesIndisponiveis.push(fonte);
      const motivo =
        resultadoParcial.reason instanceof Error
          ? resultadoParcial.reason.message
          : resultadoParcial.reason;
      console.warn(`[busca] provider ${fonte} falhou:`, motivo);
    }
  });

  const filtrados = aplicarFiltros(deduplicar(documentos), filtros);
  const ordenados = ordenarPor(filtrados, consulta, filtros.ordem ?? "relevancia");
  const inicio = (pagina - 1) * porPagina;
  const resultado: ResultadoBusca = {
    consulta,
    total: ordenados.length,
    documentos: ordenados.slice(inicio, inicio + porPagina),
    pagina,
    porPagina,
    temMais: ordenados.length > inicio + porPagina,
    fontesConsultadas: providers.map((p) => p.fonte),
    fontesIndisponiveis,
  };

  cache.set(chave, { expiraEm: agora + config.searchCacheTtlMs, resultado });
  if (cache.size > MAX_ENTRADAS_CACHE) {
    const maisAntiga = cache.keys().next();
    if (!maisAntiga.done) cache.delete(maisAntiga.value);
  }

  return resultado;
}
