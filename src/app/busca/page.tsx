import type { Metadata } from "next";
import Link from "next/link";
import { FiltrosBusca } from "@/components/filtros-busca";
import { SearchBar } from "@/components/search-bar";
import { SearchResults } from "@/components/search-results";
import { EmptyState } from "@/components/query-states";
import { interpretarBusca } from "@/lib/linguagem-natural";
import { buscaQuerySchema } from "@/schemas/busca";

export const metadata: Metadata = { title: "Busca" };

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
  // Bloco L: sem filtro explícito de período, tenta entender linguagem natural.
  let notaPeriodo: string | undefined;
  let anoDe = parsed.data.anoDe;
  let anoAte = parsed.data.anoAte;
  if (!anoDe && !anoAte) {
    const interpretada = interpretarBusca(parsed.data.q);
    if (interpretada.descricao && (interpretada.anoDe !== undefined || interpretada.anoAte !== undefined)) {
      anoDe = interpretada.anoDe ? String(interpretada.anoDe) : undefined;
      anoAte = interpretada.anoAte ? String(interpretada.anoAte) : undefined;
      query.set("q", interpretada.consulta);
      notaPeriodo = interpretada.descricao;
    }
  }
  if (!query.has("q")) query.set("q", parsed.data.q);
  // Padrão da casa: só arquivos para baixar e ler (opt-out explícito).
  const soPdf = parsed.data.soPdf ?? true;
  query.set("limite", String(parsed.data.limite ?? 20));
  query.set("pagina", String(parsed.data.pagina ?? 1));
  if (anoDe) query.set("anoDe", anoDe);
  if (anoAte) query.set("anoAte", anoAte);
  for (const f of parsed.data.fonte ?? []) query.append("fonte", f);
  if (parsed.data.tipo) query.set("tipo", parsed.data.tipo);
  query.set("soPdf", String(soPdf));
  if (parsed.data.ordem) query.set("ordem", parsed.data.ordem);
  const queryString = query.toString();
  return (
    <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:py-14">
      <CabecalhoBusca consulta={consulta} />
      <div className="mb-6"><FiltrosBusca valores={{ ...parsed.data, anoDe, anoAte }} /></div>
      {notaPeriodo && (
        <p role="status" className="mb-6 rounded-md border border-gilt-600/50 bg-gilt-100 px-4 py-3 text-sm text-gilt-700">
          {notaPeriodo} <Link href={`/busca?q=${encodeURIComponent(parsed.data.q)}`} prefetch={false} className="font-semibold underline underline-offset-4">Desfazer</Link>
        </p>
      )}
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
