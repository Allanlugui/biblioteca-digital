import type { Metadata } from "next";
import { SearchBar } from "@/components/search-bar";
import { SearchResults } from "@/components/search-results";
import { EmptyState } from "@/components/query-states";
import { buscaQuerySchema } from "@/schemas/busca";

export const metadata: Metadata = { title: "Busca | Biblioteca Digital" };

export default async function BuscaPage({ searchParams }: PageProps<"/busca">) {
  const parametros = await searchParams;
  const parsed = buscaQuerySchema.safeParse({ q: parametros.q, limite: parametros.limite });
  const consulta = typeof parametros.q === "string" ? parametros.q : "";
  return (
    <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Explore o acervo</h1>
      <div className="mb-10 mt-6"><SearchBar key={consulta} defaultValue={consulta} /></div>
      {parsed.success ? <SearchResults key={`${parsed.data.q}|${parsed.data.limite ?? 20}`} consulta={parsed.data.q} limite={parsed.data.limite ?? 20} /> : <EmptyState titulo="O que você deseja encontrar?" mensagem="Informe um título, autor ou assunto com 2 a 200 caracteres. O limite de resultados deve estar entre 1 e 50." />}
    </main>
  );
}
