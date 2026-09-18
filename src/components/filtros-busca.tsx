import Link from "next/link";
import { nomesFontes } from "@/lib/apresentacao";
import type { BuscaQuery } from "@/schemas/busca";
import { fontesBusca } from "@/schemas/busca";

export function FiltrosBusca({ valores }: { valores: BuscaQuery }) {
  const fontes = valores.fonte ?? [...fontesBusca];
  return (
    <form action="/busca" method="get" className="rounded-md border border-rule bg-vellum p-5">
      <input type="hidden" name="q" value={valores.q} />
      <fieldset>
        <legend className="font-display text-lg">Filtrar resultados</legend>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span id="rotulo-periodo" className="block text-sm font-semibold">Período</span>
            <div className="mt-2 flex items-center gap-2" role="group" aria-labelledby="rotulo-periodo">
              <input
                type="number"
                name="anoDe"
                min={1900}
                max={2100}
                placeholder="De"
                defaultValue={valores.anoDe ?? ""}
                aria-label="Ano inicial"
                className="w-full min-w-0 rounded-md border border-rule bg-parchment px-3 py-2 outline-none focus-visible:border-library-700 focus-visible:ring-2 focus-visible:ring-library-700/40"
              />
              <span aria-hidden="true" className="text-ink-soft">–</span>
              <input
                type="number"
                name="anoAte"
                min={1900}
                max={2100}
                placeholder="Até"
                defaultValue={valores.anoAte ?? ""}
                aria-label="Ano final"
                className="w-full min-w-0 rounded-md border border-rule bg-parchment px-3 py-2 outline-none focus-visible:border-library-700 focus-visible:ring-2 focus-visible:ring-library-700/40"
              />
            </div>
          </div>
          <div>
            <span id="rotulo-fontes" className="block text-sm font-semibold">Fontes</span>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2" role="group" aria-labelledby="rotulo-fontes">
              {fontesBusca.map((fonte) => (
                <label key={fonte} className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    name="fonte"
                    value={fonte}
                    defaultChecked={fontes.includes(fonte)}
                    className="h-4 w-4 accent-[#184636]"
                  />
                  {nomesFontes[fonte]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="filtro-tipo" className="block text-sm font-semibold">Tipo</label>
            <select
              id="filtro-tipo"
              name="tipo"
              defaultValue={valores.tipo ?? ""}
              className="mt-2 w-full rounded-md border border-rule bg-parchment px-3 py-2 outline-none focus-visible:border-library-700"
            >
              <option value="">Todos</option>
              <option value="article">Artigo</option>
              <option value="preprint">Preprint</option>
            </select>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm">
              <input type="checkbox" name="soPdf" value="true" defaultChecked={valores.soPdf === true} className="h-4 w-4 accent-[#184636]" />
              Só com PDF
            </label>
          </div>
          <div>
            <label htmlFor="filtro-ordem" className="block text-sm font-semibold">Ordenar por</label>
            <select
              id="filtro-ordem"
              name="ordem"
              defaultValue={valores.ordem ?? "relevancia"}
              className="mt-2 w-full rounded-md border border-rule bg-parchment px-3 py-2 outline-none focus-visible:border-library-700"
            >
              <option value="relevancia">Relevância</option>
              <option value="recentes">Mais recentes</option>
              <option value="citados">Mais citados</option>
            </select>
            <label htmlFor="filtro-limite" className="mt-3 block text-sm font-semibold">Por página</label>
            <select
              id="filtro-limite"
              name="limite"
              defaultValue={String(valores.limite ?? 20)}
              className="mt-2 w-full rounded-md border border-rule bg-parchment px-3 py-2 outline-none focus-visible:border-library-700"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button type="submit" className="rounded-md bg-library-800 px-6 py-2.5 font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700">
            Aplicar filtros
          </button>
          <Link prefetch={false} href={`/busca?q=${encodeURIComponent(valores.q)}`} className="text-sm font-semibold text-library-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
            Limpar filtros
          </Link>
        </div>
      </fieldset>
    </form>
  );
}
