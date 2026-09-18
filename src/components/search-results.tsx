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
      <p role="status" className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">{estado.data.documentos.length} documentos nesta consulta. A disponibilidade pode variar entre as fontes.</p>
      <div className="grid gap-5 md:grid-cols-2">
        {estado.data.documentos.map((documento) => <ResultCard key={documento.id} documento={documento} />)}
      </div>
    </section>
  );
}
