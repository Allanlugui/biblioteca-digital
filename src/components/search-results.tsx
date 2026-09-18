"use client";

import { buscaRespostaSchema } from "@/schemas/respostas";
import { EmptyState, ErrorState, LoadingState } from "./query-states";
import { ResultCard } from "./result-card";
import { useApi } from "./use-api";

export function SearchResults({ consulta, limite }: { consulta: string; limite: number }) {
  const { estado, tentarNovamente } = useApi(`/api/busca?${new URLSearchParams({ q: consulta, limite: String(limite) })}`, buscaRespostaSchema);
  if (estado.status === "loading") return <LoadingState />;
  if (estado.status === "error") return <ErrorState mensagem={estado.mensagem} tentarNovamente={tentarNovamente} />;
  if (!estado.data.documentos.length) return <EmptyState titulo="Nenhum documento retornado" mensagem="Tente outros termos. As fontes também podem estar temporariamente indisponíveis." />;
  return (
    <section aria-label="Resultados da busca">
      <p role="status" className="mb-6 border-l-2 border-gilt-400 pl-4 text-sm leading-6 text-ink-soft">
        <strong className="font-display text-lg text-ink">{estado.data.documentos.length} {estado.data.documentos.length === 1 ? "documento encontrado" : "documentos encontrados"}</strong>
        <span className="block">A disponibilidade de PDF pode variar entre as fontes.</span>
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {estado.data.documentos.map((documento) => <ResultCard key={documento.id} documento={documento} />)}
      </div>
    </section>
  );
}
