import type { Metadata } from "next";
import { FiltrosBusca } from "@/components/filtros-busca";
import { SearchBar } from "@/components/search-bar";
import { SearchResults } from "@/components/search-results";
import { EmptyState } from "@/components/query-states";
import { buscaQuerySchema } from "@/schemas/busca";

export const metadata: Metadata = { title: "Busca | Biblioteca Digital" };

export default async function BuscaPage({ searchParams }: PageProps<"/busca">) {
  const parametros = await searchParams;
  const fonte = parametros.fonte;
  const parsed = buscaQuerySchema.safeParse({
    q: parametros.q,
    limite: parametros.limite,
    pagina: parametros.pagina,
    anoDe: parametros.anoDe,
    anoAte: parametros.anoAte,
    fonte,
    tipo: parametros.tipo,
    soPdf: parametros.soPdf,
    ordem: parametros.ordem,
  });
  const consulta = typeof parametros.q === "string" ? parametros.q : "";
  if (!parsed.success) {
    return (
      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:py-14">
        <CabecalhoBusca consulta={consulta} />
        <EmptyState titulo="O que você deseja encontrar?" mensagem="Informe um título, autor ou assunto com 2 a 200 caracteres. Ajuste os filtros para valores válidos." />
      </main>
    );
  }
  const query = new URLSearchParams();
  query.set("q", parsed.data.q);
  query.set("limite", String(parsed.data.limite ?? 20));
  query.set("pagina", String(parsed.data.pagina ?? 1));
  if (parsed.data.anoDe) query.set("anoDe", parsed.data.anoDe);
  if (parsed.data.anoAte) query.set("anoAte", parsed.data.anoAte);
  for (const f of parsed.data.fonte ?? []) query.append("fonte", f);
  if (parsed.data.tipo) query.set("tipo", parsed.data.tipo);
  if (parsed.data.soPdf) query.set("soPdf", "true");
  if (parsed.data.ordem) query.set("ordem", parsed.data.ordem);
  const queryString = query.toString();
  return (
    <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:py-14">
      <CabecalhoBusca consulta={consulta} />
      <div className="mb-6"><FiltrosBusca valores={parsed.data} /></div>
      <SearchResults key={queryString} query={queryString} />
    </main>
  );
}

function CabecalhoBusca({ consulta }: { consulta: string }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gilt-700">Catálogo</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Explore o acervo</h1>
      <div className="mb-10 mt-8 rounded-md border border-rule bg-vellum p-5 shadow-[0_10px_24px_rgba(34,26,16,0.06)]">
        <SearchBar key={consulta} defaultValue={consulta} />
      </div>
    </>
  );
}
