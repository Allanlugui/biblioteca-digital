"use client";

import Link from "next/link";
import { buscaRespostaSchema } from "@/schemas/respostas";
import { nomesFontes } from "@/lib/apresentacao";
import type { SearchProviderId } from "@/services/search/types";
import { EmptyState, ErrorState, LoadingState } from "./query-states";
import { ResultCard } from "./result-card";
import { useApi } from "./use-api";

function Paginacao({ query, pagina, temMais }: { query: string; pagina: number; temMais: boolean }) {
  const base = new URLSearchParams(query);
  const montar = (p: number) => {
    const params = new URLSearchParams(base);
    params.set("pagina", String(p));
    return `/busca?${params.toString()}`;
  };
  return (
    <nav aria-label="Paginação dos resultados" className="mt-10 flex items-center justify-center gap-4">
      {pagina > 1 ? (
        <Link prefetch={false} href={montar(pagina - 1)} className="rounded-md border-2 border-library-800 px-5 py-2.5 font-semibold text-library-800 hover:bg-library-50 focus-visible:outline-2 focus-visible:outline-library-700">
          <span aria-hidden="true">←</span> Anterior
        </Link>
      ) : (
        <span aria-hidden="true" className="rounded-md border-2 border-rule px-5 py-2.5 font-semibold text-ink-soft/50">← Anterior</span>
      )}
      <p aria-live="polite" className="font-display text-lg">Página {pagina}</p>
      {temMais ? (
        <Link prefetch={false} href={montar(pagina + 1)} className="rounded-md border-2 border-library-800 px-5 py-2.5 font-semibold text-library-800 hover:bg-library-50 focus-visible:outline-2 focus-visible:outline-library-700">
          Próxima <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span aria-hidden="true" className="rounded-md border-2 border-rule px-5 py-2.5 font-semibold text-ink-soft/50">Próxima →</span>
      )}
    </nav>
  );
}

export function SearchResults({ query }: { query: string }) {
  const { estado, tentarNovamente } = useApi(`/api/busca?${query}`, buscaRespostaSchema);
  if (estado.status === "loading") return <LoadingState />;
  if (estado.status === "error") return <ErrorState mensagem={estado.mensagem} tentarNovamente={tentarNovamente} />;
  const dados = estado.data;
  const voltar = `/busca?${query}`;
  if (!dados.documentos.length) {
    return (
      <>
        <AvisoFontes indisponiveis={dados.fontesIndisponiveis} />
        <EmptyState titulo="Nenhum documento retornado" mensagem="Tente outros termos ou afrouxe os filtros. As fontes também podem estar temporariamente indisponíveis." />
      </>
    );
  }
  return (
    <section aria-label="Resultados da busca">
      <p role="status" className="mb-2 border-l-2 border-gilt-400 pl-4 text-sm leading-6 text-ink-soft">
        <strong className="font-display text-lg text-ink">{dados.total} {dados.total === 1 ? "documento encontrado" : "documentos encontrados"}</strong>
        <span className="block">A disponibilidade de PDF pode variar entre as fontes.</span>
      </p>
      <AvisoFontes indisponiveis={dados.fontesIndisponiveis} />
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {dados.documentos.map((documento) => <ResultCard key={documento.id} documento={documento} voltar={voltar} />)}
      </div>
      <Paginacao query={query} pagina={dados.pagina} temMais={dados.temMais} />
    </section>
  );
}

function AvisoFontes({ indisponiveis }: { indisponiveis: string[] }) {
  if (indisponiveis.length === 0) return null;
  const nomes = indisponiveis.map((f) => nomesFontes[f as SearchProviderId] ?? f).join(", ");
  return (
    <p role="status" className="mb-6 rounded-md border border-gilt-600/50 bg-gilt-100 px-4 py-3 text-sm text-gilt-700">
      {indisponiveis.length === 1 ? "Fonte indisponível no momento" : "Fontes indisponíveis no momento"}: {nomes}. Mostrando as demais.
    </p>
  );
}
